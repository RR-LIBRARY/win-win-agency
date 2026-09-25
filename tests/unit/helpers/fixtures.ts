import type { Row } from "./fake-supabase";

export const TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";
export const ORDER_ID = "22222222-2222-4222-8222-222222222222";
export const USER_ID = "33333333-3333-4333-8333-333333333333";

export function makeTemplate(overrides: Row = {}): Row {
  return {
    id: TEMPLATE_ID,
    slug: "gstbill-invoice-app",
    title: "GSTBill — Invoice & Quotation App",
    price: 1499,
    compare_at_price: 2499,
    tiers: [],
    is_published: true,
    delivery_type: "license",
    product_type: "software",
    version: "2.1.0",
    sales_count: 10,
    ...overrides,
  };
}

export function makeOrder(overrides: Row = {}): Row {
  return {
    id: ORDER_ID,
    reference: "WWT-ABCDE123",
    access_token: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    user_id: USER_ID,
    template_id: TEMPLATE_ID,
    template_title: "GSTBill — Invoice & Quotation App",
    tier_id: "",
    tier_name: "",
    amount: 1499,
    amount_paid: 0,
    discount: 0,
    coupon_code: "",
    currency: "INR",
    status: "pending_payment",
    payment_provider: "razorpay",
    payment_method: "",
    payment_reference: "",
    razorpay_order_id: "order_RZP123",
    razorpay_payment_id: null,
    invoice_number: null,
    paid_at: null,
    delivered_at: null,
    refunded_at: null,
    refund_id: null,
    failure_reason: "",
    admin_note: "",
    note: "",
    buyer_name: "Asha Verma",
    buyer_email: "asha@example.com",
    buyer_phone: "9876543210",
    buyer_company: "",
    buyer_gstin: "",
    created_at: "2026-09-25T05:00:00.000Z",
    updated_at: "2026-09-25T05:00:00.000Z",
    ...overrides,
  };
}

export function makeDeliverable(overrides: Row = {}): Row {
  return {
    template_id: TEMPLATE_ID,
    duplicate_url: "",
    guide_url: "",
    access_url: "",
    download_url: "https://files.example.com/gstbill.zip",
    download_path: "",
    issue_license: true,
    license_max_activations: 2,
    notes: "",
    updated_at: "2026-09-25T05:00:00.000Z",
    ...overrides,
  };
}

export function makeCoupon(overrides: Row = {}): Row {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    code: "LAUNCH20",
    kind: "percent",
    value: 20,
    is_active: true,
    max_uses: 100,
    used_count: 3,
    expires_at: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}
