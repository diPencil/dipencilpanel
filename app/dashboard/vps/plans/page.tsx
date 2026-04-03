'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/context/ConfirmationContext';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VPSPlan } from '@/lib/types';
import { 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Save, 
  Cpu,
  Zap,
  HardDrive,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

export default function VpsPlansPage() {
  const { vpsPlans, updateVpsPlans } = useInvoiceData();
  const [localPlans, setLocalPlans] = useState<VPSPlan[]>([]);

  // Initialize local state from context
  useEffect(() => {
    if (vpsPlans && vpsPlans.length > 0) {
      setLocalPlans(JSON.parse(JSON.stringify(vpsPlans)));
    }
  }, [vpsPlans]);

  const updatePlan = (id: string, field: keyof VPSPlan, value: any) => {
    setLocalPlans(prev => prev.map(plan => 
      plan.id === id ? { ...plan, [field]: value } : plan
    ));
  };

  const handleSave = () => {
    updateVpsPlans(localPlans);
    toast.success('VPS plans updated successfully! All configurations are now active.');
  };

  const addFeature = (planId: string) => {
    setLocalPlans(prev => prev.map(plan => {
      if (plan.id === planId) {
        return { ...plan, features: [...plan.features, 'New Performance Feature'] };
      }
      return plan;
    }));
  };

  const removeFeature = (planId: string, index: number) => {
    setLocalPlans(prev => prev.map(plan => {
      if (plan.id === planId) {
        const newFeatures = [...plan.features];
        newFeatures.splice(index, 1);
        return { ...plan, features: newFeatures };
      }
      return plan;
    }));
  };

  const updateFeature = (planId: string, index: number, value: string) => {
    setLocalPlans(prev => prev.map(plan => {
      if (plan.id === planId) {
        const newFeatures = [...plan.features];
        newFeatures[index] = value;
        return { ...plan, features: newFeatures };
      }
      return plan;
    }));
  };

  const createNewTier = () => {
      const newId = `vps-plan-${Date.now()}`;
      const newPlan: VPSPlan = {
          id: newId,
          name: 'Ultimate VPS Tier',
          price: 99.99,
          cpu: 8,
          ram: 16,
          storage: 500,
          bandwidth: '10 TB',
          features: ['99.99% Uptime SLA', 'Root & VNC Access', 'Instant Deployment'],
          isPopular: false
      };
      setLocalPlans(prev => [...prev, newPlan]);
      toast.info('New VPS tier added. Click Save to deploy.');
  };

  const confirm = useConfirm();

  const deletePlan = async (id: string) => {
      const result = await confirm({
        title: 'Delete VPS Plan',
        description: 'Are you sure you want to delete this plan? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive'
      });
      if (result) {
          setLocalPlans(prev => prev.filter(p => p.id !== id));
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">VPS Plans Management</h1>
          <p className="text-muted-foreground mt-1">Configure virtual private server tiers, hardware limits, and pricing</p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" onClick={createNewTier} className="gap-2">
                <Plus size={18} /> New Tier
            </Button>
            <Button onClick={handleSave} className="gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-lg px-6">
                <Save size={18} /> Save Changes
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        {localPlans.map((plan) => (
          <Card key={plan.id} className={`p-6 border-2 flex flex-col gap-6 relative shadow-sm transition-all hover:border-foreground/20 ${plan.isPopular ? 'border-foreground/30 ring-1 ring-foreground/5' : 'border-border/50'}`}>
            {plan.isPopular && (
              <Badge className="absolute -top-3 left-4 bg-foreground text-background px-3">RECOMMENDED</Badge>
            )}

            <div className="absolute top-4 right-4">
                <Button variant="ghost" size="icon" onClick={() => deletePlan(plan.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                    <Trash2 size={16} />
                </Button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tier Name</label>
                <Input 
                  value={plan.name} 
                  onChange={(e) => updatePlan(plan.id, 'name', e.target.value)} 
                  className="font-bold text-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Original Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={plan.originalPrice ?? plan.price} 
                      onChange={(e) => updatePlan(plan.id, 'originalPrice', parseFloat(e.target.value))} 
                      className="pl-7 line-through text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sale Price /mo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={plan.price} 
                      onChange={(e) => updatePlan(plan.id, 'price', parseFloat(e.target.value))} 
                      className="pl-7 text-xl font-black"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border/50 bg-muted/20 p-4 rounded-xl">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Cpu size={12} /> CPU Cores
                </label>
                <Input 
                  type="number" 
                  value={plan.cpu} 
                  onChange={(e) => updatePlan(plan.id, 'cpu', parseInt(e.target.value))} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Zap size={12} /> RAM (GB)
                </label>
                <Input 
                  type="number" 
                  value={plan.ram} 
                  onChange={(e) => updatePlan(plan.id, 'ram', parseFloat(e.target.value))} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <HardDrive size={12} /> NVMe SSD (GB)
                </label>
                <Input 
                  type="number" 
                  value={plan.storage} 
                  onChange={(e) => updatePlan(plan.id, 'storage', parseFloat(e.target.value))} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Activity size={12} /> Bandwidth
                </label>
                <Input 
                  value={plan.bandwidth} 
                  onChange={(e) => updatePlan(plan.id, 'bandwidth', e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Performance Features</label>
                <Button variant="ghost" size="sm" onClick={() => addFeature(plan.id)} className="h-7 text-[10px] gap-1 px-2 border border-border/50">
                  <Plus size={12} /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    <CheckCircle2 size={14} className="text-foreground/40 shrink-0" />
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
              <div className="flex flex-col gap-1.5 mb-4 p-3 bg-muted/30 rounded-xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Monthly Total</span>
                  <span className="font-bold underline decoration-dotted text-foreground">${plan.price.toFixed(2)} /mo</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Yearly Total</span>
                  <span className="font-bold text-foreground">${(plan.price * 12).toFixed(2)} /yr</span>
                </div>
              </div>

               <button 
                onClick={() => {
                    const isNowPopular = !plan.isPopular;
                    setLocalPlans(prev => prev.map(p => ({
                        ...p,
                        isPopular: p.id === plan.id ? isNowPopular : (isNowPopular ? false : p.isPopular)
                    })));
                }}
                className={`w-full text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-full transition-all border ${
                  plan.isPopular 
                    ? 'bg-foreground text-background border-foreground' 
                    : 'bg-muted text-muted-foreground border-border/50 hover:bg-muted/80'
                }`}
              >
                {plan.isPopular ? '★ Featured' : 'Make Featured'}
              </button>
            </div>
          </Card>
        ))}

        {localPlans.length === 0 && (
            <div className="lg:col-span-3 py-20 text-center border-2 border-dashed rounded-2xl flex flex-col items-center gap-4">
                <Zap size={40} className="text-muted-foreground opacity-20" />
                <div>
                    <h3 className="font-bold text-lg">No VPS Plans Found</h3>
                    <p className="text-muted-foreground">Create your first server tier to start selling</p>
                </div>
                <Button onClick={createNewTier}>Create Initial Plan</Button>
            </div>
        )}
      </div>
    </div>
  );
}
