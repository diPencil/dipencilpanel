"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Client, VPSPlan } from "@/lib/types";

const PLAN_SPECS_FALLBACK: Record<string, { cpu: number; ram: number; storage: number }> = {
  "KVM 1": { cpu: 1, ram: 4, storage: 50 },
  "KVM 2": { cpu: 2, ram: 8, storage: 100 },
  "KVM 4": { cpu: 4, ram: 16, storage: 200 },
  "KVM 8": { cpu: 8, ram: 32, storage: 400 },
};

export type VpsCreatePayload = {
  name: string;
  clientId: string;
  planName: string;
  location: string;
  os: string;
  ip: string;
  cpu: number;
  ram: number;
  storage: number;
  price: number;
  billingCycle: "monthly" | "yearly";
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: VpsCreatePayload) => void;
  clients: Client[];
  vpsPlans: VPSPlan[];
  initialPlan?: string;
};

function monthlyFromPlan(planName: string, plans: VPSPlan[]): number {
  const p = plans.find((x) => x.name === planName);
  return p?.price ?? 0;
}

function priceForCycle(monthly: number, cycle: "monthly" | "yearly"): number {
  if (cycle === "monthly") return Math.round(monthly * 100) / 100;
  return Math.round(monthly * 10 * 100) / 100;
}

function specsForPlan(planName: string, plans: VPSPlan[]) {
  const p = plans.find((x) => x.name === planName);
  if (p) return { cpu: p.cpu, ram: p.ram, storage: p.storage };
  return PLAN_SPECS_FALLBACK[planName] ?? { cpu: 1, ram: 4, storage: 50 };
}

export default function CreateVpsModal({
  open,
  onOpenChange,
  onCreate,
  clients,
  vpsPlans,
  initialPlan,
}: Props) {
  const planOptions = useMemo(() => {
    if (vpsPlans.length > 0) return vpsPlans.map((p) => p.name);
    return Object.keys(PLAN_SPECS_FALLBACK);
  }, [vpsPlans]);

  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState(initialPlan || planOptions[0] || "KVM 1");
  const [location, setLocation] = useState("Europe");
  const [os, setOs] = useState("Ubuntu 22.04");
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [ip, setIp] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [priceInput, setPriceInput] = useState("");

  const [cpu, setCpu] = useState(1);
  const [ram, setRam] = useState(4);
  const [storage, setStorage] = useState(50);

  const applyPlan = (planName: string, cycle: "monthly" | "yearly" = billingCycle) => {
    const s = specsForPlan(planName, vpsPlans);
    setCpu(s.cpu);
    setRam(s.ram);
    setStorage(s.storage);
    const m = monthlyFromPlan(planName, vpsPlans);
    setPriceInput(String(priceForCycle(m, cycle)));
  };

  useEffect(() => {
    if (!open) return;
    const next = initialPlan && planOptions.includes(initialPlan) ? initialPlan : planOptions[0] || "KVM 1";
    setPlan(next);
    const s = specsForPlan(next, vpsPlans);
    setCpu(s.cpu);
    setRam(s.ram);
    setStorage(s.storage);
    const m = monthlyFromPlan(next, vpsPlans);
    setBillingCycle("monthly");
    setPriceInput(String(priceForCycle(m, "monthly")));
  }, [open, initialPlan, vpsPlans, planOptions]);

  function reset() {
    setStep(1);
    const defaultPlan = initialPlan && planOptions.includes(initialPlan) ? initialPlan : planOptions[0] || "KVM 1";
    setPlan(defaultPlan);
    setLocation("Europe");
    setOs("Ubuntu 22.04");
    setName("");
    setClientId("");
    setIp("");
    setBillingCycle("monthly");
    applyPlan(defaultPlan, "monthly");
  }

  function handleConfirm() {
    const price = parseFloat(priceInput.replace(",", "."));
    if (!clientId || !name.trim()) return;
    if (Number.isNaN(price) || price < 0) return;

    onCreate({
      name: name.trim(),
      clientId,
      planName: plan,
      location,
      os,
      ip: ip.trim(),
      cpu,
      ram,
      storage,
      price,
      billingCycle,
    });
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Create VPS</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {step === 1 && (
            <div>
              <Label>Plan</Label>
              <Select
                value={plan}
                onValueChange={(v) => {
                  setPlan(v);
                  const s = specsForPlan(v, vpsPlans);
                  setCpu(s.cpu);
                  setRam(s.ram);
                  setStorage(s.storage);
                  const m = monthlyFromPlan(v, vpsPlans);
                  setPriceInput(String(priceForCycle(m, billingCycle)));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {planOptions.map((nameOpt) => {
                    const p = vpsPlans.find((x) => x.name === nameOpt);
                    const label = p
                      ? `${p.name} — ${p.cpu} vCPU / ${p.ram}GB RAM / ${p.storage}GB — $${p.price}/mo`
                      : `${nameOpt} (configure plans in VPS → Plans for pricing)`;
                    return (
                      <SelectItem key={nameOpt} value={nameOpt}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                السعر الافتراضي يأتي من خطة VPS؛ يمكنك تعديله لاحقًا لكل عميل في خطوة الفوترة.
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <Label>Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe">Europe</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Asia">Asia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 3 && (
            <div>
              <Label>OS</Label>
              <Tabs defaultValue="plain" className="mt-2">
                <TabsList>
                  <TabsTrigger value="plain">Plain OS</TabsTrigger>
                  <TabsTrigger value="panel">OS With Panel</TabsTrigger>
                  <TabsTrigger value="app">Application</TabsTrigger>
                </TabsList>

                <TabsContent value="plain">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {["Ubuntu 22.04", "Debian 12", "AlmaLinux 8", "CentOS 7"].map((item) => (
                      <Card
                        key={item}
                        className={cn("p-3 cursor-pointer", os === item ? "ring-2 ring-primary" : "hover:shadow")}
                        onClick={() => setOs(item)}
                      >
                        <div className="font-medium">{item}</div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="panel">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {[
                      "cPanel (CentOS/AlmaLinux)",
                      "Plesk (Ubuntu/Debian)",
                      "HestiaCP (Ubuntu)",
                      "DirectAdmin (CentOS/AlmaLinux)",
                    ].map((item) => (
                      <Card
                        key={item}
                        className={cn("p-3 cursor-pointer", os === item ? "ring-2 ring-primary" : "hover:shadow")}
                        onClick={() => setOs(item)}
                      >
                        <div className="font-medium">{item}</div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="app">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {["Docker + Ubuntu", "WordPress (LAMP)", "Node.js App (Ubuntu)", "Webmin (Ubuntu)"].map((item) => (
                      <Card
                        key={item}
                        className={cn("p-3 cursor-pointer", os === item ? "ring-2 ring-primary" : "hover:shadow")}
                        onClick={() => setOs(item)}
                      >
                        <div className="font-medium">{item}</div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
              <div className="mt-3 text-sm text-muted-foreground">
                Selected: <span className="font-medium">{os}</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 gap-2">
              <Label>Assign to client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder={clients.length ? "Select client" : "No clients — add a client first"} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label>VPS name</Label>
              <Input placeholder="e.g. dipencil-vps-01" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}

          {step === 5 && (
            <div className="grid grid-cols-1 gap-3">
              <Label>Billing</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Price ({billingCycle === "monthly" ? "per month" : "per year"})</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Billing cycle</Label>
                  <Select
                    value={billingCycle}
                    onValueChange={(v) => {
                      const c = v as "monthly" | "yearly";
                      setBillingCycle(c);
                      const m = monthlyFromPlan(plan, vpsPlans);
                      setPriceInput(String(priceForCycle(m, c)));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly (≈10× monthly)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Label>Advanced</Label>
              <Input placeholder="Public IP (optional)" value={ip} onChange={(e) => setIp(e.target.value)} />
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex w-full justify-between">
            <div>{step > 1 && <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button>}</div>
            <div className="flex gap-2">
              {step < 5 && <Button onClick={() => setStep((s) => s + 1)}>Next</Button>}
              {step === 5 && (
                <Button
                  onClick={handleConfirm}
                  disabled={!clientId || !name.trim() || clients.length === 0}
                >
                  Create
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
