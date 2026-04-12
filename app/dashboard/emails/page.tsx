'use client';

import { useState, useMemo } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  Mail, 
  Search, 
  ShieldCheck, 
  Clock, 
  HardDrive,
  MoreVertical,
  Edit,
  ExternalLink,
  ChevronRight,
  Zap,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatting';
import type { Domain, EmailPlan, Email } from '@/lib/types';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';

const getDomainFqdn = (domain: Domain): string => `${domain.name}${domain.tld}`;

const findEmailPlanForDomain = (domain: Domain | null, emailPlans: EmailPlan[]): EmailPlan | null => {
  if (!domain) return null;

  const hostPlanName = domain.host?.planName?.trim().toLowerCase();
  if (hostPlanName) {
    const exactPlan = emailPlans.find((plan) => plan.name.trim().toLowerCase() === hostPlanName);
    if (exactPlan) return exactPlan;

    const partialPlan = emailPlans.find((plan) =>
      plan.name.trim().toLowerCase().includes(hostPlanName) || hostPlanName.includes(plan.name.trim().toLowerCase())
    );
    if (partialPlan) return partialPlan;
  }

  return null;
};

export default function EmailsPage() {
  const { emails = [], domains = [], subscriptions = [], addEmail, deleteEmail, emailPlans = [] } = useInvoiceData();
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Form State
  const [newEmailName, setNewEmailName] = useState('');
  const [newEmailPassword, setNewEmailPassword] = useState('');
  const [newEmailDomain, setNewEmailDomain] = useState('');
  const [newEmailSize, setNewEmailSize] = useState('1');
  
  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [pendingUpgradePlan, setPendingUpgradePlan] = useState<EmailPlan | null>(null);
  const [upgradeTargetDomain, setUpgradeTargetDomain] = useState<string>('');
  
  const { updateDomain } = useInvoiceData();

  // Filtered Domains for selection (only active domains)
  const activeDomains = useMemo(() => domains || [], [domains]);

  const getMailboxLimitForDomain = (domain: Domain | null): number => {
    const matchedPlan = findEmailPlanForDomain(domain, emailPlans);
    if (matchedPlan) return matchedPlan.maxMailboxes;
    return 10;
  };

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState<Email | null>(null);

  const confirmDeleteEmail = (email: Email) => {
    setTargetEmail(email);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (targetEmail) {
      deleteEmail(targetEmail.id);
      toast.success(`Mailbox ${targetEmail.name}@${targetEmail.domain} deleted.`);
      setTargetEmail(null);
    }
  };

  // Filtered Emails based on domain and search
  const filteredEmails = useMemo(() => {
    return (emails || []).filter(email => {
      const matchesDomain = selectedDomain === 'all' || email.domain === selectedDomain;
      const matchesSearch = email.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           email.domain.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDomain && matchesSearch;
    });
  }, [emails, selectedDomain, searchQuery]);

  // Selected Domain Info
  const domainInfo = useMemo(() => {
    if (selectedDomain === 'all') return null;
    return activeDomains.find((d) => getDomainFqdn(d) === selectedDomain) || null;
  }, [selectedDomain, activeDomains]);

  const selectedDomainPlan = useMemo(() => {
    return findEmailPlanForDomain(domainInfo, emailPlans);
  }, [domainInfo, emailPlans]);

  // Usage Stats
  const usageStats = useMemo(() => {
    if (selectedDomain === 'all') {
      const totalMaxMailboxes = activeDomains.reduce((acc, domain) => acc + getMailboxLimitForDomain(domain), 0);
      const safeMax = Math.max(totalMaxMailboxes, 1);
      return {
        count: (emails || []).length,
        max: safeMax,
        percentage: ((emails || []).length / safeMax) * 100
      };
    }

    const selectedDomainInfo = activeDomains.find((d) => getDomainFqdn(d) === selectedDomain) || null;
    const domainEmails = (emails || []).filter(e => e.domain === selectedDomain);
    const limit = getMailboxLimitForDomain(selectedDomainInfo);
    return {
      count: domainEmails.length,
      max: limit,
      percentage: (domainEmails.length / limit) * 100
    };
  }, [activeDomains, emails, selectedDomain, emailPlans]);

  const autoRenewInfo = useMemo(() => {
    if (selectedDomain === 'all') {
      const enabledDomains = activeDomains.filter((d) => d.autoRenew);
      const nextDates = enabledDomains
        .map((d) => d.nextInvoiceDate || d.expiryDate)
        .filter(Boolean)
        .map((date) => new Date(date).getTime())
        .filter((time) => !Number.isNaN(time));

      const nearestTime = nextDates.length > 0 ? Math.min(...nextDates) : null;

      return {
        enabled: enabledDomains.length > 0,
        nextRenewalLabel: nearestTime ? formatDate(new Date(nearestTime).toISOString()) : 'No renewal date',
        statusLabel: `${enabledDomains.length}/${activeDomains.length} Enabled`,
      };
    }

    if (!domainInfo) {
      return {
        enabled: false,
        nextRenewalLabel: 'No renewal date',
        statusLabel: 'No domain selected',
      };
    }

    const linkedSubscription = domainInfo.subscriptionId
      ? subscriptions.find((sub) => sub.id === domainInfo.subscriptionId)
      : undefined;

    const autoRenewEnabled = linkedSubscription?.autoRenew ?? domainInfo.autoRenew;
    const nextRenewalDate =
      linkedSubscription?.nextInvoiceDate ||
      domainInfo.nextInvoiceDate ||
      linkedSubscription?.expiryDate ||
      domainInfo.expiryDate;

    return {
      enabled: autoRenewEnabled,
      nextRenewalLabel: nextRenewalDate ? formatDate(nextRenewalDate) : 'No renewal date',
      statusLabel: autoRenewEnabled ? 'Enabled' : 'Disabled',
    };
  }, [selectedDomain, activeDomains, domainInfo, subscriptions]);

  const handleCreateEmail = () => {
    if (!newEmailName || !newEmailDomain) {
      toast.error('Please fill in all required fields');
      return;
    }

    const domain = domains.find((d) => getDomainFqdn(d) === newEmailDomain) || null;
    const domainPlan = findEmailPlanForDomain(domain, emailPlans);
    const domainMailboxLimit = getMailboxLimitForDomain(domain);
    const domainMailboxCount = (emails || []).filter((email) => email.domain === newEmailDomain).length;

    // Check limits
    if (domainMailboxCount >= domainMailboxLimit) {
      toast.error('Mailbox limit reached for this domain. Please upgrade your plan.');
      setShowUpgrade(true);
      return;
    }

    const clientId = domain?.clientId || 'unknown';
    const fallbackCycle = domain?.billingCycle || 'monthly';
    const priceFromDomain = typeof domain?.host?.price === 'number' ? domain.host.price : 0;
    const planPrice = domainPlan?.price ?? priceFromDomain;

    addEmail({
      name: newEmailName,
      domain: newEmailDomain,
      storage: parseFloat(newEmailSize),
      status: 'active',
      plan: { price: planPrice, billingCycle: fallbackCycle },
      clientId,
    });
    setIsCreateModalOpen(false);
    setNewEmailName('');
    setNewEmailPassword('');
    toast.success(`Mailbox ${newEmailName}@${newEmailDomain} created successfully!`);
  };

  const handleUpgradePlan = () => {
    if (!pendingUpgradePlan || !upgradeTargetDomain) {
      toast.error('Please select a domain to upgrade');
      return;
    }

    const domain = domains.find(d => getDomainFqdn(d) === upgradeTargetDomain);
    if (domain) {
      updateDomain(domain.id, {
        host: {
          ...domain.host,
          type: domain.host?.type || 'email',
          planName: pendingUpgradePlan.name,
          price: pendingUpgradePlan.price as number,
        }
      });
      
      toast.success(`Domain ${upgradeTargetDomain} upgraded to ${pendingUpgradePlan.name}!`);
      setIsUpgradeModalOpen(false);
      setPendingUpgradePlan(null);
      
      // If the current viewed domain is the one upgraded, it will refresh via useMemo
    }
  };

  const scrollToUpgrade = () => {
    setShowUpgrade(!showUpgrade);
    if (!showUpgrade) {
      setTimeout(() => {
        document.getElementById('upgrade-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Email Accounts</h1>
          <p className="text-muted-foreground text-sm">Manage your professional communication across all your domains.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all group"
            onClick={scrollToUpgrade}
          >
            <Zap className="h-4 w-4 text-orange-500 group-hover:scale-110 transition-transform" />
            Plans & Upgrades
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                Add Mailbox
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl">
              <div className="bg-primary p-6 text-primary-foreground">
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Mail className="h-6 w-6" />
                  Create New Mailbox
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/80 mt-1">
                  Setup a professional email address on your domain.
                </DialogDescription>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="domain" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Domain</Label>
                  <Select onValueChange={setNewEmailDomain}>
                    <SelectTrigger className="h-11 bg-muted/30 border-muted-foreground/10 focus:ring-primary">
                      <SelectValue placeholder="Which domain is this for?" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeDomains.map(d => (
                        <SelectItem key={d.id} value={getDomainFqdn(d)}>{getDomainFqdn(d)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Handle</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="email" 
                      placeholder="e.g. info, sales, hello" 
                      className="h-11 bg-muted/30 border-muted-foreground/10"
                      value={newEmailName}
                      onChange={(e) => setNewEmailName(e.target.value)}
                    />
                    <span className="text-muted-foreground font-semibold px-2">@{newEmailDomain || "domain.com"}</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Secure Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Minimal 8 characters" 
                    className="h-11 bg-muted/30 border-muted-foreground/10"
                    value={newEmailPassword}
                    onChange={(e) => setNewEmailPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="size" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mailbox Quota</Label>
                  <Select defaultValue="1" onValueChange={setNewEmailSize}>
                    <SelectTrigger className="h-11 bg-muted/30 border-muted-foreground/10">
                      <SelectValue placeholder="Allocation size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 GB — Basic Inbox</SelectItem>
                      <SelectItem value="5">5 GB — Business Box</SelectItem>
                      <SelectItem value="10">10 GB — Power User</SelectItem>
                      <SelectItem value="50">50 GB — Archive Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newEmailName && newEmailDomain && (
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-primary/60 font-bold uppercase tracking-tighter">Production Email</p>
                      <p className="font-mono text-primary font-bold text-lg leading-none">{newEmailName}@{newEmailDomain}</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-primary opacity-40" />
                  </div>
                )}
              </div>
              <DialogFooter className="p-6 bg-muted/30 gap-2">
                <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateEmail} className="px-8 shadow-lg shadow-primary/20">Create Mailbox</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Domain Selector & Summary Section */}
      <Card className="p-6 border-none shadow-sm bg-card overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.015] pointer-events-none">
           <Mail className="h-40 w-40" />
        </div>
        <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center relative z-10">
          <div className="min-w-[280px] w-full lg:w-auto">
            <Label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Production Domain</Label>
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger className="w-full lg:w-[280px] h-10 text-base font-bold bg-muted/20 border-none focus:ring-primary/10">
                <SelectValue placeholder="All Domains" />
              </SelectTrigger>
              <SelectContent className="border-none shadow-xl">
                <SelectItem value="all" className="font-semibold">All Linked Domains</SelectItem>
                {activeDomains.map(d => (
                  <SelectItem key={d.id} value={getDomainFqdn(d)}>{getDomainFqdn(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full border-l border-border/20 pl-0 lg:pl-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-3 w-3 text-primary/60" /> Plan Level
              </p>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold tracking-tight">
                  {selectedDomain === 'all'
                    ? 'Global Infrastructure'
                    : selectedDomainPlan?.name || domainInfo?.host?.planName || domainInfo?.planName || 'Cloud Email'}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <HardDrive className="h-3 w-3 text-primary/60" /> Box Usage
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>{usageStats.count} / {usageStats.max}</span>
                  <span className="text-primary/80">{Math.round(usageStats.percentage)}%</span>
                </div>
                <Progress value={usageStats.percentage} className="h-1 bg-primary/5" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-3 w-3 text-primary/60" /> Renewal
              </p>
              <p className="text-base font-bold tracking-tight">{autoRenewInfo.nextRenewalLabel}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn(
                  'h-4 px-2 text-[9px] font-bold border-none rounded-full',
                  autoRenewInfo.enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                )}>
                  {autoRenewInfo.statusLabel}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Mailbox Management Section */}
      <Card className="border border-border/50 shadow-sm overflow-hidden bg-card ring-1 ring-border/30">
        <div className="p-4 border-b border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-primary/60" />
            Active Mailboxes ({filteredEmails.length})
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Search identity or domain..." 
              className="pl-9 h-8 bg-background text-xs border-border/30" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="relative w-full overflow-x-auto bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent border-b border-border/30 bg-muted/20">
                <TableHead className="text-[10px] font-bold uppercase tracking-widest h-9 pl-6">Core Identity</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest h-9">Network Domain</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest h-9">Allocation</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest h-9">Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest h-9 text-right pr-6">Commands</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                      <div className="h-16 w-16 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/5">
                        <Mail className="h-8 w-8 text-primary/20" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-bold tracking-tight">No Active Mailboxes</p>
                        <p className="text-xs text-muted-foreground">Adjust filters or create a new identity.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmails.map((email) => (
                  <TableRow key={email.id} className="bg-card hover:bg-muted/40 transition-colors border-b border-border/20 last:border-0 group">
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-primary/5 rounded-xl flex items-center justify-center text-primary/60 border border-primary/5 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm tracking-tight">{email.name}@{email.domain}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground/70">{email.domain}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 w-24">
                        <div className="flex justify-between text-[9px] font-bold">
                          <span className="text-primary/70">{email.storage} GB</span>
                          <span className="text-muted-foreground/40">0%</span>
                        </div>
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/30" style={{ width: '0%' }}></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-500/5 text-emerald-600 border-none gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter">
                        <div className="h-1 w-1 rounded-full bg-emerald-500" /> operational
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/5 hover:text-primary rounded-lg transition-all">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/5 hover:text-primary rounded-lg transition-all">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 border-none shadow-xl rounded-xl p-1 bg-popover/95 backdrop-blur-sm">
                            <DropdownMenuLabel className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-2 pb-1.5">Settings</DropdownMenuLabel>
                            <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer py-1.5 font-semibold text-xs text-muted-foreground hover:text-foreground">
                              <Edit className="h-3.5 w-3.5 text-primary/60" /> <span>Credential Manager</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer py-1.5 font-semibold text-xs text-muted-foreground hover:text-foreground">
                              <HardDrive className="h-3.5 w-3.5 text-primary/60" /> <span>Storage Allocation</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 opacity-50" />
                            <DropdownMenuItem 
                              className="rounded-lg gap-2 cursor-pointer py-1.5 text-destructive focus:text-destructive focus:bg-destructive/5 font-semibold text-xs"
                              onClick={() => confirmDeleteEmail(email)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> <span>Terminate Access</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pricing / Upgrade Section */}
      {showUpgrade && (
        <div id="upgrade-section" className="space-y-6 pt-8 border-t animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="text-center space-y-2">
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none px-4 py-1 mb-2">PRO FEATURES</Badge>
            <h2 className="text-3xl font-bold capitalize">Upgrade your email storage</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Need more space? Select the plan that fits your business growth. Scale your communication without limits.</p>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {emailPlans.map((plan) => (
            <Card key={plan.id} className={`p-6 border-2 transition-all hover:shadow-md ${plan.isPopular ? 'border-primary ring-1 ring-primary/20 scale-[1.02]' : 'border-transparent'}`}>
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-3xl font-bold mt-2">{plan.price}<span className="text-sm text-muted-foreground font-normal"> /mo</span></p>
                  </div>
                  {plan.id === 'starter' && (
                    <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                  )}
                </div>
                
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <strong>{plan.maxMailboxes}</strong> Business Mailboxes
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <strong>{plan.storage}</strong> Storage per mailbox
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <strong>{plan.emailsPerDay}</strong> Emails per day
                  </li>
                  {plan.features.map((feature: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={plan.id === 'starter' ? 'default' : 'outline'} 
                  className="w-full h-11 text-base shadow-sm"
                  onClick={() => {
                    if (plan.id === 'free') return;
                    setPendingUpgradePlan(plan);
                    setUpgradeTargetDomain(selectedDomain !== 'all' ? selectedDomain : '');
                    setIsUpgradeModalOpen(true);
                  }}
                >
                  {plan.id === 'free' ? 'Current Plan' : 'Select Plan'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
      )}

      {/* Upgrade Selection Dialog */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upgrade Plan: {pendingUpgradePlan?.name}</DialogTitle>
            <DialogDescription>
              Select the domain you want to upgrade to this plan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Target Domain</Label>
              <Select value={upgradeTargetDomain} onValueChange={setUpgradeTargetDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a domain" />
                </SelectTrigger>
                <SelectContent>
                  {activeDomains.map(d => (
                    <SelectItem key={d.id} value={getDomainFqdn(d)}>{getDomainFqdn(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pendingUpgradePlan && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 space-y-2">
                <p className="text-sm font-medium text-primary">Upgrade Summary:</p>
                <div className="flex justify-between text-xs">
                  <span>New Plan:</span>
                  <span className="font-bold">{pendingUpgradePlan.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>New Price:</span>
                  <span className="font-bold">${pendingUpgradePlan.price}/mo</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsUpgradeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpgradePlan} className="bg-orange-500 hover:bg-orange-600 border-none">
               Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Mailbox?"
        description={`Are you sure you want to delete ${targetEmail?.name}@${targetEmail?.domain}? This action cannot be undone and all messages will be lost.`}
      />
    </div>
  );
}
