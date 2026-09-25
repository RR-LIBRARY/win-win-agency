/**
 * Types for tables added by `db/pending/20260925_reviews_videos_docs.sql`.
 *
 * The generated `Database` type is regenerated only through the migration tool
 * of a *linked* Supabase project, so until "Win Win Agency" is linked we extend
 * it here. `asExt(client)` re-types any generated client so queries against the
 * new tables stay fully typed. Nothing here runs at runtime except the cast.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ReviewStatus = "pending" | "approved" | "hidden";
export const REVIEW_STATUSES: readonly ReviewStatus[] = ["pending", "approved", "hidden"] as const;

export type VideoProvider = "youtube" | "vimeo";
export type VideoPlacement = "home" | "about" | "services" | "store";
export const VIDEO_PLACEMENTS: readonly VideoPlacement[] = ["home", "about", "services", "store"] as const;

export type DocKind = "link" | "markdown";
export type DocVisibility = "public" | "buyers";

export type ProductReviewRow = {
  id: string;
  template_id: string;
  order_id: string;
  user_id: string | null;
  author_name: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  verified_purchase: boolean;
  accepted_terms: boolean;
  admin_reply: string;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteVideoRow = {
  id: string;
  title: string;
  caption: string;
  provider: string;
  video_id: string;
  url: string;
  transcript: string;
  placement: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductDocRow = {
  id: string;
  template_id: string;
  title: string;
  kind: string;
  url: string;
  provider: string;
  content_md: string;
  visibility: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type TableDef<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

type ExtraTables = {
  product_reviews: TableDef<
    ProductReviewRow,
    Optional<
      ProductReviewRow,
      | "id"
      | "user_id"
      | "author_name"
      | "title"
      | "body"
      | "status"
      | "verified_purchase"
      | "accepted_terms"
      | "admin_reply"
      | "replied_at"
      | "created_at"
      | "updated_at"
    >
  >;
  site_videos: TableDef<
    SiteVideoRow,
    Optional<SiteVideoRow, "id" | "caption" | "transcript" | "placement" | "sort_order" | "is_published" | "created_at" | "updated_at">
  >;
  product_docs: TableDef<
    ProductDocRow,
    Optional<ProductDocRow, "id" | "kind" | "url" | "provider" | "content_md" | "visibility" | "sort_order" | "created_at" | "updated_at">
  >;
};

type ExtraFunctions = {
  refresh_template_review_stats: { Args: { _template_id: string }; Returns: undefined };
};

export type ExtDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"]["Tables"] extends infer _T ? Database["public"] : never, "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & ExtraTables;
    Functions: Database["public"]["Functions"] & ExtraFunctions;
  };
};

export type ExtClient = SupabaseClient<ExtDatabase>;

/** Re-type a generated client so it knows about the new tables. */
export function asExt(client: SupabaseClient<Database>): ExtClient {
  return client as unknown as ExtClient;
}

/**
 * Review stats live as denormalised columns on `templates` (added by the same
 * SQL). Before the migration runs those columns are simply absent from `*`
 * selects, so read them defensively.
 */
export type ReviewStats = { count: number; average: number };

export function reviewStats(template: Record<string, unknown> | null | undefined): ReviewStats {
  const count = Number(template?.["review_count"] ?? 0);
  const average = Number(template?.["review_avg"] ?? 0);
  return {
    count: Number.isFinite(count) && count > 0 ? Math.round(count) : 0,
    average: Number.isFinite(average) && average > 0 ? Math.round(average * 10) / 10 : 0,
  };
}

/** Postgres "relation does not exist" (42P01) or PostgREST schema-cache miss — table not created yet. */
export function isMissingTableError(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST200") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("schema cache") || msg.includes("could not find the table");
}
