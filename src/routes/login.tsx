import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/db";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login | 16 Eyes Farm House" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(username.trim(), password, remember);
      await logActivity("Login", "Auth", `User ${username} logged in`);
      navigate({ to: "/dashboard", replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "Invalid username or password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      {/* watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
        <div className="text-[20rem] font-black text-navy">16</div>
      </div>

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-2xl font-black text-navy shadow-md">
            16
          </div>
          <h1 className="mt-3 text-xl font-bold text-navy">16 EYES Farm House</h1>
          <p className="text-xs text-muted-foreground">Booking & Management System</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-md border border-input bg-muted px-3 py-2.5 text-base outline-none focus:border-navy"
              style={{ fontSize: 16 }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Password</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-input bg-muted px-3 py-2.5 pr-10 text-base outline-none focus:border-navy"
                style={{ fontSize: 16 }}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground"
                aria-label="Toggle password"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4"
            />
            Remember me (7 days)
          </label>

          {err && (
            <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{err}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-navy py-3 text-sm font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
            style={{ touchAction: "manipulation" }}
          >
            {busy && <Loader2 size={16} className="animate-spin" />} Login
          </button>

          <p className="text-center text-[11px] text-muted-foreground">
            Default: <code className="rounded bg-muted px-1.5 py-0.5">farmhouse@123</code> /{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">farmhouse@123</code>
          </p>
        </form>
      </div>
    </div>
  );
}
