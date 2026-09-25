import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LegalPage, type LegalSection } from "@/components/site/LegalPage";
import { REVIEW_CRITERIA, REVIEW_LIMITS } from "@/lib/review-rules";
import { grievanceContact, siteSettingsQuery, type SiteSettings } from "@/lib/settings.functions";

export const Route = createFileRoute("/review-policy")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteSettingsQuery),
  head: () => ({
    meta: [
      { title: "Review Guidelines — Win Win Digital Agency" },
      {
        name: "description",
        content:
          "How product reviews work on the Win Win Digital store: only verified buyers can review, every review is moderated against these published criteria, ratings are never edited, and we reply publicly.",
      },
      { property: "og:title", content: "Review Guidelines — Win Win Digital Agency" },
      { property: "og:description", content: "Verified-buyer reviews, published criteria, no edited ratings — aligned with IS 19000:2022." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewPolicyPage,
});

function sections(settings: SiteSettings): LegalSection[] {
  const grievance = grievanceContact(settings);
  return [
    {
      id: "who",
      title: "Who can write a review",
      body: (
        <>
          <p>
            Only people who bought the product from this store. After payment, the order page (and your account) shows a
            "Review" form for that order — one review per order. We never buy, trade or import reviews, and our team does not
            review its own products.
          </p>
          <p>Products sold on other platforms (Gumroad, Amazon, app stores) are reviewed there, under that platform's rules.</p>
        </>
      ),
    },
    {
      id: "criteria",
      title: "What you agree to when you submit",
      body: (
        <>
          <p>Before sending a review you confirm each of these published criteria:</p>
          <ul>
            {REVIEW_CRITERIA.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p>
            Reviews are between {REVIEW_LIMITS.minBody} and {REVIEW_LIMITS.maxBody} characters, carry a 1–5 star rating and a
            short display name (shown as "First L."). Phone numbers, email addresses and links are blocked automatically to
            protect your personal data.
          </p>
        </>
      ),
    },
    {
      id: "moderation",
      title: "How we moderate",
      body: (
        <>
          <p>
            Every review is read by a person, normally within one business day, and checked <strong>only</strong> against the
            criteria above. A review that meets them is published <strong>unedited</strong> — positive or negative. We do not
            filter by star rating.
          </p>
          <p>
            A review is not published (or is taken down later) only when it breaks a criterion: for example abusive language,
            personal data, content unrelated to the product, or evidence it was not written by the buyer. In that case the
            buyer still sees their own review with the status "Not published" on the order page.
          </p>
          <p>
            <strong>We never change a rating or the words of a review.</strong> Product ratings shown on the store are the
            plain average of approved reviews.
          </p>
        </>
      ),
    },
    {
      id: "replies",
      title: "Our replies",
      body: (
        <p>
          We may reply publicly to a review — to fix a problem, add context or say thanks. Replies are clearly labelled
          "Reply from Win Win Digital" and never replace or hide the original review.
        </p>
      ),
    },
    {
      id: "standard",
      title: "The standard we follow",
      body: (
        <p>
          These guidelines follow the Bureau of Indian Standards framework for online consumer reviews (IS 19000:2022 —
          collection, moderation and publication of reviews): verified authors, published criteria consented to at submission,
          moderation limited to those criteria, and no alteration of ratings. Questions or a complaint about a review? Write to
          the grievance officer below or{" "}
          <Link to="/contact" className="text-primary hover:underline">
            contact us
          </Link>{" "}
          — {grievance.email}.
        </p>
      ),
    },
  ];
}

function ReviewPolicyPage() {
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);
  return (
    <LegalPage
      current="/review-policy"
      eyebrow="Legal"
      title="Review Guidelines"
      subtitle="Real reviews from verified buyers, moderated against these public criteria, published unedited — good or bad."
      settings={settings}
      sections={sections(settings)}
    />
  );
}
