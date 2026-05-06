import { useEffect, useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  Settings as SetIcon, 
  Clock, 
  MessageSquare,
  Database, 
  ShieldCheck,
  Search,
  Loader2,
  ShieldAlert,
  Trash2,
  Download,
  Upload,
  History,
  AlertCircle,
  Plus,
  Palette,
  Trash,
  GripVertical
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { generateFullBackup, restoreFromBackup } from "@/lib/settings-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings | 16 Eyes Farm House" }] }),
  component: SettingsPage,
});

function ControlledDialog({ trigger, title, children }: { trigger: React.ReactNode; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(false);
    document.addEventListener("close-dialog", handler);
    return () => document.removeEventListener("close-dialog", handler);
  }, []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>{children}</DialogContent>
    </Dialog>
  );
}

function SettingsPage() {
  const [slots, setSlots] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("slots");
  const [searchQuery, setSearchQuery] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [{ data: sl }, { data: log }] = await Promise.all([
        supabase.from("time_slots").select("*").order("start_time"),
        // Load templates from the hidden activity_log storage
        supabase.from("activity_log")
          .select("detail")
          .eq("module", "SETTINGS_STORAGE")
          .eq("action", "WHATSAPP_TEMPLATES")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);
      
      setSlots(sl ?? []);
      
      if (log?.detail) {
        try {
          const parsed = JSON.parse(log.detail);
          if (Array.isArray(parsed)) setTemplates(parsed);
        } catch (e) { setTemplates([]); }
      }
    } catch (error: any) {
      toast.error("Failed to load: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const saveTemplatesToHiddenVault = async (newTemplates: any[]) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("activity_log").insert({
        module: "SETTINGS_STORAGE",
        action: "WHATSAPP_TEMPLATES",
        detail: JSON.stringify(newTemplates)
      });
      
      if (error) throw error;
      
      setTemplates(newTemplates);
      toast.success("whatsapp template saved successfully");
    } catch (error: any) {
      toast.error("Vault storage failed: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTemplate = async (template: any) => {
    const newTemplate = { ...template, id: crypto.randomUUID() };
    const newTemplates = [...templates, newTemplate];
    await saveTemplatesToHiddenVault(newTemplates);
    document.dispatchEvent(new CustomEvent("close-dialog"));
  };

  const handleUpdateTemplate = async (id: string, patch: any) => {
    const newTemplates = templates.map(t => t.id === id ? { ...t, ...patch } : t);
    await saveTemplatesToHiddenVault(newTemplates);
    document.dispatchEvent(new CustomEvent("close-dialog"));
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const newTemplates = templates.filter(t => t.id !== id);
    await saveTemplatesToHiddenVault(newTemplates);
  };

  // Other handlers (Simplified)
  const handleCreateBackup = async () => {
    setSaving(true);
    try {
      const backup = await generateFullBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast.success("Backup created");
    } catch (error: any) { toast.error(error.message); } finally { setSaving(false); }
  };

  const handleRestore = async (file: File) => {
    setSaving(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          await restoreFromBackup(json);
          toast.success("Restore complete");
          loadSettings();
        } catch (error: any) { toast.error(error.message); }
      };
      reader.readAsText(file);
    } finally { setSaving(false); }
  };

  const handleAddSlot = async (slot: any) => {
    try {
      const { error } = await supabase.from("time_slots").insert(slot);
      if (error) throw error;
      toast.success("Time slot saved successfully");
      loadSettings();
      document.dispatchEvent(new CustomEvent("close-dialog"));
    } catch (error: any) { toast.error(error.message); }
  };

  const handleUpdateSlot = async (id: string, patch: any) => {
    try {
      const { error } = await supabase.from("time_slots").update(patch).eq("id", id);
      if (error) throw error;
      toast.success("Time slot saved successfully");
      loadSettings();
      document.dispatchEvent(new CustomEvent("close-dialog"));
    } catch (error: any) { toast.error(error.message); }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const { error } = await supabase.from("time_slots").delete().eq("id", id);
      if (error) throw error;
      toast.success("Slot deleted");
      loadSettings();
    } catch (error: any) { toast.error(error.message); }
  };

  const handlePartialReset = async (category: "bookings" | "incomes" | "expenses" | "income_types" | "expense_types") => {
    const confirmation = prompt(`Type "DELETE ${category.toUpperCase()}" to confirm clearing all ${category}:`);
    if (confirmation !== `DELETE ${category.toUpperCase()}`) {
      if (confirmation !== null) toast.error("Confirmation text did not match.");
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase.from(category).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success(`All ${category} deleted successfully`);
      loadSettings();
    } catch (error: any) { 
      toast.error(error.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleFullReset = async () => {
    const confirmation = prompt(`Type "RESET FACTORY SETTINGS" to confirm wiping EVERYTHING (Bookings, Financials, Categories, Slots):`);
    if (confirmation !== "RESET FACTORY SETTINGS") {
      if (confirmation !== null) toast.error("Confirmation text did not match.");
      return;
    }
    
    setSaving(true);
    try {
      await Promise.all([
        supabase.from("bookings").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("incomes").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("expenses").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("income_types").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("expense_types").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("time_slots").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("activity_log").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      ]);
      toast.success("System has been reset to factory defaults");
      loadSettings();
    } catch (error: any) { 
      toast.error("Reset failed: " + error.message); 
    } finally { 
      setSaving(false); 
    }
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy" /></div>;

  const sections = [
    { id: "slots", label: "Time Slots", icon: Clock },
    { id: "whatsapp", label: "WhatsApp Templates", icon: MessageSquare },
    { id: "data", label: "Data Management", icon: Database },
  ];

  const filteredSections = sections.filter(s => 
    s.label.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader icon={SetIcon} title="Settings" subtitle="Manage farmhouse operations and templates" />
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search settings..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit sticky top-20 hidden lg:block">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-2">
              {filteredSections.map((s) => (
                <button key={s.id} onClick={() => setActiveTab(s.id)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent", activeTab === s.id ? "bg-accent text-navy" : "text-muted-foreground")}>
                  <s.icon className={cn("h-4 w-4", activeTab === s.id ? "text-navy" : "text-muted-foreground")} />
                  {s.label}
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <div className="lg:hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <ScrollArea className="w-full" orientation="horizontal">
              <TabsList className="flex w-max h-auto p-1 bg-muted/50">
                {filteredSections.map(s => (
                  <TabsTrigger key={s.id} value={s.id} className="text-[10px] py-2 px-3">
                    <s.icon className="h-3 w-3 mb-1" />
                    <span className="whitespace-nowrap">{s.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </Tabs>
        </div>

        <div className="flex flex-col gap-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="slots" className="mt-0 outline-none">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg">Time Slot Management</CardTitle>
                    <CardDescription>Configure the booking sessions available for customers.</CardDescription>
                  </div>
                  <ControlledDialog 
                    trigger={<Button size="sm" className="bg-navy"><Plus className="mr-2 h-4 w-4" /> Add Slot</Button>}
                    title="Add New Time Slot"
                  >
                    <SlotForm onSubmit={handleAddSlot} />
                  </ControlledDialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {slots.map((sl) => (
                      <div key={sl.id} className="group flex items-center gap-4 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                        <div className="h-8 w-8 rounded-md flex-shrink-0 border" style={{ backgroundColor: sl.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold truncate">{sl.name}</span>
                            {sl.is_default && <Badge variant="secondary" className="text-[10px] h-4">Default</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{sl.start_time} – {sl.end_time} {sl.is_overnight && <span className="ml-2 text-warning font-medium">Overnight</span>}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ControlledDialog
                            trigger={<Button variant="ghost" size="icon" className="h-8 w-8"><Palette className="h-4 w-4" /></Button>}
                            title={`Edit Slot: ${sl.name}`}
                          >
                            <SlotForm slot={sl} onSubmit={(p) => handleUpdateSlot(sl.id, p)} />
                          </ControlledDialog>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSlot(sl.id)}><Trash className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-0 outline-none">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg">WhatsApp Templates</CardTitle>
                    <CardDescription>Create and manage templates for customer messages.</CardDescription>
                  </div>
                  <ControlledDialog 
                    trigger={<Button size="sm" className="bg-navy"><Plus className="mr-2 h-4 w-4" /> Add Template</Button>}
                    title="Add New Template"
                  >
                    <TemplateForm onSubmit={handleAddTemplate} />
                  </ControlledDialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {templates.map((t) => (
                      <Card key={t.id} className="group overflow-hidden border-border transition-all hover:border-navy/30 hover:shadow-md">
                        <CardHeader className="pb-2 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <CardTitle className="text-sm font-bold text-navy">{t.name}</CardTitle>
                              <CardDescription className="text-[10px]">{t.description}</CardDescription>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ControlledDialog
                                trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><History className="h-3.5 w-3.5" /></Button>}
                                title="Edit Template"
                              >
                                <TemplateForm template={t} onSubmit={(p) => handleUpdateTemplate(t.id, p)} />
                              </ControlledDialog>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTemplate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-3">
                          <div className="rounded bg-muted/40 p-3 text-sm font-mono text-foreground whitespace-pre-wrap leading-relaxed">
                            {t.content}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {templates.length === 0 && (
                      <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/30" />
                        <p className="mt-2 text-sm text-muted-foreground">No templates found. Add your first template to get started.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data" className="mt-0 outline-none">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Download className="h-5 w-5 text-navy" /> Backup Data</CardTitle></CardHeader>
                  <CardContent><Button className="w-full bg-navy" onClick={handleCreateBackup} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Create JSON Backup</Button></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Upload className="h-5 w-5 text-navy" /> Restore Data</CardTitle></CardHeader>
                  <CardContent><label className="rounded-lg border-2 border-dashed p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors block"><Upload className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 text-xs text-muted-foreground">Click to upload .json backup</p><input type="file" className="hidden" accept=".json" onChange={(e) => e.target.files?.[0] && handleRestore(e.target.files[0])} /></label></CardContent>
                </Card>
                <Card className="md:col-span-2 border-destructive/20 bg-destructive/5">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-destructive"><Trash2 className="h-5 w-5" /> Delete Data (Caution)</CardTitle><CardDescription>Carefully select the category you want to wipe. This cannot be undone.</CardDescription></CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={() => handlePartialReset("bookings")}>Delete All Bookings</Button>
                    <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={() => handlePartialReset("incomes")}>Delete All Income Records</Button>
                    <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={() => handlePartialReset("expenses")}>Delete All Expense Records</Button>
                    <div className="pt-4 border-t border-destructive/20 mt-4">
                      <p className="text-xs font-bold text-destructive mb-3 uppercase tracking-wider">Danger Zone: Categories</p>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={() => handlePartialReset("income_types")}>Reset Income Categories</Button>
                        <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={() => handlePartialReset("expense_types")}>Reset Expense Categories</Button>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-destructive/20 mt-4 col-span-full">
                      <p className="text-xs font-bold text-destructive mb-3 uppercase tracking-wider">Danger Zone: Full System</p>
                      <Button variant="destructive" className="w-full sm:w-auto bg-destructive text-white font-bold" onClick={handleFullReset}>
                        <ShieldAlert className="mr-2 h-4 w-4" /> Factory Reset (Wipe All System Data)
                      </Button>
                      <p className="mt-2 text-[10px] text-muted-foreground italic">Warning: This will delete every record except your user accounts and farmhouse profile.</p>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-destructive/10 border-t border-destructive/10 px-6 py-3 mt-2">
                    <p className="text-xs text-destructive-foreground font-medium">To protect your data, each action requires double confirmation.</p>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function SlotForm({ slot, onSubmit }: { slot?: any; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState(slot || { name: "", start_time: "09:00", end_time: "18:00", color: "#3B82F6", is_overnight: false });
  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2"><Label>Slot Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Day Shift" /></div>
      <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Start Time</Label><Input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} /></div><div className="space-y-2"><Label>End Time</Label><Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} /></div></div>
      <div className="flex items-center justify-between"><div><Label>Overnight Slot</Label></div><Switch checked={formData.is_overnight} onCheckedChange={(v) => setFormData({ ...formData, is_overnight: v })} /></div>
      <div className="space-y-2"><Label>Color</Label><div className="flex gap-2"><Input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="h-10 w-20 p-1" /><Input value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} /></div></div>
      <Button className="w-full bg-navy" onClick={() => onSubmit(formData)}>{slot ? "Update" : "Create"} Slot</Button>
    </div>
  );
}

function TemplateForm({ template, onSubmit }: { template?: any; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState(template || { name: "", content: "", description: "" });
  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Template Name</Label>
        <Input 
          value={formData.name} 
          onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          placeholder="e.g. Booking Confirmation" 
        />
        <p className="text-[10px] text-muted-foreground italic">Tip: Use "Booking Confirmation" to enable auto-send in bookings.</p>
      </div>
      <div className="space-y-2"><Label>Description</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="When should this be sent?" /></div>
      <div className="space-y-2">
        <Label>Message Content</Label>
        <Textarea rows={6} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="Paste your ChatGPT template here..." />
      </div>
      <Button className="w-full bg-navy" onClick={() => onSubmit(formData)}>{template ? "Update" : "Create"} Template</Button>
    </div>
  );
}
