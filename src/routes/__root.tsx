import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { SettingsProvider } from "@/lib/settings-context";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "16 Eyes Farm House — Management System" },
      { name: "description", content: "Bookings, income, expenses & operations for 16 Eyes Farm House." },
      { name: "theme-color", content: "#1a237e" },
      { property: "og:title", content: "16 Eyes Farm House — Management System" },
      { name: "twitter:title", content: "16 Eyes Farm House — Management System" },
      { property: "og:description", content: "Bookings, income, expenses & operations for 16 Eyes Farm House." },
      { name: "twitter:description", content: "Bookings, income, expenses & operations for 16 Eyes Farm House." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/89c9d554-f653-40d4-b6e1-a0d8ad6840fc" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/89c9d554-f653-40d4-b6e1-a0d8ad6840fc" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: () => <SettingsProvider><AuthProvider><Outlet /></AuthProvider></SettingsProvider>,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <svg className="mx-auto mb-6 text-muted-foreground/40" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" /><path d="M9 9l6 6M15 9l-6 6" />
        </svg>
        <h1 className="text-7xl font-bold text-gold">404</h1>
        <p className="mt-3 text-base text-muted-foreground">Page not found</p>
        <a href="/dashboard" className="mt-6 inline-block rounded-md bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-hover">Go to Dashboard</a>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
        <Scripts />
      </body>
    </html>
  );
}
