import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/templates/")({
  beforeLoad: () => {
    throw redirect({ to: "/store", search: { type: "notion_template" } });
  },
});
