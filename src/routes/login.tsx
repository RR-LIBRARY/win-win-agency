import { createFileRoute, redirect } from "@tanstack/react-router";

// Old /login links land on the real sign-in page.
export const Route = createFileRoute("/login")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/auth", search: search as Record<string, string> });
  },
});
