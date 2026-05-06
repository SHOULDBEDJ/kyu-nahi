import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SettingsContextType {
  settings: any;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from("settings").select("*").maybeSingle();
      if (error) throw error;

      if (!data) {
        // Only auto-bootstrap on the client to avoid SSR write conflicts
        if (typeof window !== "undefined") {
          const { data: newData } = await supabase
            .from("settings")
            .insert({
              farm_name: "The 16 EYES Farm House",
              accent_color: "#1a237e",
            })
            .select("*")
            .single();
          setSettings(newData);
        }
      } else {
        setSettings(data);
        if (data.accent_color && typeof window !== "undefined") {
          document.documentElement.style.setProperty("--navy", data.accent_color);
          document.documentElement.style.setProperty("--navy-hover", data.accent_color + "ee");
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Subscribe to changes
    const channel = supabase
      .channel("settings-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings" },
        (payload) => {
          setSettings(payload.new);
          if (payload.new.accent_color) {
            document.documentElement.style.setProperty("--navy", payload.new.accent_color);
            document.documentElement.style.setProperty(
              "--navy-hover",
              payload.new.accent_color + "ee",
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
