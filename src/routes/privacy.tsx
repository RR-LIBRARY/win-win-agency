import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LegalPage, type LegalSection } from "@/components/site/LegalPage";
import { grievanceContact, siteSettingsQuery, type SiteSettings } from "@/lib/settings.functions";

export const Route = createFileRoute("/privacy")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteSettingsQuery),
  head: () => ({
    meta: [
      { title: "Privacy Policy — Win Win Digital Agency" },
      {
        name: "description",
        content:
          "What personal data Win Win Digital Agency collects when you buy software or book a project, why, who it is shared with (Razorpay, hosting, AI provider), how long it is kept, and your rights under India's DPDP Act, 2023.",
      },
      { property: "og:title", content: "Privacy Policy — Win Win Digital Agency" },
      {
        property: "og:description",
        content: "Your data, in plain language: what we collect, why, who sees it, and how to get it deleted.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function sections(settings: SiteSettings): LegalSection[] {
  const name = settings.business_legal_name;
  const grievance = grievanceContact(settings);
  return [
    {
      id: "who",
      title: "Who is responsible for your data",
      body: (
        <p>
          <strong>{name}</strong> is the "data fiduciary" for the personal data collected through this website under the
          Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000. Questions or
          requests about your data go to{" "}
          <a href={`mailto:${grievance.email}`} className="text-primary hover:underline">{grievance.email}</a>.
        </p>
      ),
    },
    {
      id: "what",
      title: "What we collect",
      body: (
        <>
          <p>We collect only what is needed to sell, deliver and support what you buy:</p>
          <ul>
            <li>
              <strong>Checkout & invoices</strong> — name, email, phone, optional company name and GSTIN, the product and
              tier you bought, coupon used, amount, and the order note you type.
            </li>
            <li>
              <strong>Payment metadata</strong> — Razorpay order id, payment id, payment method (e.g. "upi", "card") and
              status. We never see or store your card number, CVV, UPI PIN or net-banking credentials; those are entered on
              Razorpay's PCI-DSS certified checkout.
            </li>
            <li>
              <strong>Account</strong> — email and password (stored hashed by our authentication provider), display name,
              and your orders, bookings and licence keys.
            </li>
            <li>
              <strong>Bookings & messages</strong> — what you send through the booking and contact forms.
            </li>
            <li>
              <strong>Licence activations</strong> — when software you bought checks its licence key we record the key, a
              count of activations and the time; no device fingerprint or personal data is sent by the check.
            </li>
            <li>
              <strong>AI assistant chats</strong> — your messages are sent to our server and an AI model provider to generate
              the reply. Chat history is stored in your own browser only; we do not keep a copy on our servers. When you are
              signed in, the assistant can read your orders to answer you, and nothing else.
            </li>
            <li>
              <strong>Technical logs</strong> — standard server logs (IP address, browser, pages requested, errors) kept for
              security and debugging. We do not run third-party advertising trackers.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "why",
      title: "Why we use it (purposes)",
      body: (
        <ul>
          <li>To process your order, verify payment with Razorpay, issue the invoice and deliver the product.</li>
          <li>To give you access to downloads, licence keys and your order history, and to verify licences in shipped software.</li>
          <li>To reply to booking requests, contact messages and refund requests.</li>
          <li>To meet legal duties — GST and income-tax record keeping, responding to lawful requests, fraud prevention.</li>
          <li>To keep the site secure and improve products (aggregate, non-identifying statistics only).</li>
        </ul>
      ),
    },
    {
      id: "basis",
      title: "Consent and legitimate uses",
      body: (
        <p>
          When you place an order, book a project or send a message you voluntarily provide your data for that specific
          purpose, which is a legitimate use under Section 7 of the DPDP Act. Anything beyond that — for example a
          marketing email about new products — happens only with your separate, explicit consent, which you can withdraw at
          any time by writing to us or using the unsubscribe link. Withdrawing consent does not affect processing that already
          happened lawfully or data we must keep by law (such as invoices).
        </p>
      ),
    },
    {
      id: "sharing",
      title: "Who we share it with",
      body: (
        <>
          <p>We do not sell personal data. We share it only with processors needed to run the store:</p>
          <ul>
            <li>
              <strong>Razorpay</strong> — to collect payments and handle refunds. Razorpay's own privacy policy applies to
              data you enter on its checkout.
            </li>
            <li>
              <strong>Hosting, database and authentication providers</strong> — where the site and its database run.
            </li>
            <li>
              <strong>AI model provider</strong> — receives assistant messages to generate replies; not used to train models
              on your data under our agreement.
            </li>
            <li>
              <strong>Email / WhatsApp</strong> — to send order confirmations, download links and replies.
            </li>
            <li>
              <strong>Authorities</strong> — when required by law, for example tax authorities or a court order.
            </li>
          </ul>
          <p>
            Some providers store data outside India. Where they do, we rely on their contractual safeguards and the DPDP
            Act's rules on transfers.
          </p>
        </>
      ),
    },
    {
      id: "retention",
      title: "How long we keep it",
      body: (
        <ul>
          <li>
            <strong>Orders, invoices and payment metadata</strong> — 8 years from the end of the financial year, as required by
            GST and income-tax rules.
          </li>
          <li>
            <strong>Account data</strong> — until you delete your account or ask us to; orders linked to it are then kept only as
            anonymised invoice records.
          </li>
          <li>
            <strong>Bookings and contact messages</strong> — up to 24 months after the last reply, then deleted.
          </li>
          <li>
            <strong>Licence keys</strong> — for the life of the licence, so activations can be verified.
          </li>
          <li>
            <strong>Server logs</strong> — 90 days.
          </li>
        </ul>
      ),
    },
    {
      id: "rights",
      title: "Your rights",
      body: (
        <>
          <p>Under the DPDP Act you can, free of charge:</p>
          <ul>
            <li><strong>Access</strong> a summary of the personal data we hold about you and who it was shared with.</li>
            <li><strong>Correct or update</strong> inaccurate or incomplete data (for example the name on an invoice).</li>
            <li><strong>Erase</strong> data we no longer need to keep by law.</li>
            <li><strong>Withdraw consent</strong> for optional uses such as marketing.</li>
            <li><strong>Nominate</strong> another person to exercise these rights for you if you are unable to.</li>
            <li><strong>Complain</strong> to our grievance officer, and if unresolved, to the Data Protection Board of India.</li>
          </ul>
          <p>
            Email <a href={`mailto:${grievance.email}`} className="text-primary hover:underline">{grievance.email}</a> from the
            address on your order. We confirm receipt within 48 hours and act within 30 days.
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookies and browser storage",
      body: (
        <p>
          We use only strictly necessary storage: a session token so you stay signed in, your assistant chat history (kept
          in your browser, cleared with the "Clear chat" button), and Razorpay's checkout cookies while you pay. There are no
          advertising or cross-site tracking cookies, so no cookie banner is needed.
        </p>
      ),
    },
    {
      id: "security",
      title: "Security",
      body: (
        <p>
          Data is encrypted in transit (HTTPS) and at rest by our database provider. Row-level access rules ensure a customer
          can read only their own orders; downloads use short-lived signed links; payments are verified with Razorpay's
          HMAC signature and webhooks are checked and de-duplicated before anything is delivered. If a breach ever affects your
          data we will notify you and the Data Protection Board as the DPDP Act requires.
        </p>
      ),
    },
    {
      id: "children",
      title: "Children",
      body: (
        <p>
          The store is meant for adults and businesses. We do not knowingly collect data from anyone under 18 without
          verifiable parental consent; students using coaching software bought by an institute are covered by that
          institute's own arrangements.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes",
      body: (
        <p>
          When this policy changes we update the date at the top and, for material changes, tell account holders by email.
          See also our <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link>.
        </p>
      ),
    },
  ];
}

function PrivacyPage() {
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);
  return (
    <LegalPage
      current="/privacy"
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="What we collect when you buy or book, why we need it, who processes it, how long we keep it — and how to get it corrected or deleted."
      settings={settings}
      sections={sections(settings)}
    />
  );
}
