import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth, canAccess } from "@/lib/auth";

export const Route = createFileRoute("/_app")({
  component: Guard,
});

function Guard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  // Role-based route gate
  useEffect(() => {
    if (!user) return;
    const path = window.location.pathname;
    if (!canAccess(user.role, path)) {
      toast.error("You don't have permission to access that page.");
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }
  return <AppShell />;
}
