import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/templates/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/store/$slug", params: { slug: params.slug } });
  },
});
