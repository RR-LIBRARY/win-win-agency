import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Legacy URL space — every child redirects into /store. */
export const Route = createFileRoute("/templates")({
  component: () => <Outlet />,
});
