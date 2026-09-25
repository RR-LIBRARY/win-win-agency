/**
 * A tiny in-memory stand-in for the parts of the Supabase PostgREST client
 * that the payment code uses: from().select/insert/update with eq/in/order/
 * limit/maybeSingle/single, rpc(), and unique-constraint errors (23505).
 *
 * Each query executes atomically when awaited, which is exactly what makes it
 * useful for the concurrency tests: two fulfilment calls can interleave at
 * their await points, but a single conditional UPDATE can never half-apply.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Row = Record<string, unknown>;

type Filter = { kind: "eq" | "in"; column: string; value: unknown };

type ExecResult = { data: unknown; error: { code: string; message: string } | null };

export type FakeDb = {
  tables: Record<string, Row[]>;
  uniques: Record<string, string[]>;
  /** Column defaults applied on insert, mirroring the real schema defaults. */
  defaults: Record<string, Row>;
  ops: { table: string; op: string; payload?: unknown; filters: Filter[] }[];
  rpcs: Record<string, () => unknown>;
  failNext: { table: string; op: string; message: string } | null;
};

let idCounter = 0;
export function nextId(prefix = "id") {
  idCounter += 1;
  return `${prefix}-${String(idCounter).padStart(4, "0")}-0000-4000-8000-000000000000`.slice(0, 36);
}

class Query implements PromiseLike<ExecResult> {
  private op: "select" | "insert" | "update" | "delete" | null = null;
  private payload: Row | Row[] | null = null;
  private filters: Filter[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitN: number | null = null;
  private mode: "many" | "maybeSingle" | "single" = "many";
  private returning = false;

  constructor(
    private db: FakeDb,
    private table: string,
  ) {}

  select(_columns?: string) {
    if (this.op === null) this.op = "select";
    else this.returning = true;
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.payload = patch;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }
  in(column: string, value: unknown[]) {
    this.filters.push({ kind: "in", column, value });
    return this;
  }
  is(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending ?? true };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }

  then<TResult1 = ExecResult, TResult2 = never>(
    onfulfilled?: ((value: ExecResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.exec()).then(onfulfilled, onrejected);
  }

  private matches(row: Row) {
    return this.filters.every((f) =>
      f.kind === "eq" ? row[f.column] === f.value : (f.value as unknown[]).includes(row[f.column]),
    );
  }

  private violatesUnique(candidate: Row, existing: Row[]) {
    const columns = this.db.uniques[this.table] ?? [];
    for (const column of columns) {
      const value = candidate[column];
      if (value === null || value === undefined) continue;
      if (existing.some((row) => row !== candidate && row[column] === value)) {
        return { code: "23505", message: `duplicate key value violates unique constraint "${this.table}_${column}_key"` };
      }
    }
    return null;
  }

  private exec(): ExecResult {
    const rows = (this.db.tables[this.table] ??= []);
    this.db.ops.push({ table: this.table, op: this.op ?? "select", payload: this.payload, filters: this.filters });

    if (this.db.failNext && this.db.failNext.table === this.table && this.db.failNext.op === this.op) {
      const message = this.db.failNext.message;
      this.db.failNext = null;
      return { data: null, error: { code: "XX000", message } };
    }

    let result: Row[] = [];
    switch (this.op) {
      case "insert": {
        const list = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
        const inserted: Row[] = [];
        for (const item of list) {
          const row: Row = {
            id: nextId(this.table.slice(0, 3)),
            created_at: new Date().toISOString(),
            ...(this.db.defaults[this.table] ?? {}),
            ...item,
          };
          const violation = this.violatesUnique(row, [...rows, ...inserted]);
          if (violation) return { data: null, error: violation };
          inserted.push(row);
        }
        rows.push(...inserted);
        result = inserted;
        if (!this.returning && this.mode === "many") return { data: null, error: null };
        break;
      }
      case "update": {
        const matched = rows.filter((row) => this.matches(row));
        for (const row of matched) Object.assign(row, this.payload, { updated_at: new Date().toISOString() });
        result = matched;
        if (!this.returning && this.mode === "many") return { data: null, error: null };
        break;
      }
      case "delete": {
        const remaining = rows.filter((row) => !this.matches(row));
        result = rows.filter((row) => this.matches(row));
        this.db.tables[this.table] = remaining;
        if (!this.returning) return { data: null, error: null };
        break;
      }
      default: {
        result = rows.filter((row) => this.matches(row));
        if (this.orderBy) {
          const { column, ascending } = this.orderBy;
          result = [...result].sort((a, b) => {
            const av = String(a[column] ?? "");
            const bv = String(b[column] ?? "");
            return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
          });
        }
        if (this.limitN !== null) result = result.slice(0, this.limitN);
      }
    }

    const copies = result.map((row) => ({ ...row }));
    if (this.mode === "maybeSingle") return { data: copies[0] ?? null, error: null };
    if (this.mode === "single") {
      if (copies.length !== 1) {
        return { data: null, error: { code: "PGRST116", message: `Expected exactly one row, got ${copies.length}` } };
      }
      return { data: copies[0], error: null };
    }
    return { data: copies, error: null };
  }
}

export function createFakeSupabase(seed?: Partial<FakeDb["tables"]>) {
  const db: FakeDb = {
    tables: {
      orders: [],
      templates: [],
      template_deliverables: [],
      license_keys: [],
      payment_events: [],
      coupons: [],
      ...seed,
    },
    uniques: {
      license_keys: ["key"],
      payment_events: ["event_id"],
      orders: ["reference", "invoice_number"],
    },
    defaults: {
      license_keys: { status: "active", activations: 0, last_activated_at: null, user_id: null },
      payment_events: { status: "received", error: "", order_id: null },
    },
    ops: [],
    rpcs: {
      next_invoice_number: (() => {
        let n = 0;
        return () => `WWD-2627-${String(++n).padStart(4, "0")}`;
      })(),
    },
    failNext: null,
  };

  const client = {
    from: (table: string) => new Query(db, table),
    rpc: async (name: string) => {
      const fn = db.rpcs[name];
      if (!fn) return { data: null, error: { code: "42883", message: `function ${name} does not exist` } };
      return { data: fn(), error: null };
    },
  };

  return { db, admin: client as unknown as SupabaseClient<Database> };
}

export function opsFor(db: FakeDb, table: string, op: string) {
  return db.ops.filter((entry) => entry.table === table && entry.op === op);
}
