import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // Hands every query the server loaded to the browser, so pages hydrate with
  // the same data instead of fetching it a second time (halves the database
  // load per page view on the free tier and removes hydration mismatches).
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
};
