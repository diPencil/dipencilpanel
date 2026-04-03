'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/context/ConfirmationContext';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { HostingPlan, CloudHostingPlan } from '@/lib/types';
import {
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  HardDrive,
  Cpu,
  Database,
  Globe,
  Server,
  Cloud,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Web Hosting Plans Section ────────────────────────────────────────────────

function WebHostingPlansSection() {
  const { hostingPlans, updateHostingPlans } = useInvoiceData();
  const [localPlans, setLocalPlans] = useState<HostingPlan[]>([]);
  const confirm = useConfirm();

  useEffect(() => {
    if (hostingPlans) {
      setLocalPlans(JSON.parse(JSON.stringify(hostingPlans)));
    }
  }, [hostingPlans]);

  const updatePlan = (id: string, field: keyof HostingPlan, value: any) => {
    setLocalPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const updatePrice = (id: string, cycle: 'monthly' | 'yearly', value: number) => {
    setLocalPlans(prev => prev.map(p =>
      p.id === id ? { ...p, price: { ...p.price, [cycle]: value } } : p
    ));
  };

  const updateOriginalPrice = (id: string, cycle: 'monthly' | 'yearly', value: number) => {
    setLocalPlans(prev => prev.map(p =>
      p.id === id ? { ...p, originalPrice: { ...(p.originalPrice ?? p.price), [cycle]: value } } : p
    ));
  };

  const addFeature = (planId: string) => {
    setLocalPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, features: [...p.features, 'New Feature'] } : p
    ));
  };

  const removeFeature = (planId: string, idx: number) => {
    setLocalPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const f = [...p.features];
      f.splice(idx, 1);
      return { ...p, features: f };
    }));
  };

  const updateFeature = (planId: string, idx: number, value: string) => {
    setLocalPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const f = [...p.features];
      f[idx] = value;
      return { ...p, features: f };
    }));
  };

  const createNewPlan = () => {
    const newPlan: HostingPlan = {
      id: `web-${Date.now()}`,
      name: 'New Web Plan',
      type: 'web',
      originalPrice: { monthly: 19.99, yearly: 239.88 },
      price: { monthly: 9.99, yearly: 119.88 },
      discount: 50,
      freeMonths: 3,
      resources: { cpu: 'Shared', ram: '1 GB', storage: '20 GB SSD', bandwidth: 'Unlimited' },
      features: ['Feature 1', 'Feature 2'],
      isPopular: false,
    };
    setLocalPlans(prev => [...prev, newPlan]);
    toast.info("New web plan added. Don't forget to save!");
  };

  const deletePlan = async (id: string) => {
    const result = await confirm({
      title: 'Delete Web Hosting Plan',
      description: 'Are you sure you want to delete this plan? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (result) setLocalPlans(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = () => {
    updateHostingPlans(localPlans);
    toast.success('Web Hosting plans saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Web Hosting Plans
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Shared hosting plans for websites and WordPress.</p>
        </div>
        <Button onClick={handleSave} className="gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-lg">
          <Save size={16} /> Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {localPlans.map((plan) => (
          <Card key={plan.id} className={`p-6 border-2 flex flex-col gap-5 relative shadow-sm ${plan.isPopular ? 'border-primary/40' : 'border-border/50'}`}>
            {plan.isPopular && (
              <Badge className="absolute -top-3 left-4 bg-foreground text-background">MOST POPULAR</Badge>
            )}
            <div className="absolute top-4 right-4">
              <Button variant="ghost" size="icon" onClick={() => deletePlan(plan.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                <Trash2 size={15} />
              </Button>
            </div>

            {/* Plan Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plan Name</label>
              <Input value={plan.name} onChange={(e) => updatePlan(plan.id, 'name', e.target.value)} className="font-bold text-lg" />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3 pb-4 border-b border-border/50">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Original Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number" step="0.01"
                    value={plan.originalPrice?.monthly ?? plan.price.monthly}
                    onChange={(e) => updateOriginalPrice(plan.id, 'monthly', parseFloat(e.target.value))}
                    className="pl-7 line-through text-muted-foreground"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sale Price /mo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number" step="0.01"
                    value={plan.price.monthly}
                    onChange={(e) => updatePrice(plan.id, 'monthly', parseFloat(e.target.value))}
                    className="pl-7 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Resources */}
            <div className="grid grid-cols-2 gap-4 border-b border-border/50 pb-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Cpu size={12} /> CPU
                </label>
                <Input
                  value={plan.resources.cpu}
                  onChange={(e) => updatePlan(plan.id, 'resources', { ...plan.resources, cpu: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Database size={12} /> RAM
                </label>
                <Input
                  value={plan.resources.ram}
                  onChange={(e) => updatePlan(plan.id, 'resources', { ...plan.resources, ram: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <HardDrive size={12} /> Storage
                </label>
                <Input
                  value={plan.resources.storage}
                  onChange={(e) => updatePlan(plan.id, 'resources', { ...plan.resources, storage: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Globe size={12} /> Bandwidth
                </label>
                <Input
                  value={plan.resources.bandwidth || 'Unlimited'}
                  onChange={(e) => updatePlan(plan.id, 'resources', { ...plan.resources, bandwidth: e.target.value })}
                />
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Features</label>
                <Button variant="ghost" size="sm" onClick={() => addFeature(plan.id)} className="h-7 text-[10px] gap-1 px-2 border border-border/50">
                  <Plus size={12} /> Add
                </Button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    <CheckCircle2 size={13} className="text-foreground/40 shrink-0" />
                    <Input
                      value={feature}
                      onChange={(e) => updateFeature(plan.id, idx, e.target.value)}
                      className="h-8 text-sm bg-muted/30 border-none focus-visible:ring-1"
                    />
                    <button
                      onClick={() => removeFeature(plan.id, idx)}
                      className="opacity-0 group-hover:opacity-100 text-destructive p-1 hover:bg-destructive/10 rounded transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-border/50">
              <button
                onClick={() => {
                  const isNowPopular = !plan.isPopular;
                  setLocalPlans(prev => prev.map(p => ({
                    ...p,
                    isPopular: p.id === plan.id ? isNowPopular : (isNowPopular ? false : p.isPopular),
                  })));
                }}
                className={`w-full text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-full transition-all border ${
                  plan.isPopular
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-muted text-muted-foreground border-border/50 hover:bg-muted/80'
                }`}
              >
                {plan.isPopular ? '★ Featured Plan' : 'Make Featured'}
              </button>
            </div>
          </Card>
        ))}
        {localPlans.length === 0 && (
          <div className="lg:col-span-3 py-20 text-center border-2 border-dashed rounded-2xl flex flex-col items-center gap-4">
            <HardDrive size={40} className="text-muted-foreground opacity-20" />
            <div>
              <h3 className="font-bold text-lg">No Web Hosting Plans</h3>
              <p className="text-muted-foreground">Create your first web hosting tier to get started</p>
            </div>
            <Button onClick={createNewPlan}>Create Initial Plan</Button>
          </div>
        )}
      </div>

      {/* Add New Plan Card */}
      <Card className="p-8 border-dashed border-2 border-border/50 bg-muted/10 flex flex-col items-center justify-center text-center gap-3">
        <div className="h-12 w-12 rounded-full bg-background border border-border flex items-center justify-center">
          <Plus className="text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-bold">Add Web Hosting Plan</h3>
          <p className="text-sm text-muted-foreground">Create a new shared hosting tier for clients</p>
        </div>
        <Button variant="outline" className="mt-1" onClick={createNewPlan}>Create New Plan</Button>
      </Card>
    </div>
  );
}

// ─── Cloud Hosting Plans Section ──────────────────────────────────────────────

function CloudHostingPlansSection() {
  const { cloudHostingPlans, updateCloudHostingPlans } = useInvoiceData();
  const [localPlans, setLocalPlans] = useState<CloudHostingPlan[]>([]);
  const confirm = useConfirm();

  useEffect(() => {
    if (cloudHostingPlans) {
      setLocalPlans(JSON.parse(JSON.stringify(cloudHostingPlans)));
    }
  }, [cloudHostingPlans]);

  const updatePlan = (id: string, field: keyof CloudHostingPlan, value: any) => {
    setLocalPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const updatePrice = (id: string, cycle: 'monthly' | 'yearly', value: number) => {
    setLocalPlans(prev => prev.map(p =>
      p.id === id ? { ...p, price: { ...p.price, [cycle]: value } } : p
    ));
  };

  const updateOriginalPrice = (id: string, cycle: 'monthly' | 'yearly', value: number) => {
    setLocalPlans(prev => prev.map(p =>
      p.id === id ? { ...p, originalPrice: { ...(p.originalPrice ?? p.price), [cycle]: value } } : p
    ));
  };

  const updateResource = (id: string, field: string, value: any) => {
    setLocalPlans(prev => prev.map(p =>
      p.id === id ? { ...p, resources: { ...p.resources, [field]: value } } : p
    ));
  };

  const addFeature = (planId: string) => {
    setLocalPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, features: [...p.features, 'New Feature'] } : p
    ));
  };

  const removeFeature = (planId: string, idx: number) => {
    setLocalPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const f = [...p.features];
      f.splice(idx, 1);
      return { ...p, features: f };
    }));
  };

  const updateFeature = (planId: string, idx: number, value: string) => {
    setLocalPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const f = [...p.features];
      f[idx] = value;
      return { ...p, features: f };
    }));
  };

  const createNewPlan = () => {
    const newPlan: CloudHostingPlan = {
      id: `cloud-${Date.now()}`,
      name: 'New Cloud Plan',
      subtitle: 'High-performance cloud hosting.',
      type: 'cloud',
      originalPrice: { monthly: 69.99, yearly: 839.88 },
      price: { monthly: 29.99, yearly: 359.88 },
      discount: 57,
      freeMonths: 3,
      resources: { cpu: '4 CPU cores', ram: '4 GB RAM', storage: '100 GB NVMe', bandwidth: 'Unlimited', inodes: '2,000,000', phpWorkers: '100', websites: '100', nodeApps: '10 Managed Node.js web apps', accessSharing: true },
      features: ['Free domain for 1 year', 'Unlimited SSL', 'CDN included'],
      isPopular: false,
    };
    setLocalPlans(prev => [...prev, newPlan]);
    toast.info("New cloud plan added. Don't forget to save!");
  };

  const deletePlan = async (id: string) => {
    const result = await confirm({
      title: 'Delete Cloud Hosting Plan',
      description: 'Are you sure you want to delete this plan?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (result) setLocalPlans(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = () => {
    updateCloudHostingPlans(localPlans);
    toast.success('Cloud Hosting plans saved successfully!');
  };

  const cloudResourceFields = [
    { key: 'cpu', label: 'CPU Cores', icon: Cpu },
    { key: 'ram', label: 'RAM', icon: Database },
    { key: 'storage', label: 'Storage', icon: HardDrive },
    { key: 'inodes', label: 'Inodes', icon: Server },
    { key: 'phpWorkers', label: 'PHP Workers', icon: Server },
    { key: 'websites', label: 'Websites', icon: Globe },
    { key: 'nodeApps', label: 'Node.js Apps', icon: Globe },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Cloud Hosting Plans
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Dedicated cloud tiers with full resource control and scalability.</p>
        </div>
        <Button onClick={handleSave} className="gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-lg">
          <Save size={16} /> Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {localPlans.map((plan) => (
          <Card key={plan.id} className={`p-6 border-2 flex flex-col gap-5 relative shadow-sm ${plan.isPopular ? 'border-violet-400/60' : 'border-border/50'}`}>
            {plan.isPopular && (
              <Badge className="absolute -top-3 left-4 bg-violet-600 text-white">MOST POPULAR</Badge>
            )}
            <div className="absolute top-4 right-4">
              <Button variant="ghost" size="icon" onClick={() => deletePlan(plan.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                <Trash2 size={15} />
              </Button>
            </div>

            {/* Name & Subtitle */}
            <div className="space-y-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plan Name</label>
                <Input value={plan.name} onChange={(e) => updatePlan(plan.id, 'name', e.target.value)} className="font-bold text-base" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subtitle</label>
                <Input value={plan.subtitle ?? ''} onChange={(e) => updatePlan(plan.id, 'subtitle', e.target.value)} className="text-sm text-muted-foreground" placeholder="e.g. Optimized for business..." />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3 pb-4 border-b border-border/50">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Original Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input type="number" step="0.01" value={plan.originalPrice?.monthly ?? plan.price.monthly} onChange={(e) => updateOriginalPrice(plan.id, 'monthly', parseFloat(e.target.value))} className="pl-7 line-through text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sale /mo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input type="number" step="0.01" value={plan.price.monthly} onChange={(e) => updatePrice(plan.id, 'monthly', parseFloat(e.target.value))} className="pl-7 font-black text-base" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Discount %</label>
                <Input type="number" value={plan.discount ?? 0} onChange={(e) => updatePlan(plan.id, 'discount', parseInt(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Free Months</label>
                <Input type="number" value={plan.freeMonths ?? 0} onChange={(e) => updatePlan(plan.id, 'freeMonths', parseInt(e.target.value))} />
              </div>
            </div>

            {/* Resources */}
            <div className="space-y-2.5 pb-4 border-b border-border/50">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Cpu size={12} /> Resources</label>
              {cloudResourceFields.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-bold w-24 shrink-0">{label}</span>
                  <Input
                    value={String((plan.resources as any)[key] ?? '')}
                    onChange={(e) => updateResource(plan.id, key, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>

            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Features</label>
                <Button variant="ghost" size="sm" onClick={() => addFeature(plan.id)} className="h-7 text-[10px] gap-1 px-2 border border-border/50">
                  <Plus size={12} /> Add
                </Button>
              </div>
              <div className="space-y-1.5">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    <CheckCircle2 size={13} className="text-violet-400 shrink-0" />
                    <Input
                      value={feature}
                      onChange={(e) => updateFeature(plan.id, idx, e.target.value)}
                      className="h-8 text-xs bg-muted/30 border-none focus-visible:ring-1"
                    />
                    <button
                      onClick={() => removeFeature(plan.id, idx)}
                      className="opacity-0 group-hover:opacity-100 text-destructive p-1 hover:bg-destructive/10 rounded transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-border/50">
              <div className="flex flex-col gap-1.5 mb-4 p-3 bg-muted/30 rounded-xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Monthly Total</span>
                  <span className="font-bold underline decoration-dotted text-foreground">${plan.price.monthly.toFixed(2)} /mo</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Yearly Total</span>
                  <span className="font-bold text-foreground">
                    ${(plan.price.monthly * (12 - (plan.freeMonths || 0))).toFixed(2)} /yr
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  const isNowPopular = !plan.isPopular;
                  setLocalPlans(prev => prev.map(p => ({
                    ...p,
                    isPopular: p.id === plan.id ? isNowPopular : (isNowPopular ? false : p.isPopular),
                  })));
                }}
                className={`w-full text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-full transition-all border ${
                  plan.isPopular
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-muted text-muted-foreground border-border/50 hover:bg-muted/80'
                }`}
              >
                {plan.isPopular ? '★ Featured Plan' : 'Make Featured'}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add New Cloud Plan Card */}
      <Card className="p-8 border-dashed border-2 border-border/50 bg-muted/10 flex flex-col items-center justify-center text-center gap-3">
        <div className="h-12 w-12 rounded-full bg-background border border-border flex items-center justify-center">
          <Plus className="text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-bold">Add Cloud Hosting Plan</h3>
          <p className="text-sm text-muted-foreground">Create a new cloud tier for enterprise clients</p>
        </div>
        <Button variant="outline" className="mt-1" onClick={createNewPlan}>Create New Cloud Tier</Button>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HostingPlansPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Hosting Plans Management</h1>
        <p className="text-muted-foreground mt-1">Configure pricing, resources and features for all hosting services</p>
      </div>

      <Tabs defaultValue="web" className="w-full">
        <TabsList className="mb-6 h-11">
          <TabsTrigger value="web" className="gap-2 px-6">
            <HardDrive size={15} /> Web Hosting
          </TabsTrigger>
          <TabsTrigger value="cloud" className="gap-2 px-6">
            <Cloud size={15} /> Cloud Hosting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="web">
          <WebHostingPlansSection />
        </TabsContent>

        <TabsContent value="cloud">
          <CloudHostingPlansSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
