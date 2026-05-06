import { useEffect, useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { User as UserIcon, Camera, Eye, EyeOff, Loader2, Save, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/db";
import { initials, avatarColor, passwordStrength, formatMonthYear } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile | 16 Eyes Farm House" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, refresh, logout } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [memberSince, setMemberSince] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setUsername(user.username);

      if (user.isVaultUser) {
        supabase
          .from("activity_log")
          .select("created_at")
          .eq("module", "INTERNAL_AUTH")
          .eq("action", "USER_DATA")
          .like("detail", `%${user.id}%`)
          .maybeSingle()
          .then(({ data }) => data && setMemberSince(formatMonthYear(data.created_at)));
      } else {
        supabase
          .from("profiles")
          .select("created_at")
          .eq("id", user.id)
          .maybeSingle()
          .then(({ data }) => data && setMemberSince(formatMonthYear(data.created_at)));
      }
    }
  }, [user]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      if (user.isVaultUser) {
        // Update vault user in activity_log
        const { data: log } = await supabase
          .from("activity_log")
          .select("id, detail")
          .eq("module", "INTERNAL_AUTH")
          .eq("action", "USER_DATA")
          .like("detail", `%${user.id}%`)
          .maybeSingle();

        if (log) {
          const detail = JSON.parse(log.detail);
          detail.avatarUrl = publicUrl;
          const { error: updateError } = await supabase
            .from("activity_log")
            .update({ detail: JSON.stringify(detail) })
            .eq("id", log.id);
          if (updateError) throw updateError;
        }
      } else {
        // Update standard user in profiles
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("id", user.id);
        if (updateError) throw updateError;
      }

      await refresh();
      toast.success("Profile picture updated successfully");
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const saveAccount = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (user.isVaultUser) {
        const { data: log } = await supabase
          .from("activity_log")
          .select("id, detail")
          .eq("module", "INTERNAL_AUTH")
          .eq("action", "USER_DATA")
          .like("detail", `%${user.id}%`)
          .maybeSingle();

        if (log) {
          const detail = JSON.parse(log.detail);
          detail.fullName = fullName;
          detail.username = username;
          const { error } = await supabase
            .from("activity_log")
            .update({ detail: JSON.stringify(detail) })
            .eq("id", log.id);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            username,
          })
          .eq("id", user.id);
        if (error) throw error;
      }

      await logActivity("Edit", "Profile", "Updated account details");
      await refresh();
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async () => {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    setSaving(true);
    try {
      if (user.isVaultUser) {
        const { data: log } = await supabase
          .from("activity_log")
          .select("id, detail")
          .eq("module", "INTERNAL_AUTH")
          .eq("action", "USER_DATA")
          .like("detail", `%${user.id}%`)
          .maybeSingle();

        if (log) {
          const detail = JSON.parse(log.detail);
          detail.password = pw;
          const { error } = await supabase
            .from("activity_log")
            .update({ detail: JSON.stringify(detail) })
            .eq("id", log.id);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error) throw error;
      }

      await logActivity("Password Change", "Profile", "Password updated");
      toast.success("Password updated successfully. Logging out...");
      setTimeout(async () => {
        await logout();
        window.location.href = "/login";
      }, 1500);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;
  const strength = passwordStrength(pw);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        icon={UserIcon}
        title="My Profile"
        subtitle="Update your identity and account security"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <div
                  className={`h-32 w-32 overflow-hidden rounded-full border-4 border-background ring-2 ring-gold/20 shadow-xl transition-all ${!user.avatarUrl ? avatarColor(user.username) : ""}`}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white">
                      {initials(user.fullName)}
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-navy text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
                  title="Change profile picture"
                >
                  <Camera size={18} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="mt-4">
                <h2 className="text-xl font-bold text-navy">{user.fullName}</h2>
                <div className="mt-1">
                  <span className="rounded-full bg-gold/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold border border-gold/20">
                    {user.role}
                  </span>
                </div>
                {memberSince && (
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    Member since {memberSince}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wider">
              <UserIcon size={16} className="text-gold" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Display Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Login ID"
                />
              </div>
            </div>
            <div className="mt-6">
              <Button
                onClick={saveAccount}
                className="w-full bg-navy hover:bg-navy-hover"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Profile Changes
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm border-gold/20">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wider">
              <KeyRound size={16} className="text-gold" /> Security & Password
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pw && (
                  <div className="space-y-1.5 pt-1">
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all duration-500 ${strength.color}`}
                        style={{ width: `${strength.pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Password Strength: <span className="font-bold">{strength.label}</span>
                    </p>
                  </div>
                )}
              </div>
              <Button
                onClick={updatePassword}
                disabled={pw.length < 8 || saving}
                className="w-full bg-gold hover:bg-gold-hover text-navy font-bold"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                Update Account Password
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
