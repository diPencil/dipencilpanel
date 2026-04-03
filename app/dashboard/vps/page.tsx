'use client';

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import VpsCard from "@/components/vps/vps-card";
import CreateVpsModal from "@/components/vps/create-vps-modal";
import { toast } from "sonner";
import { useInvoiceData } from "@/context/InvoiceContext";
import { 
  Zap, 
  Cpu, 
  HardDrive, 
  CheckCircle2, 
  Activity, 
  Server, 
  Search, 
  Plus, 
  Filter, 
  History,
  Terminal,
  ShieldCheck,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VPS, VPSPlan } from "@/lib/types";

type DisplayStatus = "Active" | "Stopped" | "Suspended" | "Expired";

function parseNoteValue(notes: string | undefined, key: string): string {
  if (!notes) return "";
  const match = notes.match(new RegExp(`${key}:\\s*([^;]+)`));
  return match ? match[1].trim() : "";
}

function vpsToCardModel(v: VPS, clientName: string) {
  let status: DisplayStatus = "Active";
  if (v.status === "expired") status = "Expired";
  else if (v.status === "suspended") status = "Suspended";
  else if (v.status === "active" || v.status === "expiring") status = "Active";

  const ipMatch = v.notes?.match(/IP:\s*([^;]+)/);
  const ip = ipMatch ? ipMatch[1].trim() : "—";

  return {
    id: v.id,
    name: v.name,
    client: clientName,
    domain: parseNoteValue(v.notes, "Target") || undefined,
    panel: parseNoteValue(v.notes, "Panel") || undefined,
    ip,
    status,
    plan: v.planName,
    os: parseNoteValue(v.notes, "OS"),
    cpu: v.cpu,
    ram: v.ram,
    storage: v.storage,
    expiresAt: v.renewalDate,
  };
}

export default function VpsPage() {
  const { vpsPlans = [], vps, clients, addVPS, deleteVPS, updateVPS, currentCompany } = useInvoiceData();
  const [filter, setFilter] = useState<"all" | DisplayStatus>("all");
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [selectedPlanName, setSelectedPlanName] = useState<string | undefined>(undefined);

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    clients.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    return vps.filter((v) => {
      const card = vpsToCardModel(v, clientNameById.get(v.clientId) ?? "—");
      if (filter !== "all" && card.status !== filter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        (card.client || "").toLowerCase().includes(q) ||
        (card.ip || "").includes(q)
      );
    });
  }, [vps, filter, query, clientNameById]);

  const displayRows = useMemo(
    () => filtered.map((v) => vpsToCardModel(v, clientNameById.get(v.clientId) ?? "—")),
    [filtered, clientNameById],
  );

  const stats = useMemo(() => {
    const activeVps = vps.filter(v => v.status === 'active' || v.status === 'expiring');
    const totalCpu = activeVps.reduce((acc, v) => acc + (v.cpu || 0), 0);
    const totalRam = activeVps.reduce((acc, v) => acc + (v.ram || 0), 0);
    const healthyPercentage = vps.length > 0 ? Math.round((activeVps.length / vps.length) * 100) : 100;

    return {
      total: vps.length,
      active: activeVps.length,
      suspended: vps.filter(v => v.status === 'suspended').length,
      health: healthyPercentage,
      cpu: totalCpu,
      ram: totalRam
    };
  }, [vps]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">VPS Infrastructure</h1>
          <p className="text-muted-foreground mt-1">High-performance virtual private servers with NVMe storage.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl border-border/50 gap-2 h-11" onClick={() => setShowPlans(!showPlans)}>
            <Zap className={cn("h-4 w-4", showPlans ? "text-primary" : "text-amber-500")} />
            {showPlans ? "Hide Fleet" : "Plans & Deployment"}
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-11">
            <Plus className="h-4 w-4" /> Deploy Instance
          </Button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Instances', value: stats.total, icon: Server, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Operational', value: stats.active, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Suspended', value: stats.suspended, icon: History, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Fleet Health', value: `${stats.health}%`, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <Card key={i} className="p-4 border-none shadow-sm flex items-center gap-4">
             <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
             </div>
             <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-bold mt-0.5">{stat.value}</p>
             </div>
          </Card>
        ))}
      </div>

      {/* Deployment Fleet (Plans) */}
      {showPlans && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500 border-b border-border/50 pb-10">
          {vpsPlans.map((plan: VPSPlan) => (
            <Card
              key={plan.id}
              className={cn(
                "p-6 border-none shadow-lg group hover:scale-[1.02] transition-all",
                plan.isPopular ? "ring-2 ring-primary/20 bg-primary/2" : ""
              )}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">PRO INSTANCE</p>
                   <h3 className="text-xl font-bold">{plan.name}</h3>
                </div>
                {plan.isPopular && <Badge className="bg-primary hover:bg-primary text-[10px] font-black uppercase tracking-tighter">BEST SELLER</Badge>}
              </div>

              <div className="text-4xl font-black mb-8 space-x-1">
                 <span>${plan.price}</span>
                 <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">/mo</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-8">
                 <div className="bg-muted/40 p-3 rounded-xl border border-border/10">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5"><Cpu className="h-2.5 w-2.5" /> CPU Core</p>
                    <p className="font-bold text-sm">{plan.cpu} vCPU</p>
                 </div>
                 <div className="bg-muted/40 p-3 rounded-xl border border-border/10">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5"><Terminal className="h-2.5 w-2.5" /> Physical RAM</p>
                    <p className="font-bold text-sm">{plan.ram} GB</p>
                 </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature: string, i: number) => (
                  <li key={i} className="text-xs font-semibold flex items-center gap-2.5 text-muted-foreground">
                    <CheckCircle2 size={14} className="text-primary/60 shrink-0" /> {feature}
                  </li>
                ))}
              </ul>

              <Button onClick={() => { setSelectedPlanName(plan.name); setIsCreateOpen(true); }} className="w-full h-11 rounded-xl shadow-md">
                Deploy {plan.name}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-card/60 backdrop-blur-sm p-4 rounded-2xl border border-border/50 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
           <Terminal className="h-20 w-20" />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Identity, Client or IP segment..." 
            className="pl-10 h-11 rounded-xl bg-background border-border/30 focus:ring-primary/20 text-sm font-medium" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           <div className="flex bg-muted/40 p-1 rounded-xl border border-border/10 items-center">
              {(['all', 'Active', 'Suspended', 'Expired'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                    filter === s ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:bg-card/50"
                  )}
                >
                  {s}
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* VPS List */}
      <div className="space-y-4">
        {displayRows.length > 0 ? (
          displayRows.map((card) => (
            <VpsCard
              key={card.id}
              vps={card}
              onDelete={() => {
                deleteVPS(card.id);
                toast.success("VPS instance decommissioned.");
              }}
              onAction={(a) => {
                if (a === "restart") {
                  toast.success(`Restart signal sent to ${card.name}`);
                  return;
                }
                const newStatus = a === "stop" ? "suspended" : "active";
                updateVPS(card.id, { status: newStatus });
                toast.success(`${a === "stop" ? "Shutting down" : "Booting up"} ${card.name}`);
              }}
            />
          ))
        ) : (
          <div className="p-20 text-center bg-card border-border/50 border rounded-3xl flex flex-col items-center justify-center space-y-4">
             <div className="h-16 w-16 bg-muted/40 rounded-2xl flex items-center justify-center text-muted-foreground/30">
                <Server className="h-8 w-8" />
             </div>
             <div className="space-y-1">
                <h3 className="text-xl font-bold">No Active Nodes</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">No VPS instances were found matching your current filters or deployment criteria.</p>
             </div>
             <Button variant="outline" className="rounded-xl h-10 px-8" onClick={() => { setQuery(""); setFilter("all"); }}>Reset Fleet View</Button>
          </div>
        )}
      </div>

      <CreateVpsModal
        open={isCreateOpen}
        onOpenChange={(v) => {
          setIsCreateOpen(v);
          if (!v) setSelectedPlanName(undefined);
        }}
        clients={clients}
        vpsPlans={vpsPlans}
        initialPlan={selectedPlanName}
        onCreate={(payload) => {
          addVPS({
            name: payload.name,
            clientId: payload.clientId,
            planName: payload.planName,
            cpu: payload.cpu,
            ram: payload.ram,
            storage: payload.storage,
            price: payload.price,
            billingCycle: payload.billingCycle,
            status: "active",
            companyId: currentCompany.id,
            notes: `Location: ${payload.location}; OS: ${payload.os}${payload.ip ? `; IP: ${payload.ip}` : ""}`,
          });
          toast.success("Success! Instance deployment initiated.");
        }}
      />
    </div>
  );
}
