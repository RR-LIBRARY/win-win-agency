import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LegalPage, type LegalSection } from "@/components/site/LegalPage";
import { siteSettingsQuery, type SiteSettings } from "@/lib/settings.functions";

export const Route = createFileRoute("/terms")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteSettingsQuery),
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Win Win Digital Agency" },
      {
        name: "description",
        content:
          "The terms that apply when you buy software, source code, Notion templates or agency services from Win Win Digital Agency: pricing in INR, licences, payments via Razorpay, delivery and refunds.",
      },
      { property: "og:title", content: "Terms & Conditions — Win Win Digital Agency" },
      {
        property: "og:description",
        content: "Plain-language terms for digital products and agency work: licences, payments, delivery, refunds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function sections(settings: SiteSettings): LegalSection[] {
  const name = settings.business_legal_name;
  return [
    {
      id: "agreement",
      title: "Who these terms are between",
      body: (
        <>
          <p>
            These Terms & Conditions ("Terms") are an agreement between you and <strong>{name}</strong> ("we", "us"),
            the operator of this website and the software store on it. They apply whenever you browse the site, create
            an account, book agency work, or buy a product here.
          </p>
          <p>
            By placing an order or clicking "Pay" you confirm that you have read these Terms together with our{" "}
            <Link to="/refund-policy" className="text-primary hover:underline">Refund & Cancellation Policy</Link>,{" "}
            <Link to="/delivery-policy" className="text-primary hover:underline">Shipping & Delivery Policy</Link> and{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, and that you agree to them.
            If you are buying for a company, you confirm you are allowed to bind that company.
          </p>
        </>
      ),
    },
    {
      id: "what-we-sell",
      title: "What we sell",
      body: (
        <>
          <p>Two kinds of things are sold on this site:</p>
          <ul>
            <li>
              <strong>Digital products</strong> — ready-made software, source-code kits, SaaS tools, mobile apps, plugins,
              e-books, courses and Notion templates listed in the <Link to="/store" className="text-primary hover:underline">Software Store</Link>.
              These are delivered electronically; nothing is shipped physically.
            </li>
            <li>
              <strong>Agency services</strong> — websites, apps, coaching-centre software, consulting and similar project
              work that you book through the <Link to="/book" className="text-primary hover:underline">booking page</Link>.
              Each project is confirmed with a written scope, dates and total before any work or payment starts.
            </li>
          </ul>
          <p>
            Some listings are marked as sold on another platform (for example Gumroad, Amazon or the Play Store). For those,
            the purchase, payment, delivery and refund are handled by that platform under its own terms; we only link to it.
          </p>
        </>
      ),
    },
    {
      id: "accounts",
      title: "Accounts and guest checkout",
      body: (
        <>
          <p>
            You can buy as a guest or with an account. Guest orders are protected by a private order link that we show
            you after checkout and send to your email — anyone with that link can open the order page, so keep it to
            yourself. Account holders see all their orders, downloads and licence keys under "My orders".
          </p>
          <p>
            You are responsible for the accuracy of the name, email, phone, company and GSTIN you enter — they are printed
            on your invoice and cannot always be changed after the invoice number is issued. Keep your password private and
            tell us at once if you think your account has been misused.
          </p>
        </>
      ),
    },
    {
      id: "pricing",
      title: "Prices, taxes and coupons",
      body: (
        <>
          <p>
            All prices are in <strong>Indian Rupees (INR)</strong>. The price shown on the product page and again on the
            checkout page is the full amount you pay for that product{" "}
            {settings.business_gstin ? "and includes GST at the applicable rate" : "; GST is not charged because we are not GST-registered"}.
            There are no hidden convenience or platform fees on top of the amount shown at checkout.
          </p>
          <p>
            Prices are always calculated on our server from the current catalogue, the pricing option (tier) you selected
            and any valid coupon. If a coupon has expired or has been used up by the time you pay, the discount is removed
            and the corrected total is shown before you are charged. We may change prices at any time, but a change never
            affects an order you have already paid for.
          </p>
        </>
      ),
    },
    {
      id: "payments",
      title: "Payments",
      body: (
        <>
          <p>
            Online payments (UPI, cards, net banking, wallets) are processed by <strong>Razorpay Software Pvt. Ltd.</strong>,
            an RBI-authorised payment aggregator. Card and UPI details are entered on Razorpay's secure checkout and are
            never stored on our servers. Every successful payment is verified on our server with Razorpay's cryptographic
            signature before an order is marked paid.
          </p>
          <p>
            We may also accept bank transfer / UPI to the account details shown at checkout. Bank-transfer orders remain
            "awaiting payment" until we have matched the transfer, and no product is delivered before that.
          </p>
          <p>
            If money is debited but the order still shows as pending, do not pay again — our system reconciles with
            Razorpay automatically and any genuinely failed payment is reversed by your bank, usually within 5–7 working days.
          </p>
        </>
      ),
    },
    {
      id: "licence",
      title: "Licence to use digital products",
      body: (
        <>
          <p>
            When you buy a digital product you receive a <strong>non-exclusive, non-transferable licence</strong> to use it
            as described on its product page and in its licence terms. Unless the product page says otherwise:
          </p>
          <ul>
            <li>Personal and single-business tiers cover one person or one business entity.</li>
            <li>Source-code products may be modified and deployed for your own projects or your clients' projects.</li>
            <li>
              You may not resell, sublicense, share or publish the product, its source code or your licence key, or offer it
              as a competing template or product.
            </li>
            <li>
              Licence keys carry an activation limit. Keys can be revoked if a refund is issued, if the key is shared
              publicly, or if these Terms are breached.
            </li>
          </ul>
          <p>
            Ownership of the product, its code, design and brand stays with {name} or its licensors. Work we build for you
            under an agency project is governed by that project's written scope, which sets out what you own at handover.
          </p>
        </>
      ),
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      body: (
        <>
          <p>You agree not to:</p>
          <ul>
            <li>Use the site, the AI assistant or any product for anything unlawful, fraudulent or harmful.</li>
            <li>Try to bypass payment, tamper with prices, licence checks or download links, or probe our systems.</li>
            <li>Upload malware, scrape the store at scale, or impersonate another person or business.</li>
          </ul>
          <p>We may suspend accounts or cancel orders that break these rules, and we will tell you why.</p>
        </>
      ),
    },
    {
      id: "delivery-and-refunds",
      title: "Delivery, refunds and cancellations",
      body: (
        <p>
          Digital products are unlocked immediately after payment is confirmed; details are in our{" "}
          <Link to="/delivery-policy" className="text-primary hover:underline">Shipping & Delivery Policy</Link>. Our current
          refund promise is: <strong>{settings.refund_policy}</strong> The full conditions, timelines and how to request one are in
          the <Link to="/refund-policy" className="text-primary hover:underline">Refund & Cancellation Policy</Link>.
        </p>
      ),
    },
    {
      id: "ai-assistant",
      title: "AI assistant",
      body: (
        <p>
          The assistant on this site answers from our catalogue, policies and, when you are signed in, your own orders. It
          can make mistakes: prices, delivery and refunds are always governed by the product page, your invoice and these
          Terms — not by a chat reply. Never share passwords, card numbers or OTPs in the chat.
        </p>
      ),
    },
    {
      id: "warranty",
      title: "Warranties and limitation of liability",
      body: (
        <>
          <p>
            We take care that products work as described on their product page and we fix genuine defects reported within
            the refund window. Beyond that, digital products are provided "as is" — we do not promise they are error-free or
            fit for a purpose that is not described on the listing.
          </p>
          <p>
            To the extent permitted by Indian law, our total liability for any claim connected to a product or order is
            limited to the amount you paid us for that product or order. We are not liable for indirect losses such as lost
            profits or data, or for services run by third parties (payment gateway, hosting, Notion, app stores).
            Nothing in these Terms limits rights you have under the Consumer Protection Act, 2019 that cannot be excluded.
          </p>
        </>
      ),
    },
    {
      id: "law",
      title: "Governing law and disputes",
      body: (
        <p>
          These Terms are governed by the laws of India. Please raise any complaint with our grievance officer first (details
          below) — most issues are resolved within days. If a dispute cannot be resolved that way, the courts having
          jurisdiction over our registered office{settings.business_address ? ` (${settings.business_address})` : ""} will have
          exclusive jurisdiction, without prejudice to your right to approach the consumer forum under the Consumer
          Protection Act, 2019.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes to these terms",
      body: (
        <p>
          We may update these Terms as products, payment methods or the law change. The date at the top shows the current
          version; material changes are highlighted on the checkout page for 30 days. Orders are governed by the Terms in
          force when they were placed.
        </p>
      ),
    },
  ];
}

function TermsPage() {
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);
  return (
    <LegalPage
      current="/terms"
      eyebrow="Legal"
      title="Terms & Conditions"
      subtitle="Plain-language terms for buying digital products and booking agency work with us. Prices in INR, secure payments through Razorpay, instant delivery after payment."
      settings={settings}
      sections={sections(settings)}
    />
  );
}
