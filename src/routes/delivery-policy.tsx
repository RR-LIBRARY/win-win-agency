import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LegalPage, type LegalSection } from "@/components/site/LegalPage";
import { grievanceContact, siteSettingsQuery, type SiteSettings } from "@/lib/settings.functions";

export const Route = createFileRoute("/delivery-policy")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteSettingsQuery),
  head: () => ({
    meta: [
      { title: "Shipping & Delivery Policy — Win Win Digital Agency" },
      {
        name: "description",
        content:
          "Everything sold on Win Win Digital Agency is delivered electronically: downloads, licence keys and Notion links unlock the moment Razorpay confirms payment. No physical shipping, no delivery charges.",
      },
      { property: "og:title", content: "Shipping & Delivery Policy — Win Win Digital Agency" },
      {
        property: "og:description",
        content: "Instant electronic delivery after payment confirmation. Nothing is shipped physically.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeliveryPolicyPage,
});

function sections(settings: SiteSettings): LegalSection[] {
  const grievance = grievanceContact(settings);
  return [
    {
      id: "digital-only",
      title: "Nothing is shipped physically",
      body: (
        <p>
          Every product in the <Link to="/store" className="text-primary hover:underline">Software Store</Link> is a digital
          good — software, source code, apps, plugins, e-books, courses or Notion templates. There is <strong>no physical
          shipping, no courier and no delivery charge</strong>. Delivery happens on this website and by email, anywhere in the
          world, the moment your payment is confirmed.
        </p>
      ),
    },
    {
      id: "when",
      title: "When you get access",
      body: (
        <>
          <ul>
            <li>
              <strong>Online payment (UPI, card, net banking, wallet via Razorpay)</strong> — instantly. As soon as Razorpay
              confirms the payment, your order page switches to "Delivered" and shows your download, licence key or Notion
              link. This normally takes a few seconds.
            </li>
            <li>
              <strong>Payment still processing</strong> — some UPI and net-banking payments are confirmed by the bank a few
              minutes later. The order page keeps checking automatically; you can also press "Check payment status". You will
              not be asked to pay again.
            </li>
            <li>
              <strong>Bank transfer / manual UPI</strong> — delivered after we match the transfer, within business hours
              ({settings.business_hours}), usually the same working day and at most within 1 working day of receiving the money.
            </li>
            <li>
              <strong>Free (100% coupon) orders</strong> — instantly, no payment step.
            </li>
          </ul>
          <p>
            <strong>No product is ever delivered before payment is confirmed</strong>, and no paid product is held back — this
            rule is enforced by our system, not by a person.
          </p>
        </>
      ),
    },
    {
      id: "how",
      title: "How delivery works",
      body: (
        <>
          <ul>
            <li>
              <strong>Order page</strong> — after checkout you land on a private order page (link also emailed to you). It
              shows the invoice, the download button, the licence key and any setup guide.
            </li>
            <li>
              <strong>Downloads</strong> — files are served through short-lived secure links (valid for 1 hour per click);
              open the order page again any time to generate a fresh link. There is no download limit.
            </li>
            <li>
              <strong>Licence keys</strong> — issued automatically per order in the format WWD-XXXX-XXXX-XXXX-XXXX, with the
              activation limit shown on the product page. Software verifies the key against our licence server.
            </li>
            <li>
              <strong>Notion templates</strong> — a "Duplicate to your Notion" link; the template copies into your own
              workspace and stays there even if we update the original.
            </li>
            <li>
              <strong>Hosted / access products</strong> — an access link plus onboarding instructions.
            </li>
            <li>
              <strong>Signed-in customers</strong> — everything is also under <Link to="/account/orders" className="text-primary hover:underline">My orders</Link>,
              so a lost email is never a problem.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "external",
      title: "Products sold on other platforms",
      body: (
        <p>
          Listings marked "Buy on Gumroad", "Buy on Amazon", "Get it on Google Play" and similar are delivered by that
          platform under its own delivery and refund rules; we only link to the listing and no order is created on this site.
        </p>
      ),
    },
    {
      id: "agency",
      title: "Agency projects",
      body: (
        <p>
          Websites, apps and coaching-centre software booked through the <Link to="/book" className="text-primary hover:underline">booking page</Link>{" "}
          are delivered as a live link plus source code and accounts at handover, on the dates written in your project scope.
          Progress links are shared weekly, so you see delivery happening rather than waiting for a final reveal.
        </p>
      ),
    },
    {
      id: "problems",
      title: "If something did not arrive",
      body: (
        <>
          <ol className="[&_li]:ml-5 [&_li]:list-decimal">
            <li>Check the order page link in your email (and the spam folder) or sign in and open My orders.</li>
            <li>If the order still says "awaiting payment" after you paid, press "Check payment status" on the order page.</li>
            <li>
              Still stuck? Email <a href={`mailto:${grievance.email}`} className="text-primary hover:underline">{grievance.email}</a> or
              WhatsApp us with your order reference — we respond within 48 hours and usually within the same working day.
            </li>
          </ol>
          <p>
            Refunds for products that could not be delivered are covered by our{" "}
            <Link to="/refund-policy" className="text-primary hover:underline">Refund & Cancellation Policy</Link>.
          </p>
        </>
      ),
    },
  ];
}

function DeliveryPolicyPage() {
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);
  return (
    <LegalPage
      current="/delivery-policy"
      eyebrow="Legal"
      title="Shipping & Delivery Policy"
      subtitle="Digital-only delivery: downloads, licence keys and Notion links unlock the moment your payment is confirmed. Nothing is shipped, nothing is charged for delivery."
      settings={settings}
      sections={sections(settings)}
    />
  );
}
