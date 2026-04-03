'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/context/ConfirmationContext';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmailPlan } from '@/lib/types';
import { 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Save, 
  HardDrive,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

export default function EmailPlansPage() {
  const { emailPlans, updateEmailPlans } = useInvoiceData();
  const [localPlans, setLocalPlans] = useState<EmailPlan[]>([]);

  // Initialize local state from context
  useEffect(() => {
    if (emailPlans && emailPlans.length > 0) {
      setLocalPlans(JSON.parse(JSON.stringify(emailPlans)));
    }
  }, [emailPlans]);

  const updatePlan = (id: string, field: keyof EmailPlan, value: any) => {
    setLocalPlans(prev => prev.map(plan => 
      plan.id === id ? { ...plan, [field]: value } : plan
    ));
  };

  const handleSave = () => {
    updateEmailPlans(localPlans);
    toast.success('Email plans updated successfully! Changes are now live.');
  };

  const addFeature = (planId: string) => {
    setLocalPlans(prev => prev.map(plan => {
      if (plan.id === planId) {
        return { ...plan, features: [...plan.features, 'New Feature'] };
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
      const newId = `plan-${Date.now()}`;
      const newPlan: EmailPlan = {
          id: newId,
          name: 'New Custom Tier',
          price: 9.99,
          maxMailboxes: 50,
          storage: 20,
          emailsPerDay: 5000,
          features: ['Feature 1', 'Feature 2'],
          isPopular: false
      };
      setLocalPlans(prev => [...prev, newPlan]);
      toast.info('New custom tier added. Don\'t forget to save!');
  };

  const confirm = useConfirm();

  const deletePlan = async (id: string) => {
      const result = await confirm({
        title: 'Delete Email Plan',
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Email Plans Management</h1>
          <p className="text-muted-foreground mt-1">Configure pricing, limits and features for email services</p>
        </div>
        <Button onClick={handleSave} className="gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-lg">
          <Save size={18} /> Save All Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        {localPlans.map((plan) => (
          <Card key={plan.id} className={`p-6 border-2 flex flex-col gap-6 relative shadow-sm ${plan.isPopular ? 'border-foreground/20' : 'border-border/50'}`}>
            {plan.isPopular && (
              <Badge className="absolute -top-3 left-4 bg-foreground text-background">POPULAR PLAN</Badge>
            )}

            <div className="absolute top-4 right-4">
                <Button variant="ghost" size="icon" onClick={() => deletePlan(plan.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                    <Trash2 size={16} />
                </Button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plan Name</label>
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

            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border/50">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Users size={12} /> Max Mailboxes
                </label>
                <Input 
                  type="number" 
                  value={plan.maxMailboxes} 
                  onChange={(e) => updatePlan(plan.id, 'maxMailboxes', parseInt(e.target.value))} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <HardDrive size={12} /> Storage (GB)
                </label>
                <Input 
                  type="number" 
                  value={plan.storage} 
                  onChange={(e) => updatePlan(plan.id, 'storage', parseFloat(e.target.value))} 
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Features List</label>
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
                {plan.isPopular ? '★ Featured Plan' : 'Make Featured'}
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-8 border-dashed border-2 border-border/50 bg-muted/10 flex flex-col items-center justify-center text-center gap-3">
        <div className="h-12 w-12 rounded-full bg-background border border-border flex items-center justify-center">
            <Plus className="text-muted-foreground" />
        </div>
        <div>
            <h3 className="font-bold">Add Custom Plan</h3>
            <p className="text-sm text-muted-foreground">Create a new tiered plan for specialized enterprise clients</p>
        </div>
        <Button variant="outline" className="mt-2" onClick={createNewTier}>Create New Tier</Button>
      </Card>
    </div>
  );
}
