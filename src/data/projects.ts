import ledgerloop from "@/assets/project-ledgerloop.jpg";
import fittrack from "@/assets/project-fittrack.jpg";
import creatoros from "@/assets/project-creatoros.jpg";
import mitti from "@/assets/project-mitti.jpg";
import solar from "@/assets/project-solar.jpg";
import vidya from "@/assets/project-vidya.jpg";

export type Project = {
  slug: string;
  title: string;
  client: string;
  serviceSlug: string;
  serviceName: string;
  year: string;
  summary: string;
  cover: string;
  problem: string;
  built: string[];
  result: string;
  stats: { label: string; value: string }[];
};

export const projects: Project[] = [
  {
    slug: "ledgerloop",
    title: "LedgerLoop",
    client: "Accounting software startup",
    serviceSlug: "software-websites",
    serviceName: "Software Websites",
    year: "2026",
    summary: "A product site that explains a complicated accounting tool in one scroll.",
    cover: ledgerloop,
    problem:
      "The founders had a working product but their old site buried the value in feature lists. Demo requests were coming mostly from personal referrals, not the website.",
    built: [
      "A single-scroll home page that shows the product in use before it explains features",
      "Separate pages for features, pricing and documentation so each can rank on its own",
      "A short demo-request form that only asks for what the sales call needs",
      "Analytics and search metadata set up from day one",
    ],
    result:
      "Demo requests from the website became the team's main inbound channel within two months of launch.",
    stats: [
      { label: "Pages", value: "11" },
      { label: "Build time", value: "3 weeks" },
      { label: "Demo requests", value: "4x" },
    ],
  },
  {
    slug: "fittrack-coach",
    title: "FitTrack Coach",
    client: "Independent personal trainer",
    serviceSlug: "apps",
    serviceName: "Mobile & Web Apps",
    year: "2026",
    summary: "A coaching app where trainers assign plans and clients tick off workouts.",
    cover: fittrack,
    problem:
      "Plans were going out over chat and spreadsheets. Nobody could see who had actually trained that week, so follow-ups were guesswork.",
    built: [
      "Client accounts with a weekly plan view and a check-off flow",
      "A trainer dashboard showing who is on track and who has gone quiet",
      "Progress history with weight, reps and streaks",
      "Reminder emails on missed sessions",
    ],
    result:
      "The trainer moved from 14 clients to 40 without hiring, because the follow-up work stopped being manual.",
    stats: [
      { label: "Active clients", value: "40+" },
      { label: "Screens", value: "9" },
      { label: "Build time", value: "6 weeks" },
    ],
  },
  {
    slug: "creator-os",
    title: "Creator OS",
    client: "Content studio",
    serviceSlug: "notion-templates",
    serviceName: "Notion Templates",
    year: "2025",
    summary: "A Notion system for planning, scripting and publishing — packaged to sell.",
    cover: creatoros,
    problem:
      "The studio ran on twelve unconnected Notion pages. They also wanted to sell their process, but it was too messy for anyone else to use.",
    built: [
      "Four linked databases for ideas, scripts, shoots and publishing",
      "One dashboard with today, this week and stuck items",
      "A setup guide written for buyers who have never used Notion",
      "Cover art and listing copy for the sales page",
    ],
    result:
      "The internal system became their best-selling digital product, with hundreds of copies sold.",
    stats: [
      { label: "Databases", value: "4" },
      { label: "Copies sold", value: "600+" },
      { label: "Build time", value: "2 weeks" },
    ],
  },
  {
    slug: "mitti-clay",
    title: "Mitti Clay Co.",
    client: "Handmade pottery brand",
    serviceSlug: "ecommerce",
    serviceName: "Ecommerce Stores",
    year: "2025",
    summary: "A store the owner updates herself, with payments and order tracking built in.",
    cover: mitti,
    problem:
      "Orders were taken over WhatsApp screenshots. Stock counts were wrong, and payments had to be chased one customer at a time.",
    built: [
      "Product catalogue with variants for size and glaze",
      "Cart and checkout with online payment and cash on delivery",
      "Inventory that drops as orders come in",
      "An order dashboard with packing slips",
    ],
    result:
      "Order handling dropped from roughly two hours a day to twenty minutes, and stock errors stopped.",
    stats: [
      { label: "Products", value: "120" },
      { label: "Admin time saved", value: "8 hrs/wk" },
      { label: "Build time", value: "4 weeks" },
    ],
  },
  {
    slug: "solar-bharat",
    title: "Solar Bharat",
    client: "Rooftop solar installer",
    serviceSlug: "landing-pages",
    serviceName: "Landing Pages",
    year: "2026",
    summary: "One page built for paid ads, with a savings calculator as the hook.",
    cover: solar,
    problem:
      "Ad traffic was landing on a general company site and bouncing. Visitors wanted to know their own savings, not read about the company.",
    built: [
      "A savings estimate the visitor fills in before any form appears",
      "Proof section with installation photos and bill comparisons",
      "A two-field callback form with a WhatsApp fallback",
      "Conversion tracking wired to the ad accounts",
    ],
    result: "Cost per qualified lead fell by more than half compared with the previous page.",
    stats: [
      { label: "Load time", value: "1.1s" },
      { label: "Cost per lead", value: "-58%" },
      { label: "Build time", value: "9 days" },
    ],
  },
  {
    slug: "vidya-portal",
    title: "Vidya Learning Portal",
    client: "Coaching institute",
    serviceSlug: "educational-projects",
    serviceName: "Educational Projects",
    year: "2025",
    summary: "A learning portal with lessons, tests and parent access for 900 students.",
    cover: vidya,
    problem:
      "Lessons lived on a shared drive, tests were on paper, and parents had no way to see how their child was doing.",
    built: [
      "Course and lesson structure with video and notes",
      "Timed tests with automatic scoring",
      "Teacher dashboard for batches and attendance",
      "Parent login with a monthly progress view",
    ],
    result: "900 students moved onto the portal in one term, and result sheets now go out the same day.",
    stats: [
      { label: "Students", value: "900" },
      { label: "Batches", value: "34" },
      { label: "Build time", value: "9 weeks" },
    ],
  },
];

export function findProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
