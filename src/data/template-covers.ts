import secondBrain from "@/assets/template-second-brain.jpg";
import freelancerCrm from "@/assets/template-freelancer-crm.jpg";
import contentCalendar from "@/assets/template-content-calendar.jpg";
import moneyTracker from "@/assets/template-money-tracker.jpg";
import studyPlanner from "@/assets/template-study-planner.jpg";
import coachingManager from "@/assets/template-coaching-manager.jpg";
import edupanel from "@/assets/product-edupanel.jpg";
import gstbill from "@/assets/product-gstbill.jpg";
import whatsappBot from "@/assets/product-whatsapp-bot.jpg";
import pdfvault from "@/assets/product-pdfvault.jpg";

/** Bundled covers for the starter catalogue; admin-added products use their own image URL. */
const covers: Record<string, string> = {
  "second-brain-os": secondBrain,
  "freelancer-crm": freelancerCrm,
  "content-calendar-studio": contentCalendar,
  "money-tracker-india": moneyTracker,
  "student-study-planner": studyPlanner,
  "coaching-institute-manager": coachingManager,
  "edupanel-coaching-erp": edupanel,
  "gstbill-invoice-app": gstbill,
  "whatsapp-lead-bot-kit": whatsappBot,
  "pdfvault-secure-storage": pdfvault,
};

const categoryFallback: Record<string, string> = {
  productivity: secondBrain,
  business: freelancerCrm,
  creators: contentCalendar,
  finance: moneyTracker,
  education: studyPlanner,
};

const productTypeFallback: Record<string, string> = {
  software: gstbill,
  source_code: whatsappBot,
  saas_tool: edupanel,
  mobile_app: gstbill,
  plugin: pdfvault,
};

export function templateCover(template: {
  slug: string;
  category: string;
  cover_image_url: string | null;
  product_type?: string;
}) {
  if (template.cover_image_url) return template.cover_image_url;
  if (covers[template.slug]) return covers[template.slug]!;
  if (template.product_type && template.product_type !== "notion_template") {
    return productTypeFallback[template.product_type] ?? edupanel;
  }
  return categoryFallback[template.category] ?? secondBrain;
}

/** Alias that reads better in software-store code. */
export const productCover = templateCover;
