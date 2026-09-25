import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LegalPage, type LegalSection } from "@/components/site/LegalPage";
import { grievanceContact, siteSettingsQuery, type SiteSettings } from "@/lib/settings.functions";

export const Route = createFileRoute("/refund-policy")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteSettingsQuery),
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — Win Win Digital Agency" },
      {
        name: "description",
        content:
          "When you can get a refund on software, source code and Notion templates bought from Win Win Digital Agency, how to ask, and how fast the money returns through Razorpay. Cancellation terms for agency bookings.",
      },
      { property: "og:title", content: "Refund & Cancellation Policy — Win Win Digital Agency" },
      {
        property: "og:description",
        content: "7-day refund if a product does not work as described; refunds go back to the original payment method.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RefundPolicyPage,
});

function sections(settings: SiteSettings): LegalSection[] {
  const grievance = grievanceContact(settings);
  return [
    {
      id: "summary",
      title: "The short version",
      body: (
        <>
          <p>
            <strong>{settings.refund_policy}</strong>
          </p>
          <p>
            Refunds are returned to the same payment method you used, through Razorpay. You never need to share bank details
            with us for a refund of an online payment.
          </p>
        </>
      ),
    },
    {
      id: "eligible",
      title: "When a digital product is refundable",
      body: (
        <>
          <p>Ask within <strong>7 days</strong> of the purchase and we refund in full when:</p>
          <ul>
            <li>The product does not work as described on its product page and we cannot fix it within a reasonable time.</li>
            <li>You were charged twice for the same order, or paid and never received access (after we have checked delivery).</li>
            <li>You bought the wrong tier by mistake and have not activated the licence or downloaded the files — we can also move you to the right tier and refund the difference.</li>
            <li>The product page materially misdescribed the platform, requirements or what is included.</li>
          </ul>
          <p>
            Because software and templates cannot be "returned", we may ask for a short description or screenshot of the
            problem first so we can try to fix it — most issues are solved the same day.
          </p>
        </>
      ),
    },
    {
      id: "not-eligible",
      title: "When we cannot refund",
      body: (
        <ul>
          <li>Requests made more than 7 days after purchase.</li>
          <li>Change of mind after the files were downloaded, the Notion template was duplicated or the licence key was activated, when the product works as described.</li>
          <li>Problems caused by your own modifications, unsupported hosting or devices, or third-party services (for example a Notion or Play Store outage).</li>
          <li>Products bought on another platform (Gumroad, Amazon, Udemy, app stores) — their refund policy applies; contact that platform.</li>
          <li>Licence keys that were shared publicly or resold.</li>
        </ul>
      ),
    },
    {
      id: "how",
      title: "How to request a refund",
      body: (
        <>
          <ol className="[&_li]:ml-5 [&_li]:list-decimal">
            <li>
              Email <a href={`mailto:${grievance.email}`} className="text-primary hover:underline">{grievance.email}</a> or WhatsApp
              us from the email/number on the order with your <strong>order reference</strong> (WWT-…) and a line about the problem.
            </li>
            <li>We acknowledge within 48 hours and either fix the issue or approve the refund — usually within 3 working days.</li>
            <li>
              Approved refunds are issued through Razorpay to the original UPI ID, card or bank account. Razorpay reports that
              UPI refunds typically land within 1–3 working days and card/net-banking refunds within 5–7 working days,
              depending on your bank.
            </li>
            <li>On refund the order shows "Refunded", the licence key is revoked and download links stop working.</li>
          </ol>
          <p>For bank-transfer orders we refund to the account the payment came from and may ask you to confirm it.</p>
        </>
      ),
    },
    {
      id: "failed-payments",
      title: "Failed or pending payments",
      body: (
        <p>
          If money was debited but the payment failed at the bank or UPI app, the amount is auto-reversed by your bank —
          generally within 5–7 working days — and no order is created, so no refund request is needed. If an order shows
          "awaiting payment" even though you paid, open the order page and press "Check payment status", or write to us; our
          system also reconciles with Razorpay automatically.
        </p>
      ),
    },
    {
      id: "cancellation",
      title: "Cancelling an order",
      body: (
        <>
          <p>
            Digital-product orders that are still "awaiting payment" can simply be left unpaid — they are never charged and
            expire on their own. Once a product is delivered, cancellation is handled as a refund request under the rules above.
          </p>
          <p>
            <strong>Agency projects:</strong> booking is free and creates no charge. After a written scope and advance are
            agreed, you may cancel any time in writing. Work completed and approved milestones up to that date are billable;
            the unused part of any advance is refunded within 7 working days, less non-recoverable third-party costs (domains,
            hosting, stock assets) bought for your project with your approval.
          </p>
        </>
      ),
    },
    {
      id: "chargebacks",
      title: "Chargebacks",
      body: (
        <p>
          Please contact us before raising a chargeback with your bank — we resolve genuine problems faster and without the
          bank's 45–90 day process. Chargebacks on delivered products where the licence was activated may be contested with
          the delivery and activation records we keep.
        </p>
      ),
    },
    {
      id: "escalate",
      title: "Not satisfied?",
      body: (
        <p>
          Escalate to our grievance officer (below). You also keep every right available under the Consumer Protection Act,
          2019, including approaching the National Consumer Helpline (1915) or the consumer commission. See also the{" "}
          <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link> and{" "}
          <Link to="/delivery-policy" className="text-primary hover:underline">Shipping & Delivery Policy</Link>.
        </p>
      ),
    },
  ];
}

function RefundPolicyPage() {
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);
  return (
    <LegalPage
      current="/refund-policy"
      eyebrow="Legal"
      title="Refund & Cancellation Policy"
      subtitle="Digital products cannot be posted back, so our promise is simple: if it does not work as described within 7 days, you get your money back through the same payment method."
      settings={settings}
      sections={sections(settings)}
    />
  );
}
