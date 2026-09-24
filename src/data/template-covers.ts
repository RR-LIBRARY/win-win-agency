import secondBrain from "@/assets/template-second-brain.jpg";
import freelancerCrm from "@/assets/template-freelancer-crm.jpg";
import contentCalendar from "@/assets/template-content-calendar.jpg";
import moneyTracker from "@/assets/template-money-tracker.jpg";
import studyPlanner from "@/assets/template-study-planner.jpg";
import coachingManager from "@/assets/template-coaching-manager.jpg";

/** Bundled covers for the starter templates; admin-added templates use their own image URL. */
const covers: Record<string, string> = {
  "second-brain-os": secondBrain,
  "freelancer-crm": freelancerCrm,
  "content-calendar-studio": contentCalendar,
  "money-tracker-india": moneyTracker,
  "student-study-planner": studyPlanner,
  "coaching-institute-manager": coachingManager,
};

const categoryFallback: Record<string, string> = {
  productivity: secondBrain,
  business: freelancerCrm,
  creators: contentCalendar,
  finance: moneyTracker,
  education: studyPlanner,
};

export function templateCover(template: {
  slug: string;
  category: string;
  cover_image_url: string | null;
}) {
  if (template.cover_image_url) return template.cover_image_url;
  return covers[template.slug] ?? categoryFallback[template.category] ?? secondBrain;
}
