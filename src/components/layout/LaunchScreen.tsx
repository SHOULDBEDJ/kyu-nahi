import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { initials, avatarColor } from "@/lib/format";

export function LaunchScreen({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [show, setShow] = useState(true);
  const [exit, setExit] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Small delay to let the user see the splash screen even if loading is instant
      const timer = setTimeout(() => {
        setExit(true);
        setTimeout(() => setShow(false), 500); // Wait for fade animation
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (!show) return <>{children}</>;

  return (
    <>
      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-navy transition-all duration-700 ${exit ? "opacity-0 scale-105 pointer-events-none" : "opacity-100"}`}
      >
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000">
          {/* Logo / Avatar Circle */}
          <div className="relative mb-8">
            <div
              className={`h-28 w-28 overflow-hidden rounded-full border-4 border-white/20 shadow-2xl ring-8 ring-white/5 transition-all duration-500 ${!user?.avatarUrl ? "bg-gold" : ""}`}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-navy">
                  {user ? initials(user.fullName) : "16"}
                </div>
              )}
            </div>

            {/* Pulsing Ring */}
            <div className="absolute -inset-2 animate-ping rounded-full border border-gold/30 opacity-20" />
          </div>

          {/* Welcome Text */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {user ? `Welcome back, ${user.fullName.split(" ")[0]}` : "16 Eyes Farm House"}
            </h1>
            <p className="text-sm font-medium text-white/50 uppercase tracking-[0.2em]">
              Management Suite
            </p>
          </div>

          {/* Loading Indicator */}
          <div className="absolute bottom-12 flex flex-col items-center gap-3">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 animate-loading-bar bg-gold shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
            </div>
            <span className="text-[10px] font-bold text-gold/60 uppercase tracking-widest">
              Initializing...
            </span>
          </div>
        </div>
      </div>
      <div className={exit ? "animate-in fade-in duration-700" : "invisible"}>{children}</div>
    </>
  );
}
