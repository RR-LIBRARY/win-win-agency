import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/site/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { services, addOns, formatPrice, SETUP_FEE } from "@/data/services";
import { submitBooking } from "@/lib/booking.functions";
import { useAuth } from "@/hooks/useAuth";

type BookSearch = { service?: string | undefined; pkg?: string | undefined };

export const Route = createFileRoute("/book")({
  validateSearch: (search: Record<string, unknown>): BookSearch => ({
    service: typeof search["service"] === "string" ? search["service"] : undefined,
    pkg: typeof search["pkg"] === "string" ? search["pkg"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Book Your Work — Win Win Digital Agency" },
      {
        name: "description",
        content:
          "Pick a service and package, add what you need, and see your total including the one-time setup charge before you send the booking.",
      },
      { property: "og:title", content: "Book Your Work — Win Win Digital Agency" },
      {
        property: "og:description",
        content: "Register your project, choose a package and get an instant total.",
      },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const search = Route.useSearch();
  const send = useServerFn(submitBooking);
  const auth = useAuth();
  const userMeta = (auth.user?.user_metadata ?? {}) as { full_name?: string; phone?: string };

  const initialService =
    services.find((s) => s.slug === search.service) ??
    services.find((s) => s.packages.some((p) => p.id === search.pkg)) ??
    services[0]!;
  const initialPackage =
    initialService.packages.find((p) => p.id === search.pkg) ?? initialService.packages[0]!;

  const [serviceSlug, setServiceSlug] = useState(initialService.slug);
  const [packageId, setPackageId] = useState(initialPackage.id);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [linkedToAccount, setLinkedToAccount] = useState(false);

  const service = services.find((s) => s.slug === serviceSlug) ?? services[0]!;
  const pkg = service.packages.find((p) => p.id === packageId) ?? service.packages[0]!;

  const addOnTotal = useMemo(
    () =>
      addOns
        .filter((addOn) => selectedAddOns.includes(addOn.id))
        .reduce((sum, addOn) => sum + addOn.price, 0),
    [selectedAddOns],
  );
  const total = pkg.price + addOnTotal + SETUP_FEE;

  function chooseService(slug: string) {
    const next = services.find((s) => s.slug === slug);
    if (!next) return;
    setServiceSlug(slug);
    setPackageId(next.packages[0]!.id);
  }

  function toggleAddOn(id: string) {
    setSelectedAddOns((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await send({
        data: {
          serviceSlug: service.slug,
          packageId: pkg.id,
          addOnIds: selectedAddOns,
          total,
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          company: String(form.get("company") ?? ""),
          deadline: String(form.get("deadline") ?? ""),
          details: String(form.get("details") ?? ""),
        },
      });
      setReference(result.reference);
      setLinkedToAccount(result.linkedToAccount);
      toast.success("Booking received", { description: `Reference ${result.reference}` });
    } catch {
      toast.error("That did not go through", {
        description: "Check the form and try again, or WhatsApp us.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (reference) {
    return (
      <>
        <PageHeader eyebrow="Booking received" title="You're on the board." />
        <div className="mx-auto max-w-2xl px-5 py-14 md:py-20">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <p className="text-sm text-muted-foreground">Your reference number</p>
            <p className="mt-1 font-display text-3xl font-semibold text-foreground">{reference}</p>
            <div className="mt-6 space-y-3 border-t border-border pt-6 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">{service.name}</span> ·{" "}
                {pkg.name} package · estimated total {formatPrice(total)}
              </p>
              <p>
                We will email and WhatsApp you within one working day to confirm scope and book the
                kickoff call. The payment link comes after that call.
              </p>
              {linkedToAccount ? (
                <p>This booking is saved to your account — track its status any time.</p>
              ) : (
                <p>
                  Want to track it online? Create an account with the same email and this booking
                  will show up under My bookings.
                </p>
              )}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {linkedToAccount ? (
                <Link
                  to="/account/bookings"
                  className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Track in My account
                </Link>
              ) : (
                <Link
                  to="/auth"
                  search={{ mode: "signup", redirect: "/account/bookings" }}
                  className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Create an account to track it
                </Link>
              )}
              <button
                type="button"
                onClick={() => setReference(null)}
                className="inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
              >
                Book another project
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Book your work"
        title="Choose, price it, send it."
        subtitle="Booking is free and takes two minutes. You will see the full total, including the one-time setup charge, before you send anything."
      />

      <form onSubmit={handleSubmit} className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-10">
            <section>
              <h2 className="font-display text-lg font-semibold text-foreground">
                1. What do you need built?
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {services.map((item) => {
                  const Icon = item.icon;
                  const active = item.slug === serviceSlug;
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => chooseService(item.slug)}
                      className={
                        active
                          ? "flex items-start gap-3 rounded-xl border-2 border-primary bg-card p-4 text-left"
                          : "flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
                      }
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>
                        <span className="block text-sm font-medium text-foreground">
                          {item.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {item.tagline}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold text-foreground">
                2. Pick a package
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {service.packages.map((item) => {
                  const active = item.id === packageId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPackageId(item.id)}
                      className={
                        active
                          ? "rounded-xl border-2 border-primary bg-card p-4 text-left"
                          : "rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
                      }
                    >
                      <span className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                        {active ? <Check className="h-4 w-4 text-primary" /> : null}
                      </span>
                      <span className="mt-2 block font-display text-lg font-semibold text-foreground">
                        {formatPrice(item.price)}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.timeline}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold text-foreground">
                3. Anything extra?
              </h2>
              <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
                {addOns.map((addOn) => (
                  <label
                    key={addOn.id}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3.5"
                  >
                    <Checkbox
                      checked={selectedAddOns.includes(addOn.id)}
                      onCheckedChange={() => toggleAddOn(addOn.id)}
                    />
                    <span className="flex-1">
                      <span className="block text-sm text-foreground">{addOn.label}</span>
                      <span className="block text-xs text-muted-foreground">{addOn.note}</span>
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      +{formatPrice(addOn.price)}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section key={auth.user?.id ?? "guest"}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  4. Your details
                </h2>
                {auth.user ? (
                  <span className="text-xs text-muted-foreground">
                    Booking as {auth.displayName || auth.user.email} — saved to your account
                  </span>
                ) : (
                  <Link
                    to="/auth"
                    search={{ redirect: "/book" }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Sign in to track this booking
                  </Link>
                )}
              </div>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder="Your name"
                    defaultValue={userMeta.full_name ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    defaultValue={auth.user?.email ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone or WhatsApp</Label>
                  <Input
                    id="phone"
                    name="phone"
                    required
                    placeholder="+91"
                    defaultValue={userMeta.phone ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Business name (optional)</Label>
                  <Input id="company" name="company" placeholder="Company or brand" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="deadline">Target launch date (optional)</Label>
                  <Input id="deadline" name="deadline" type="date" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="details">About the project</Label>
                  <Textarea
                    id="details"
                    name="details"
                    required
                    rows={5}
                    placeholder="What are you selling or teaching, who is it for, and what must it do?"
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-base font-semibold text-foreground">
                Your estimate
              </h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {service.name} · {pkg.name}
                  </dt>
                  <dd className="font-medium text-foreground">{formatPrice(pkg.price)}</dd>
                </div>
                {addOns
                  .filter((addOn) => selectedAddOns.includes(addOn.id))
                  .map((addOn) => (
                    <div key={addOn.id} className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{addOn.label}</dt>
                      <dd className="font-medium text-foreground">{formatPrice(addOn.price)}</dd>
                    </div>
                  ))}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">One-time setup charge</dt>
                  <dd className="font-medium text-foreground">{formatPrice(SETUP_FEE)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-4">
                  <dt className="font-display font-semibold text-foreground">Total</dt>
                  <dd className="font-display text-xl font-semibold text-foreground">
                    {formatPrice(total)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                Delivery window {pkg.timeline}. Taxes extra where applicable.
              </p>

              <button
                type="submit"
                disabled={busy}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Sending" : "Send booking"}
              </button>
              <p className="mt-3 text-xs text-muted-foreground">
                No payment now. We confirm scope on a call, then share a payment link for 50% to
                start.
              </p>
            </div>
          </aside>
        </div>
      </form>
    </>
  );
}
