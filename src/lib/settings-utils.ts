import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a file to Supabase storage and returns the public URL.
 * @param file The file object to upload
 * @param bucket The storage bucket name
 * @param path The path inside the bucket
 */
export const uploadBrandingAsset = async (file: File, path: string): Promise<string> => {
  const bucket = "branding";
  
  // 1. Upload the file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) throw error;

  // 2. Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
};

/**
 * Generates a full system backup as a JSON object.
 */
export const generateFullBackup = async () => {
  const tables = ["settings", "time_slots", "bookings", "incomes", "expenses", "income_types", "expense_types", "profiles", "user_roles", "activity_log"];
  
  const backup: any = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    data: {}
  };

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.error(`Error backing up table ${table}:`, error);
      continue;
    }
    backup.data[table] = data;
  }

  return backup;
};

/**
 * Restores the system from a backup JSON.
 * WARNING: This will replace data in the targeted tables.
 */
export const restoreFromBackup = async (backupJson: any) => {
  if (!backupJson.data || !backupJson.version) {
    throw new Error("Invalid backup file format");
  }

  const tables = Object.keys(backupJson.data);
  const skipTables = ["activity_log", "backup_history", "user_roles", "profiles"];
  const results = { restored: [] as string[], skipped: [] as string[], errors: [] as string[] };
  
  for (const table of tables) {
    if (skipTables.includes(table)) {
      results.skipped.push(table);
      continue;
    }
    
    const { error } = await supabase.from(table).upsert(backupJson.data[table], { onConflict: "id" });
    if (error) {
      results.errors.push(`${table}: ${error.message}`);
    } else {
      results.restored.push(table);
    }
  }

  return results;
};
