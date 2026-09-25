import { createMiddleware } from "@tanstack/react-start";
import { toCustomerError } from "./customer-errors";

/**
 * Global server-function middleware: swaps infrastructure error messages for
 * customer-safe ones before they are serialised to the browser. Registered in
 * src/start.ts so every server function is covered.
 */
export const customerSafeErrors = createMiddleware({ type: "function" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    throw toCustomerError(error);
  }
});
