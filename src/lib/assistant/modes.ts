/**
 * Client-safe definitions for the three assistant experiences.
 * The server validates `mode` against ASSISTANT_MODE_IDS.
 */
export const ASSISTANT_MODES = [
  {
    id: "business",
    label: "Business help",
    short: "Business",
    tagline: "Rates, fees, address, delivery & refund answers — instantly.",
    welcome:
      "Namaste! I'm the Win Win Digital assistant. Ask me about product prices, service fees, our address & directions, payment or delivery — Hindi ya English, jo aapko aasaan lage.",
    suggestions: [
      "Software products ke rates kya hain?",
      "Website banwane ki fees kitni hai?",
      "Aapka office kahan hai? Directions bhejo",
      "Payment ke baad delivery kitni der mein milti hai?",
      "Refund policy kya hai?",
    ],
    requiresAuth: false,
  },
  {
    id: "personal",
    label: "My orders & account",
    short: "My account",
    tagline: "Your orders, payment status, downloads, licence keys and bookings.",
    welcome:
      "Hi! I can check your orders, payment status, downloads, licence keys and project bookings. Sab kuch aapke account se securely — nothing is shared with anyone else.",
    suggestions: [
      "Mere orders ka status batao",
      "Payment ho gaya hai, product kab milega?",
      "Meri licence key kaunsi hai?",
      "Meri booking ka kya status hai?",
    ],
    requiresAuth: true,
  },
  {
    id: "doubt",
    label: "Doubt solver",
    short: "Doubts",
    tagline: "Step-by-step help with study doubts, code errors and product setup.",
    welcome:
      "Doubt Assistant here 👋 Koi bhi sawaal poochho — maths, science, coding error, ya humare software ka setup. Main step-by-step samjhaunga, simple words mein.",
    suggestions: [
      "Quadratic equation kaise solve karte hain? Example do",
      "Mera React app 'undefined is not a function' de raha hai",
      "EduPanel mein fees reminder kaise set karein?",
      "Photosynthesis ko 5 lines mein samjhao",
    ],
    requiresAuth: false,
  },
] as const;

export type AssistantMode = (typeof ASSISTANT_MODES)[number];
export type AssistantModeId = AssistantMode["id"];
export const ASSISTANT_MODE_IDS = ASSISTANT_MODES.map((m) => m.id) as [AssistantModeId, ...AssistantModeId[]];

export function getMode(id: string | null | undefined): AssistantMode {
  return ASSISTANT_MODES.find((m) => m.id === id) ?? ASSISTANT_MODES[0];
}

/** Human labels for tool calls shown while the assistant is working. */
export const TOOL_LABELS: Record<string, string> = {
  get_business_info: "Looking up address & contact details",
  list_products: "Checking the store catalogue",
  get_product: "Reading product details",
  get_service_pricing: "Checking service fees",
  get_policies: "Reading delivery & refund policy",
  my_orders: "Fetching your orders",
  my_bookings: "Fetching your bookings",
  lookup_order: "Looking up the order",
};

export const ASSISTANT_STORAGE_PREFIX = "ww-assistant:v1:";
