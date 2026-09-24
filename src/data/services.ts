import {
  Globe,
  Smartphone,
  GraduationCap,
  NotebookPen,
  Compass,
  FolderLock,
  type LucideIcon,
} from "lucide-react";

export const SETUP_FEE = 2999;
export const CURRENCY = "₹";

export function formatPrice(value: number) {
  return `${CURRENCY}${value.toLocaleString("en-IN")}`;
}

export type Package = {
  id: string;
  name: string;
  price: number;
  timeline: string;
  includes: string[];
};

export type Faq = { q: string; a: string };

export type Service = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  forWhom: string[];
  deliverables: string[];
  packages: Package[];
  faq: Faq[];
};

export const services: Service[] = [
  {
    slug: "websites",
    name: "Websites",
    tagline: "Business, product and portfolio sites that convert",
    description:
      "Fast, search-friendly websites for businesses, SaaS products, creators and local shops — written and structured around the one action you want visitors to take.",
    icon: Globe,
    forWhom: ["Startups and SaaS teams", "Local businesses and clinics", "Coaches, creators and consultants"],
    deliverables: [
      "Home, about, services/features, pricing and contact pages",
      "Copywriting pass on every section",
      "Search and social preview setup",
      "Analytics, lead form and WhatsApp button",
    ],
    packages: [
      {
        id: "web-basic",
        name: "Basic",
        price: 14000,
        timeline: "5-7 days",
        includes: ["Up to 5 pages", "Mobile ready", "Contact / WhatsApp form", "1 revision round"],
      },
      {
        id: "web-standard",
        name: "Standard",
        price: 32000,
        timeline: "2-3 weeks",
        includes: ["Up to 12 pages", "Blog or news section", "Search setup and sitemap", "3 revision rounds"],
      },
      {
        id: "web-premium",
        name: "Premium",
        price: 68000,
        timeline: "4-5 weeks",
        includes: ["Unlimited pages", "Custom animations", "Content manager for your team", "60 days of support"],
      },
    ],
    faq: [
      { q: "Do I need to bring content?", a: "Bring what you have. We write and tidy the rest as part of every package." },
      { q: "Who owns the site?", a: "You do — code, domain and hosting accounts are handed over at launch." },
    ],
  },
  {
    slug: "apps",
    name: "Apps",
    tagline: "Mobile and web apps with login, data and dashboards",
    description:
      "Full applications with accounts, roles, payments and an admin dashboard your team can actually run the business from — on the web, Android and iOS.",
    icon: Smartphone,
    forWhom: ["Founders validating an idea", "Businesses replacing spreadsheets", "Teams needing a client portal"],
    deliverables: [
      "User accounts and roles",
      "Database with secure access rules",
      "Admin dashboard and reports",
      "Deployment, store listing help and handover",
    ],
    packages: [
      {
        id: "app-mvp",
        name: "MVP",
        price: 55000,
        timeline: "3-4 weeks",
        includes: ["Login and profiles", "2 core features", "Basic admin view", "Hosting setup"],
      },
      {
        id: "app-business",
        name: "Business",
        price: 125000,
        timeline: "6-8 weeks",
        includes: ["Up to 6 features", "Payments integration", "Full admin panel", "Email and WhatsApp notifications"],
      },
      {
        id: "app-custom",
        name: "Custom",
        price: 240000,
        timeline: "10-12 weeks",
        includes: ["Unlimited scope planning", "Multi-role access control", "Reports and exports", "90 days of support"],
      },
    ],
    faq: [
      { q: "Android, iOS or web?", a: "All three from one codebase. Store publishing is included in Business and Custom." },
      { q: "Can we add features later?", a: "Yes — every app is built so new modules can be added without a rebuild." },
    ],
  },
  {
    slug: "educational-projects",
    name: "Educational Projects",
    tagline: "EdTech apps for coaching centres, tuition classes and colleges",
    description:
      "Our specialty. Complete coaching-institute apps with batches, attendance, fee tracking, test series, study-material PDFs, notices and parent updates — plus learning portals and final-year projects.",
    icon: GraduationCap,
    forWhom: ["Small coaching and tuition centres", "Schools and colleges", "Students needing project work"],
    deliverables: [
      "Student, batch and teacher management",
      "Attendance, fees and dues with WhatsApp reminders",
      "Tests, results and study-material library",
      "Parent app or portal with notices",
    ],
    packages: [
      {
        id: "ed-basic",
        name: "Basic",
        price: 12000,
        timeline: "7-10 days",
        includes: ["Coaching website with courses", "Enquiry form to WhatsApp", "Fee display managed by you", "Google Maps and reviews"],
      },
      {
        id: "ed-standard",
        name: "Standard",
        price: 58000,
        timeline: "4-5 weeks",
        includes: ["Everything in Basic", "Batches, attendance and fees", "Study material PDFs", "Tests and results"],
      },
      {
        id: "ed-premium",
        name: "Premium",
        price: 148000,
        timeline: "8-10 weeks",
        includes: ["Everything in Standard", "Parent and student apps", "Online fee payment", "90 days of support"],
      },
    ],
    faq: [
      { q: "Can I see a live example?", a: "Yes — the live demo link on this page opens a real coaching site we built." },
      { q: "Do teachers need training?", a: "We run a 1-hour handover in Hindi or English and leave short videos behind." },
    ],
  },
  {
    slug: "notion-templates",
    name: "Notion Templates",
    tagline: "Ready systems in our store, or custom templates for your team",
    description:
      "Buy a finished Notion system from our store, or have one designed for your team — dashboards, linked databases and a setup guide so it stays tidy.",
    icon: NotebookPen,
    forWhom: ["Freelancers and creators", "Students and coaching institutes", "Teams tired of scattered docs"],
    deliverables: [
      "Linked databases and views",
      "Dashboard and navigation",
      "Setup guide in Hindi and English",
      "Cover art and listing copy",
    ],
    packages: [
      {
        id: "no-basic",
        name: "Basic",
        price: 7500,
        timeline: "4-6 days",
        includes: ["1 workspace system", "Up to 4 databases", "Buyer guide", "1 revision round"],
      },
      {
        id: "no-standard",
        name: "Standard",
        price: 19000,
        timeline: "10-14 days",
        includes: ["3 connected systems", "Cover art set", "Sales page copy", "2 revision rounds"],
      },
      {
        id: "no-premium",
        name: "Premium",
        price: 34000,
        timeline: "3 weeks",
        includes: ["Company-wide structure", "Automation setup", "Team training session", "30 days of support"],
      },
    ],
    faq: [
      { q: "Where do I buy ready templates?", a: "In the Templates store on this site — pay once, get the duplicate link in your account." },
      { q: "Will it work on the free Notion plan?", a: "Yes, every template we ship works on the free plan." },
    ],
  },
  {
    slug: "software-consulting",
    name: "Software Consulting",
    tagline: "Tech decisions, audits and roadmaps before you spend big",
    description:
      "Not sure what to build, which stack to pick or why the current system breaks? We audit, plan and hand you a clear roadmap your developers can follow — or we build it with you.",
    icon: Compass,
    forWhom: ["Founders before hiring developers", "Businesses with a failing system", "Agencies needing a technical partner"],
    deliverables: [
      "Requirement and workflow review",
      "Architecture and tool recommendations",
      "Cost and timeline estimate",
      "Written roadmap and vendor brief",
    ],
    packages: [
      {
        id: "sc-basic",
        name: "Basic",
        price: 4999,
        timeline: "2-3 days",
        includes: ["90-minute strategy call", "Written summary", "Tool and stack shortlist", "Follow-up questions by email"],
      },
      {
        id: "sc-standard",
        name: "Standard",
        price: 18000,
        timeline: "1-2 weeks",
        includes: ["Full audit of current system", "Architecture document", "Cost and timeline plan", "2 review calls"],
      },
      {
        id: "sc-premium",
        name: "Premium",
        price: 45000,
        timeline: "Monthly",
        includes: ["Fractional CTO, 8 hrs a week", "Developer hiring help", "Sprint planning and reviews", "Priority WhatsApp support"],
      },
    ],
    faq: [
      { q: "Do you also build after consulting?", a: "Yes, and the consulting fee is adjusted against the build if you book within 30 days." },
    ],
  },
  {
    slug: "pdf-storage",
    name: "PDF Storage",
    tagline: "Secure document libraries with search, access control and sharing",
    description:
      "Organised, searchable storage for notes, study material, invoices, contracts and reports — with folders, permissions, expiring share links and a clean viewer on any device.",
    icon: FolderLock,
    forWhom: ["Coaching institutes sharing notes", "CAs, lawyers and clinics", "Teams drowning in WhatsApp PDFs"],
    deliverables: [
      "Folder structure with roles and permissions",
      "Upload, tag and full-text search",
      "Share links with expiry and download control",
      "Viewer that works on mobile",
    ],
    packages: [
      {
        id: "pdf-basic",
        name: "Basic",
        price: 9000,
        timeline: "5-7 days",
        includes: ["Up to 5 GB library", "Folders and tags", "Password-protected sharing", "Admin dashboard"],
      },
      {
        id: "pdf-standard",
        name: "Standard",
        price: 24000,
        timeline: "2 weeks",
        includes: ["Up to 50 GB library", "Student / member logins", "Full-text search", "Download limits and watermark"],
      },
      {
        id: "pdf-premium",
        name: "Premium",
        price: 52000,
        timeline: "3-4 weeks",
        includes: ["Unlimited library", "Paid access and subscriptions", "Analytics on views", "60 days of support"],
      },
    ],
    faq: [
      { q: "Where are files stored?", a: "On secure cloud storage under your own account — you keep control of the data." },
    ],
  },
];

export type AddOn = {
  id: string;
  label: string;
  note: string;
  price: number;
};

export const addOns: AddOn[] = [
  { id: "extra-pages", label: "3 extra pages or screens", note: "More surface area", price: 7500 },
  { id: "rush", label: "Rush delivery", note: "Front of the queue", price: 12000 },
  { id: "copywriting", label: "Full copywriting", note: "We write every word", price: 9000 },
  { id: "branding", label: "Logo and brand kit", note: "Marks, colours, fonts", price: 14000 },
  { id: "maintenance", label: "6 months maintenance", note: "Fixes and small changes", price: 18000 },
];

export function findService(slug: string) {
  return services.find((service) => service.slug === slug);
}

export function findPackage(id: string) {
  for (const service of services) {
    const pkg = service.packages.find((p) => p.id === id);
    if (pkg) return { service, pkg };
  }
  return undefined;
}

export function findAddOns(ids: string[]) {
  return addOns.filter((addOn) => ids.includes(addOn.id));
}
