import { createFileRoute, redirect } from "@tanstack/react-router";

// Default landing → login (auth guard in /_app handles authenticated bypass)
export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/login" }); },
});
