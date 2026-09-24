import {
  Code2,
  Smartphone,
  NotebookPen,
  ShoppingCart,
  Rocket,
  GraduationCap,
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

export type Service = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  deliverables: string[];
  packages: Package[];
};

export const services: Service[] = [
  {
    slug: "software-websites",
    name: "Software Websites",
    tagline: "Marketing sites that sell your product",
    description:
      "A fast, search-friendly website for your software or SaaS product, with the pages that actually convert visitors into trials.",
    icon: Code2,
    deliverables: [
      "Home, features, pricing and docs pages",
      "Copywriting pass on every section",
      "Search and social preview setup",
      "Analytics and lead capture",
    ],
    packages: [
      {
        id: "sw-starter",
        name: "Starter",
        price: 18000,
        timeline: "7-10 days",
        includes: ["Up to 5 pages", "Mobile ready", "Contact form", "1 revision round"],
      },
      {
        id: "sw-growth",
        name: "Growth",
        price: 39000,
        timeline: "2-3 weeks",
        includes: [
          "Up to 12 pages",
          "Blog with categories",
          "Search setup and sitemap",
          "3 revision rounds",
        ],
      },
      {
        id: "sw-scale",
        name: "Scale",
        price: 74000,
        timeline: "4-5 weeks",
        includes: [
          "Unlimited pages",
          "Custom animation pass",
          "CMS for your team",
          "60 days of support",
        ],
      },
    ],
  },
  {
    slug: "apps",
    name: "Mobile & Web Apps",
    tagline: "Products with login, data and dashboards",
    description:
      "Full applications with accounts, roles, payments and a dashboard your team can actually run the business from.",
    icon: Smartphone,
    deliverables: [
      "User accounts and roles",
      "Database and secure data rules",
      "Admin dashboard",
      "Deployment and handover",
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
        includes: [
          "Up to 6 features",
          "Payments integration",
          "Full admin panel",
          "Email notifications",
        ],
      },
      {
        id: "app-custom",
        name: "Custom",
        price: 240000,
        timeline: "10-12 weeks",
        includes: [
          "Unlimited scope planning",
          "Multi-role access control",
          "Reports and exports",
          "90 days of support",
        ],
      },
    ],
  },
  {
    slug: "notion-templates",
    name: "Notion Templates",
    tagline: "Systems people pay to copy",
    description:
      "Designed, documented Notion systems ready to sell or roll out across your team, with dashboards that stay tidy.",
    icon: NotebookPen,
    deliverables: [
      "Linked databases and views",
      "Dashboard and navigation",
      "Setup guide for buyers",
      "Cover art and listing copy",
    ],
    packages: [
      {
        id: "no-single",
        name: "Single System",
        price: 7500,
        timeline: "4-6 days",
        includes: ["1 workspace system", "Up to 4 databases", "Buyer guide", "1 revision round"],
      },
      {
        id: "no-bundle",
        name: "Template Bundle",
        price: 19000,
        timeline: "10-14 days",
        includes: ["3 connected systems", "Cover art set", "Sales page copy", "2 revision rounds"],
      },
      {
        id: "no-team",
        name: "Team Rollout",
        price: 34000,
        timeline: "3 weeks",
        includes: [
          "Company-wide structure",
          "Automation setup",
          "Team training session",
          "30 days of support",
        ],
      },
    ],
  },
  {
    slug: "ecommerce",
    name: "Ecommerce Stores",
    tagline: "Storefronts built to check out",
    description:
      "Product catalogue, cart, checkout and order management — set up so you can add products without calling a developer.",
    icon: ShoppingCart,
    deliverables: [
      "Catalogue and product pages",
      "Cart and checkout flow",
      "Payment and delivery setup",
      "Order dashboard",
    ],
    packages: [
      {
        id: "ec-launch",
        name: "Launch",
        price: 29000,
        timeline: "10-14 days",
        includes: ["Up to 30 products", "Payment gateway", "Order emails", "1 revision round"],
      },
      {
        id: "ec-retail",
        name: "Retail",
        price: 68000,
        timeline: "3-4 weeks",
        includes: [
          "Unlimited products",
          "Discounts and coupons",
          "Inventory tracking",
          "Abandoned cart emails",
        ],
      },
      {
        id: "ec-brand",
        name: "Brand",
        price: 135000,
        timeline: "5-7 weeks",
        includes: [
          "Custom brand design",
          "Multi-currency support",
          "Reviews and loyalty",
          "60 days of support",
        ],
      },
    ],
  },
  {
    slug: "landing-pages",
    name: "Landing Pages",
    tagline: "One page, one job: conversions",
    description:
      "High-intent pages for ads, launches and lead generation, written and built around a single action.",
    icon: Rocket,
    deliverables: [
      "Conversion-first layout",
      "Headline and offer copy",
      "Lead form or booking widget",
      "Speed and tracking setup",
    ],
    packages: [
      {
        id: "lp-single",
        name: "Single Page",
        price: 9500,
        timeline: "3-5 days",
        includes: ["1 page", "Lead form", "Mobile ready", "1 revision round"],
      },
      {
        id: "lp-campaign",
        name: "Campaign Set",
        price: 24000,
        timeline: "8-10 days",
        includes: ["3 page variants", "A/B ready structure", "Ad tracking", "2 revision rounds"],
      },
      {
        id: "lp-funnel",
        name: "Funnel",
        price: 46000,
        timeline: "2-3 weeks",
        includes: [
          "Page plus thank-you flow",
          "Email sequence setup",
          "CRM connection",
          "30 days of support",
        ],
      },
    ],
  },
  {
    slug: "educational-projects",
    name: "Educational Projects",
    tagline: "Courses, portals and college work",
    description:
      "Learning platforms, student portals and final-year projects built properly, documented and explained.",
    icon: GraduationCap,
    deliverables: [
      "Course or module structure",
      "Student and teacher views",
      "Progress tracking",
      "Documentation and walkthrough",
    ],
    packages: [
      {
        id: "ed-project",
        name: "Student Project",
        price: 12000,
        timeline: "7-10 days",
        includes: ["Working project", "Report and diagrams", "Source handover", "Demo walkthrough"],
      },
      {
        id: "ed-portal",
        name: "Learning Portal",
        price: 58000,
        timeline: "4-5 weeks",
        includes: [
          "Courses and lessons",
          "Student progress tracking",
          "Teacher dashboard",
          "Certificates",
        ],
      },
      {
        id: "ed-institute",
        name: "Institute Suite",
        price: 148000,
        timeline: "8-10 weeks",
        includes: [
          "Admissions and fees",
          "Attendance and results",
          "Parent access",
          "90 days of support",
        ],
      },
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
