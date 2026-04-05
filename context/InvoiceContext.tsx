'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { toast } from 'sonner';

import type {
  SystemCompany,
  Client,
  Invoice,
  InvoiceItem,
  Website,
  Domain,
  DomainSubscription,
  DomainTransfer,
  Email,
  VPS,
  Subscription,
  Payment,
  Hosting,
  HostingPlan,
  CloudHostingPlan,
  User,
  Role,
  Company as TenantCompany,
  EmailPlan,
  VPSPlan,
  ClientGroup,
  MobileApp,
} from '@/lib/types';

// ─── Server Actions ────────────────────────────────────────────────────────────
import { getCompanies, createCompany, updateCompany as updateCompanyAction, deleteCompany } from '@/app/actions/company';
import { getAllClients, createClient, updateClient as updateClientAction, deleteClient as deleteClientAction, getAllClientGroups, createClientGroup, updateClientGroup as updateClientGroupAction, deleteClientGroup as deleteClientGroupAction, toggleClientInGroup as toggleClientInGroupAction } from '@/app/actions/clients';
import { getAllDomains, createDomain, updateDomain as updateDomainAction, deleteDomain as deleteDomainAction, renewDomain as renewDomainAction } from '@/app/actions/domains';
import { getAllHosting, createHosting, updateHosting as updateHostingAction, deleteHosting as deleteHostingAction, suspendHosting as suspendHostingAction, renewHosting as renewHostingAction } from '@/app/actions/hosting';
import { getAllVPS, createVPS, updateVPS as updateVPSAction, deleteVPS as deleteVPSAction } from '@/app/actions/vps';
import { getAllEmails, createEmail, updateEmail as updateEmailAction, deleteEmail as deleteEmailAction } from '@/app/actions/emails';
import { getAllWebsites, createWebsite, updateWebsite as updateWebsiteAction, deleteWebsite as deleteWebsiteAction } from '@/app/actions/websites';
import {
  getAllSubscriptions,
  createSubscription as createSubscriptionAction,
  updateSubscription as updateSubscriptionAction,
  deleteSubscription as deleteSubscriptionAction,
  cancelSubscription as cancelSubscriptionAction,
  renewSubscription as renewSubscriptionAction,
  renewSubscriptionWithSchedule as renewSubscriptionWithScheduleAction,
  runSubscriptionAutoRenewals,
} from '@/app/actions/subscriptions';
import { getAllInvoices, createInvoice, updateInvoice as updateInvoiceAction, deleteInvoice as deleteInvoiceAction, markInvoiceAsPaid, duplicateInvoice as duplicateInvoiceAction } from '@/app/actions/invoices';
import { getAllPayments, createPayment } from '@/app/actions/payments';
import { getAllTransfers, createTransfer, updateTransfer as updateTransferAction, deleteTransfer as deleteTransferAction } from '@/app/actions/transfers';
import { getAllUsers, createUser, updateUser as updateUserAction, deleteUser as deleteUserAction } from '@/app/actions/users';
import { getAllRoles, createRole, updateRole as updateRoleAction, deleteRole as deleteRoleAction } from '@/app/actions/roles';
import { getAllMobileApps, createMobileApp, updateMobileApp as updateMobileAppAction, deleteMobileApp as deleteMobileAppAction, updateMobileAppStatus } from '@/app/actions/mobile-apps';
import { HOSTING_PLANS as HOSTING_PLANS_DEFAULT, CLOUD_HOSTING_PLANS as CLOUD_HOSTING_PLANS_DEFAULT } from '@/lib/constants';

import { calculateInvoiceTotals, generateInvoiceNumber } from '@/lib/invoice-utils';
import { getStorageSummary } from '@/lib/storage-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceContextType {
  company: SystemCompany;
  currentCompany: TenantCompany;
  allCompanies: TenantCompany[];
  users: User[];
  roles: Role[];
  clients: Client[];
  invoices: Invoice[];
  websites: Website[];
  domains: Domain[];
  domainSubscriptions: DomainSubscription[];
  subscriptions: Subscription[];
  payments: Payment[];
  transfers: DomainTransfer[];
  emails: Email[];
  vps: VPS[];
  hosting: Hosting[];
  emailPlans: EmailPlan[];
  vpsPlans: VPSPlan[];
  hostingPlans: HostingPlan[];
  cloudHostingPlans: CloudHostingPlan[];
  clientGroups: ClientGroup[];
  mobileApps: MobileApp[];
  isLoading: boolean;

  // Client Group actions
  addClientGroup: (group: Omit<ClientGroup, 'id' | 'createdAt' | 'companyId'>) => void;
  updateClientGroup: (id: string, group: Partial<ClientGroup>) => void;
  deleteClientGroup: (id: string) => void;
  toggleClientInGroup: (groupId: string, clientId: string) => void;

  // Company actions
  updateCompany: (company: Partial<SystemCompany>) => void;
  setActiveCompany: (id: string) => void;
  addTenantCompany: (company: Omit<TenantCompany, 'id' | 'createdAt' | 'userCount'>) => Promise<{ success: boolean; error?: string }>;
  updateTenantCompany: (id: string, company: Partial<TenantCompany>) => Promise<{ success: boolean; error?: string }>;
  deleteTenantCompany: (id: string) => Promise<{ success: boolean; error?: string }>;

  // User actions
  addUser: (user: Omit<User, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, user: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Role actions
  addRole: (role: Omit<Role, 'id' | 'companyId'>) => Promise<{ success: boolean; error?: string }>;
  updateRole: (id: string, role: Partial<Role>) => Promise<{ success: boolean; error?: string }>;
  deleteRole: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Client actions
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClient: (id: string) => Client | undefined;

  // Invoice actions
  addInvoice: (invoice: Omit<Invoice, 'id' | 'number' | 'createdAt' | 'updatedAt'>) => Invoice | null;
  updateInvoice: (
    id: string,
    invoice: Partial<Invoice>,
  ) => Promise<{ success: boolean; error?: string }>;
  deleteInvoice: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;
  duplicateInvoice: (id: string) => void;
  markAsPaid: (id: string, method: Payment['method']) => void;

  // Website actions
  addWebsite: (website: Omit<Website, 'id' | 'createdAt' | 'renewalDate' | 'companyId'> & { companyId?: string; linkedDomainId?: string }) => void;
  updateWebsite: (id: string, website: Partial<Website>) => void;
  deleteWebsite: (id: string) => void;
  getWebsite: (id: string) => Website | undefined;

  // Domain actions
  addDomain: (domain: Omit<Domain, 'id' | 'createdAt' | 'renewalDate' | 'subscriptionId'>) => Domain;
  updateDomain: (id: string, domain: Partial<Domain>) => void;
  deleteDomain: (id: string) => void;
  getDomain: (id: string) => Domain | undefined;
  renewDomain: (id: string) => Domain | undefined;

  // Subscription actions
  addSubscription: (subscription: Omit<Subscription, 'id' | 'companyId'>) => Subscription;
  updateSubscription: (id: string, subscription: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  getSubscription: (id: string) => Subscription | undefined;
  cancelSubscription: (id: string) => void;
  renewSubscription: (id: string) => void;
  renewSubscriptionWithSchedule: (
    id: string,
    input: import('@/app/actions/subscriptions').RenewalScheduleInput,
  ) => Promise<boolean>;

  // Payment actions
  addPayment: (payment: Omit<Payment, 'id' | 'companyId'>) => Payment;

  // Transfer actions
  addTransfer: (transfer: Omit<DomainTransfer, 'id' | 'createdAt'>) => DomainTransfer;
  updateTransfer: (id: string, transfer: Partial<DomainTransfer>) => void;
  deleteTransfer: (id: string) => void;
  getTransfer: (id: string) => DomainTransfer | undefined;

  // Email actions
  addEmail: (email: Omit<Email, 'id' | 'createdAt' | 'renewalDate' | 'companyId'>) => void;
  updateEmail: (id: string, email: Partial<Email>) => void;
  deleteEmail: (id: string) => void;
  getEmail: (id: string) => Email | undefined;

  // VPS actions
  addVPS: (vps: Omit<VPS, 'id' | 'createdAt' | 'renewalDate'>) => void;
  updateVPS: (id: string, vps: Partial<VPS>) => void;
  deleteVPS: (id: string) => void;
  getVPS: (id: string) => VPS | undefined;

  // Hosting actions
  addHosting: (hosting: Omit<Hosting, 'id' | 'createdAt' | 'subscriptionId'>) => Hosting;
  updateHosting: (id: string, hosting: Partial<Hosting>) => void;
  deleteHosting: (id: string) => void;
  getHosting: (id: string) => Hosting | undefined;
  suspendHosting: (id: string) => void;
  renewHosting: (id: string) => void;

  // Mobile App actions
  addMobileApp: (app: Omit<MobileApp, 'id' | 'createdAt' | 'updatedAt'> & { companyId?: string }) => MobileApp | undefined;
  updateMobileApp: (id: string, app: Partial<MobileApp>) => void;
  deleteMobileApp: (id: string) => void;
  getMobileApp: (id: string) => MobileApp | undefined;
  setMobileAppStatus: (id: string, status: MobileApp['status']) => void;

  // Analytics / calculations
  getTotalRevenue: () => number;
  getPaidRevenue: () => number;
  getPendingRevenue: () => number;
  getTotalInvoices: () => number;
  getRecentInvoices: (limit?: number) => Invoice[];
  getInvoicesByClient: (clientId: string) => Invoice[];
  getMonthlyRevenue: () => { month: string; revenue: number }[];
  getTotalStorageUsed: () => number;
  getRecentDomains: (limit?: number) => Domain[];
  getRecentSubscriptions: (limit?: number) => Subscription[];
  getRecentWebsites: (limit?: number) => Website[];
  updateEmailPlans: (plans: EmailPlan[]) => void;
  updateVpsPlans: (plans: VPSPlan[]) => void;
  updateHostingPlans: (plans: HostingPlan[]) => void;
  updateCloudHostingPlans: (plans: CloudHostingPlan[]) => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_COMPANY: SystemCompany = {
  id: 'default',
  name: 'My Company',
  ownerName: '',
  logo: '',
  invoiceLogo: '',
  invoiceEmailHeaderHtml: null,
  invoiceEmailBodyHtml: null,
  invoiceEmailFooterHtml: null,
  reminderEmailHeaderHtml: null,
  reminderEmailBodyHtml: null,
  reminderEmailFooterHtml: null,
  email: '',
  phone: '',
  address: '',
  vatNumber: '',
  currency: 'USD',
  taxRate: 0,
  exchangeRates: {},
  status: 'active',
  createdAt: new Date().toISOString(),
  userCount: 0,
};

const DEFAULT_EMAIL_PLANS: EmailPlan[] = [
  { id: 'free', name: 'Free Plan', price: 0, maxMailboxes: 1, storage: 1, emailsPerDay: 50, features: ['Basic Spam Filter', 'Webmail Access'] },
  { id: 'starter', name: 'Starter Email', price: 1.99, maxMailboxes: 10, storage: 5, emailsPerDay: 500, features: ['Advanced Spam Filter', 'Webmail Access', 'Support 24/7', 'IMAP/POP3 Support'], isPopular: true },
  { id: 'premium', name: 'Premium Business', price: 4.99, maxMailboxes: 100, storage: 50, emailsPerDay: 'Unlimited', features: ['Enterprise Spam Protection', 'Webmail Access', 'Dedicated Support', 'Priority Delivery', 'Backup & Restore'] },
];

const DEFAULT_VPS_PLANS: VPSPlan[] = [
  { id: 'kvm-1', name: 'KVM 1', price: 6.49, cpu: 1, ram: 4, storage: 50, bandwidth: '4 TB', features: ['1 vCPU core', '4 GB RAM', '50 GB NVMe', '4 TB bandwidth', 'Full Root Access'] },
  { id: 'kvm-2', name: 'KVM 2', price: 8.99, cpu: 2, ram: 8, storage: 100, bandwidth: '8 TB', features: ['2 vCPU cores', '8 GB RAM', '100 GB NVMe', '8 TB bandwidth', 'Full Root Access', 'Daily Backups'], isPopular: true },
  { id: 'kvm-4', name: 'KVM 4', price: 12.99, cpu: 4, ram: 16, storage: 200, bandwidth: '16 TB', features: ['4 vCPU cores', '16 GB RAM', '200 GB NVMe', '16 TB bandwidth', 'Full Root Access', 'DDoS Protection'] },
  { id: 'kvm-8', name: 'KVM 8', price: 25.99, cpu: 8, ram: 32, storage: 400, bandwidth: '32 TB', features: ['8 vCPU cores', '32 GB RAM', '400 GB NVMe', '32 TB bandwidth', 'Full Root Access', 'DDoS Protection', 'Priority Support'] },
];

// ─── Context ──────────────────────────────────────────────────────────────────

export const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Maps a DB Domain row to the frontend Domain type
function mapDbDomain(d: Record<string, unknown>): Domain {
  return {
    id: d.id as string,
    name: d.name as string,
    tld: d.tld as string,
    registrar: d.registrar as string,
    expiryDate: (d.expiryDate as Date | string)?.toString() ?? '',
    autoRenew: d.autoRenew as boolean,
    status: (d.status as Domain['status']) ?? 'active',
    nameservers: d.nameservers ? JSON.parse(d.nameservers as string) : [],
    notes: (d.notes as string | undefined) ?? undefined,
    reminderDays: (d.reminderDays as number | undefined) ?? undefined,
    price: (d.subscription as Record<string, unknown> | null)?.price as number ?? 0,
    billingCycle: ((d.subscription as Record<string, unknown> | null)?.billingCycle as Domain['billingCycle']) ?? 'yearly',
    planName: ((d.subscription as Record<string, unknown> | null)?.planName as string) ?? '',
    clientId: d.clientId as string,
    companyId: d.companyId as string,
    subscriptionId: d.subscriptionId as string | undefined,
    createdAt: (d.createdAt as Date | string)?.toString() ?? '',
    renewalDate: (d.expiryDate as Date | string)?.toString() ?? '',
    nextInvoiceDate: (d.expiryDate as Date | string)?.toString() ?? '',
    linkedServices: { websiteIds: [], emailIds: [], vpsIds: [] },
  };
}

function mapDbWebsite(w: Record<string, unknown>): Website {
  return {
    id: w.id as string,
    name: w.name as string,
    domain: w.domain as string,
    type: (w.type as Website['type']) ?? 'wordpress',
    storage: w.storage as number ?? 0,
    bandwidth: w.bandwidth as number ?? 0,
    status: (w.status as Website['status']) ?? 'active',
    linkedDomain: (w.linkedDomain as string) ?? undefined,
    plan: {
      name: (w.planName as string) ?? '',
      price: (w.planPrice as number) ?? 0,
      billingCycle: (w.billingCycle as 'monthly' | 'yearly') ?? 'monthly',
    },
    clientId: w.clientId as string,
    companyId: w.companyId as string,
    createdAt: (w.createdAt as Date | string)?.toString() ?? '',
    renewalDate: (w.renewalDate as Date | string)?.toString() ?? new Date().toISOString(),
  };
}

function mapDbEmail(e: Record<string, unknown>): Email {
  const sub = e.subscription as Record<string, unknown> | null;
  return {
    id: e.id as string,
    name: e.name as string,
    domain: e.domain as string,
    storage: e.storage as number,
    status: (e.status as 'active' | 'suspended' | 'expired') ?? 'active',
    clientId: e.clientId as string,
    companyId: e.companyId as string,
    plan: {
      price: (sub?.price as number) ?? 0,
      billingCycle: (sub?.billingCycle as 'monthly' | 'yearly') ?? 'monthly',
    },
    createdAt: (e.createdAt as Date | string)?.toString() ?? '',
    renewalDate: (e.expiryDate as Date | string)?.toString() ?? new Date().toISOString(),
  };
}

function mapDbVPS(v: Record<string, unknown>): VPS {
  const sub = v.subscription as Record<string, unknown> | null;
  return {
    id: v.id as string,
    name: v.name as string,
    planName: v.planName as string,
    ram: v.ram as number,
    storage: v.storage as number,
    cpu: v.cpu as number,
    status: (v.status as VPS['status']) ?? 'active',
    price: (sub?.price as number) ?? 0,
    billingCycle: (sub?.billingCycle as 'monthly' | 'yearly') ?? 'monthly',
    clientId: v.clientId as string,
    companyId: v.companyId as string,
    subscriptionId: v.subscriptionId as string | undefined,
    notes: (v.notes as string) ?? undefined,
    createdAt: (v.createdAt as Date | string)?.toString() ?? '',
    renewalDate: (v.expiryDate as Date | string)?.toString() ?? new Date().toISOString(),
  };
}

function mapDbHosting(h: Record<string, unknown>): Hosting {
  const sub = h.subscription as Record<string, unknown> | null;
  const resources = h.resources ? JSON.parse(h.resources as string) : { cpu: '', ram: '', storage: '', bandwidth: '' };
  return {
    id: h.id as string,
    name: h.name as string,
    type: (h.type as Hosting['type']) ?? 'web',
    planName: h.planName as string,
    status: (h.status as Hosting['status']) ?? 'active',
    expiryDate: (h.expiryDate as Date | string)?.toString() ?? new Date().toISOString(),
    resources,
    clientId: h.clientId as string,
    companyId: h.companyId as string,
    domainId: '',
    price: (sub?.price as number) ?? 0,
    billingCycle: (sub?.billingCycle as 'monthly' | 'yearly') ?? 'monthly',
    subscriptionId: h.subscriptionId as string | undefined,
    createdAt: (h.createdAt as Date | string)?.toString() ?? '',
    linkedServices: { emailIds: [], vpsIds: [] },
  };
}

function mapDbSubscription(s: Record<string, unknown>): Subscription {
  return {
    id: s.id as string,
    clientId: s.clientId as string,
    companyId: s.companyId as string,
    serviceType: (s.serviceType as Subscription['serviceType']) ?? 'domain',
    serviceId: s.serviceId as string,
    serviceName: (s.serviceName as string) ?? '',
    planName: (s.planName as string) ?? '',
    billingCycle: (s.billingCycle as 'monthly' | 'yearly') ?? 'monthly',
    price: s.price as number,
    providerPrice: (() => {
      const raw = s.providerPrice;
      if (raw == null || raw === '') return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    })(),
    currency: (s.currency as string) ?? 'USD',
    startDate: s.startDate instanceof Date 
      ? s.startDate.toISOString() 
      : (s.startDate as string) ?? '',
    expiryDate: s.endDate instanceof Date 
      ? s.endDate.toISOString() 
      : (s.endDate as string) ?? '',
    autoRenew: s.autoRenew as boolean,
    status: (s.status as Subscription['status']) ?? 'active',
    notes: (s.notes as string) ?? undefined,
  };
}

function mapDbInvoice(inv: Record<string, unknown>): Invoice {
  const items = ((inv.items as unknown[]) ?? []).map((item) => {
    const i = item as Record<string, unknown>;
    return {
      id: i.id as string,
      description: i.description as string,
      quantity: i.quantity as number,
      price: i.price as number,
      discount: i.discount as number,
      vat: i.vat as number,
    } satisfies InvoiceItem;
  });

  const sub = inv.subscription as { id?: string; serviceType?: string; serviceName?: string } | null | undefined;

  return {
    id: inv.id as string,
    number: inv.number as string,
    clientId: inv.clientId as string,
    companyId: inv.companyId as string,
    subscriptionId:
      (inv.subscriptionId as string | null | undefined) ?? sub?.id ?? undefined,
    serviceType: sub?.serviceType as Invoice['serviceType'] | undefined,
    serviceName: sub?.serviceName as string | undefined,
    issueDate: inv.issueDate instanceof Date
      ? inv.issueDate.toISOString()
      : (inv.issueDate as string) ?? '',
    dueDate: inv.dueDate instanceof Date
      ? inv.dueDate.toISOString()
      : (inv.dueDate as string) ?? '',
    nextBillingDate: inv.nextBillingDate
      ? (inv.nextBillingDate instanceof Date ? inv.nextBillingDate.toISOString() : (inv.nextBillingDate as string))
      : null,
    status: (inv.status as Invoice['status']) ?? 'pending',
    paymentStatus: (inv.paymentStatus as Invoice['paymentStatus']) ?? 'unpaid',
    currency: (inv.currency as string) ?? 'USD',
    items,
    notes: (inv.notes as string) ?? '',
    subtotal: inv.subtotal as number,
    discountAmount: inv.discountAmount as number,
    vatAmount: inv.vatAmount as number,
    total: inv.total as number,
    createdAt: inv.createdAt instanceof Date
      ? inv.createdAt.toISOString()
      : (inv.createdAt as string) ?? '',
    updatedAt: inv.updatedAt instanceof Date
      ? inv.updatedAt.toISOString()
      : (inv.updatedAt as string) ?? '',
  };
}

function mapDbPayment(p: Record<string, unknown>): Payment {
  const inv = p.invoice as Record<string, unknown> | null;
  const client = p.client as Record<string, unknown> | null;
  return {
    id: p.id as string,
    clientId: p.clientId as string,
    clientName: (client?.name as string) ?? '',
    invoiceId: p.invoiceId as string,
    invoiceNumber: (inv?.number as string) ?? '',
    amount: p.amount as number,
    currency: (p.currency as string) ?? 'USD',
    method: (p.method as Payment['method']) ?? 'cash',
    date: (p.date as Date | string)?.toString() ?? '',
    status: (p.status as Payment['status']) ?? 'completed',
    companyId: p.companyId as string,
  };
}

function mapDbTransfer(t: Record<string, unknown>): DomainTransfer {
  return {
    id: t.id as string,
    domainName: t.domainName as string,
    tld: t.tld as string,
    clientId: t.clientId as string,
    previousProvider: t.previousProvider as string,
    transferDate: (t.transferDate as Date | string)?.toString() ?? '',
    expiryDate: (t.expiryDate as Date | string)?.toString() ?? '',
    subscriptionDuration: 12,
    price: (t.price as number) ?? 0,
    status: (t.status as DomainTransfer['status']) ?? 'pending',
    autoRenew: t.autoRenew as boolean,
    notes: (t.notes as string) ?? undefined,
    createdAt: (t.createdAt as Date | string)?.toString() ?? '',
  };
}

function mapDbUser(u: Record<string, unknown>): User {
  return {
    id: u.id as string,
    name: u.name as string,
    username: (u.username as string) ?? '',
    email: u.email as string,
    roleId: u.roleId as string,
    companyId: u.companyId as string,
    status: (u.status as User['status']) ?? 'active',
    lastLogin: (u.lastLogin as Date | string | undefined)?.toString() ?? undefined,
    lastLogoutAt: (u.lastLogoutAt as Date | string | undefined)?.toString() ?? undefined,
    avatar: (u.avatar as string) ?? undefined,
  };
}

function mapDbRole(r: Record<string, unknown>): Role {
  let permissions: Role['permissions'];
  try {
    permissions = JSON.parse(r.permissions as string);
  } catch {
    permissions = {} as Role['permissions'];
  }
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? '',
    permissions,
    companyId: r.companyId as string,
    userCount: (r._count as { users?: number } | undefined)?.users,
  };
}

function mapDbCompany(c: Record<string, unknown>): TenantCompany {
  let exchangeRates: Record<string, number> = {};
  try {
    if (c.exchangeRates) exchangeRates = JSON.parse(c.exchangeRates as string);
  } catch {
    exchangeRates = {};
  }
  const count = (c._count as Record<string, number> | undefined)?._count;
  return {
    id: c.id as string,
    name: c.name as string,
    ownerName: (c.ownerName as string) ?? undefined,
    logo: (c.logo as string) ?? '',
    invoiceLogo: (c.invoiceLogo as string) ?? '',
    invoiceEmailHeaderHtml: (c.invoiceEmailHeaderHtml as string | null | undefined) ?? null,
    invoiceEmailBodyHtml: (c.invoiceEmailBodyHtml as string | null | undefined) ?? null,
    invoiceEmailFooterHtml: (c.invoiceEmailFooterHtml as string | null | undefined) ?? null,
    reminderEmailHeaderHtml: (c.reminderEmailHeaderHtml as string | null | undefined) ?? null,
    reminderEmailBodyHtml: (c.reminderEmailBodyHtml as string | null | undefined) ?? null,
    reminderEmailFooterHtml: (c.reminderEmailFooterHtml as string | null | undefined) ?? null,
    email: (c.email as string) ?? '',
    phone: (c.phone as string) ?? '',
    address: (c.address as string) ?? '',
    vatNumber: (c.vatNumber as string) ?? '',
    currency: (c.currency as string) ?? 'USD',
    taxRate: (c.taxRate as number) ?? 0,
    exchangeRates,
    status: (c.status as TenantCompany['status']) ?? 'active',
    userCount: (c._count as Record<string, number> | undefined)?.users ?? 0,
    createdAt: (c.createdAt as Date | string)?.toString() ?? '',
  };
}

function mapDbMobileApp(a: Record<string, unknown>): MobileApp {
  let emailIds: string[] = [];
  try { emailIds = JSON.parse(a.emailIds as string); } catch { emailIds = []; }
  return {
    id: a.id as string,
    name: a.name as string,
    appType: ((a.appType === 'cross_platform' ? 'windows' : a.appType) as MobileApp['appType']) ?? 'android',
    framework: (a.framework as MobileApp['framework']) ?? 'native',
    description: (a.description as string) ?? undefined,
    status: (a.status as MobileApp['status']) ?? 'development',
    plan: (a.plan as MobileApp['plan']) ?? 'basic',
    price: (a.price as number) ?? 0,
    billingCycle: (a.billingCycle as 'monthly' | 'yearly') ?? 'monthly',
    autoRenew: (a.autoRenew as boolean) ?? true,
    expiryDate: (a.expiryDate as Date | string | undefined)?.toString() ?? undefined,
    domainId: (a.domainId as string) ?? undefined,
    hostingId: (a.hostingId as string) ?? undefined,
    vpsId: (a.vpsId as string) ?? undefined,
    emailIds,
    clientId: a.clientId as string,
    companyId: a.companyId as string,
    subscriptionId: (a.subscriptionId as string) ?? undefined,
    createdAt: (a.createdAt as Date | string)?.toString() ?? '',
    updatedAt: (a.updatedAt as Date | string)?.toString() ?? '',
  };
}

function mapDbClientGroup(g: Record<string, unknown>): ClientGroup {
  let clientIds: string[] = [];
  try {
    clientIds = JSON.parse(g.clientIds as string);
  } catch {
    clientIds = [];
  }
  return {
    id: g.id as string,
    name: g.name as string,
    description: (g.description as string) ?? undefined,
    color: (g.color as string) ?? undefined,
    clientIds,
    createdAt: (g.createdAt as Date | string)?.toString() ?? '',
    companyId: g.companyId as string,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function InvoiceProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<SystemCompany>(DEFAULT_COMPANY);
  const [allCompanies, setAllCompanies] = useState<TenantCompany[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainSubscriptions] = useState<DomainSubscription[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transfers, setTransfers] = useState<DomainTransfer[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [vps, setVPS] = useState<VPS[]>([]);
  const [hosting, setHosting] = useState<Hosting[]>([]);
  const [emailPlans, setEmailPlans] = useState<EmailPlan[]>(DEFAULT_EMAIL_PLANS);
  const [vpsPlans, setVpsPlans] = useState<VPSPlan[]>(DEFAULT_VPS_PLANS);
  const [hostingPlans, setHostingPlans] = useState<HostingPlan[]>(HOSTING_PLANS_DEFAULT);
  const [cloudHostingPlans, setCloudHostingPlans] = useState<CloudHostingPlan[]>(CLOUD_HOSTING_PLANS_DEFAULT);
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [mobileApps, setMobileApps] = useState<MobileApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const loadCompanies = useCallback(async () => {
    const res = await getCompanies();
    if (res.success && res.data) {
      const mapped = res.data.map((c) => mapDbCompany(c as unknown as Record<string, unknown>));
      
      if (mapped.length > 0) {
        setAllCompanies(mapped);
        let targetId = activeCompanyId;
        if (!targetId || !mapped.some((c) => c.id === targetId)) {
          targetId = mapped[0].id;
          setActiveCompanyId(targetId);
        }
        const comp = mapped.find((c) => c.id === targetId) ?? mapped[0];
        setCompany({
          ...DEFAULT_COMPANY,
          ...comp,
          userCount: comp.userCount,
        });
      } else {
        // Database is completely empty, initialize default company
        const createRes = await createCompany({
          name: DEFAULT_COMPANY.name,
          ownerName: DEFAULT_COMPANY.ownerName,
          email: DEFAULT_COMPANY.email,
          phone: DEFAULT_COMPANY.phone,
          address: DEFAULT_COMPANY.address,
          vatNumber: DEFAULT_COMPANY.vatNumber,
          logo: DEFAULT_COMPANY.logo,
          invoiceLogo: DEFAULT_COMPANY.invoiceLogo,
          currency: DEFAULT_COMPANY.currency,
          taxRate: DEFAULT_COMPANY.taxRate,
          exchangeRates: JSON.stringify(DEFAULT_COMPANY.exchangeRates),
          status: 'active'
        });
        
        if (createRes.success && createRes.data) {
          const newMapped = mapDbCompany(createRes.data as unknown as Record<string, unknown>);
          setAllCompanies([newMapped]);
          setActiveCompanyId(newMapped.id);
          setCompany({
            ...DEFAULT_COMPANY,
            ...newMapped,
            userCount: 0
          });
        } else if (!createRes.success) {
          toast.error(createRes.error || 'Could not create default company');
        }
      }
    } else {
      const msg = 'error' in res && res.error ? String(res.error) : 'Unknown error';
      console.error('[InvoiceContext] getCompanies failed:', msg);
      toast.error(`Could not load workspace: ${msg}`);
    }
  }, [activeCompanyId]);

  const loadAll = useCallback(async (cid: string) => {
    if (!cid) return;
    setIsLoading(true);
    try {
      const [
        clientsRes, domainsRes, hostingRes, vpsRes, emailsRes, websitesRes,
        subsRes, invoicesRes, paymentsRes, transfersRes, usersRes, rolesRes,
        groupsRes, mobileAppsRes,
      ] = await Promise.all([
        getAllClients(cid),
        getAllDomains(cid),
        getAllHosting(cid),
        getAllVPS(cid),
        getAllEmails(cid),
        getAllWebsites(cid),
        getAllSubscriptions(cid),
        getAllInvoices(cid),
        getAllPayments(cid),
        getAllTransfers(cid),
        getAllUsers(cid),
        getAllRoles(cid),
        getAllClientGroups(cid),
        getAllMobileApps(cid),
      ]);

      if (clientsRes.success && clientsRes.data) {
        setClients(clientsRes.data.map((c) => ({
          id: c.id, name: c.name, email: c.email,
          phone: c.phone ?? '', address: c.address ?? '',
          companyName: c.companyName ?? '', companyId: c.companyId,
          createdAt: c.createdAt.toString(),
        })));
      }
      if (domainsRes.success && domainsRes.data) {
        setDomains(domainsRes.data.map((d) => mapDbDomain(d as unknown as Record<string, unknown>)));
      }
      if (hostingRes.success && hostingRes.data) {
        setHosting(hostingRes.data.map((h) => mapDbHosting(h as unknown as Record<string, unknown>)));
      }
      if (vpsRes.success && vpsRes.data) {
        setVPS(vpsRes.data.map((v) => mapDbVPS(v as unknown as Record<string, unknown>)));
      }
      if (emailsRes.success && emailsRes.data) {
        setEmails(emailsRes.data.map((e) => mapDbEmail(e as unknown as Record<string, unknown>)));
      }
      if (websitesRes.success && websitesRes.data) {
        setWebsites(websitesRes.data.map((w) => mapDbWebsite(w as unknown as Record<string, unknown>)));
      }
      if (subsRes.success && subsRes.data) {
        setSubscriptions(subsRes.data.map((s) => mapDbSubscription(s as unknown as Record<string, unknown>)));
      }
      if (invoicesRes.success && invoicesRes.data) {
        setInvoices(invoicesRes.data.map((inv) => mapDbInvoice(inv as unknown as Record<string, unknown>)));
      }
      if (paymentsRes.success && paymentsRes.data) {
        setPayments(paymentsRes.data.map((p) => mapDbPayment(p as unknown as Record<string, unknown>)));
      }
      if (transfersRes.success && transfersRes.data) {
        setTransfers(transfersRes.data.map((t) => mapDbTransfer(t as unknown as Record<string, unknown>)));
      }
      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data.map((u) => mapDbUser(u as unknown as Record<string, unknown>)));
      }
      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data.map((r) => mapDbRole(r as unknown as Record<string, unknown>)));
      }
      if (groupsRes.success && groupsRes.data) {
        setClientGroups(groupsRes.data.map((g) => mapDbClientGroup(g as unknown as Record<string, unknown>)));
      }
      if (mobileAppsRes.success && mobileAppsRes.data) {
        setMobileApps(mobileAppsRes.data.map((a) => mapDbMobileApp(a as unknown as Record<string, unknown>)));
      }

      const autoRenewRes = await runSubscriptionAutoRenewals(cid);
      if (autoRenewRes.success && autoRenewRes.renewedCount > 0) {
        const [subsRefresh, invoicesRefresh] = await Promise.all([
          getAllSubscriptions(cid),
          getAllInvoices(cid),
        ]);
        if (subsRefresh.success && subsRefresh.data) {
          setSubscriptions(
            subsRefresh.data.map((s) => mapDbSubscription(s as unknown as Record<string, unknown>)),
          );
        }
        if (invoicesRefresh.success && invoicesRefresh.data) {
          setInvoices(
            invoicesRefresh.data.map((inv) => mapDbInvoice(inv as unknown as Record<string, unknown>)),
          );
        }
        toast.success(
          autoRenewRes.renewedCount === 1
            ? 'Auto-renew: 1 renewal invoice was generated.'
            : `Auto-renew: ${autoRenewRes.renewedCount} renewal invoices were generated.`,
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load: companies first, then data
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const currentCompany = allCompanies.find((c) => c.id === activeCompanyId) ?? allCompanies[0] ?? {} as TenantCompany;

  /** Resolved tenant for API calls: state id or synced company id (avoids empty companyId on save). */
  const tenantId = useMemo(
    () => activeCompanyId || (company.id !== 'default' ? company.id : ''),
    [activeCompanyId, company.id],
  );

  useEffect(() => {
    if (tenantId) loadAll(tenantId);
  }, [tenantId, loadAll]);

  const requireTenantId = useCallback((): boolean => {
    if (!tenantId) {
      toast.error('Workspace not ready — wait a moment or refresh the page.');
      return false;
    }
    return true;
  }, [tenantId]);

  // ─── Company Actions ───────────────────────────────────────────────────────

  const updateCompany = (updates: Partial<SystemCompany>) => {
    setCompany((prev) => ({ ...prev, ...updates }));
    if (tenantId) {
      setAllCompanies((prev) =>
        prev.map((c) => (c.id === tenantId ? { ...c, ...updates } : c)),
      );
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (typeof updates.exchangeRates === 'object') {
        dbUpdates.exchangeRates = JSON.stringify(updates.exchangeRates);
      }
      updateCompanyAction(tenantId, dbUpdates as Parameters<typeof updateCompanyAction>[1]).catch((err) => {
        console.error(err);
        toast.error('Could not save company settings');
      });
    }
  };

  const setActiveCompany = (id: string) => {
    setActiveCompanyId(id);
    const comp = allCompanies.find((c) => c.id === id);
    if (comp) setCompany({ ...DEFAULT_COMPANY, ...comp });
  };

  const addTenantCompany = async (data: Omit<TenantCompany, 'id' | 'createdAt' | 'userCount'>) => {
    const temp: TenantCompany = { ...data, id: tempId(), createdAt: new Date().toISOString(), userCount: 0 };
    setAllCompanies((prev) => [...prev, temp]);
    const dbData: Parameters<typeof createCompany>[0] = {
      ...data,
      exchangeRates: typeof data.exchangeRates === 'object'
        ? JSON.stringify(data.exchangeRates)
        : (data.exchangeRates as string | undefined),
    };
    const res = await createCompany(dbData);
    if (res.success && res.data) {
      const real = mapDbCompany(res.data as unknown as Record<string, unknown>);
      setAllCompanies((prev) => prev.map((c) => (c.id === temp.id ? real : c)));
      return { success: true };
    }
    setAllCompanies((prev) => prev.filter((c) => c.id !== temp.id));
    return { success: false, error: res.error };
  };

  const updateTenantCompany = async (id: string, updates: Partial<TenantCompany>) => {
    const previous = allCompanies.find((c) => c.id === id);
    setAllCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    if (id === activeCompanyId) {
      setCompany((prev) => ({ ...prev, ...updates }));
    }
    const dbUpdates: Record<string, unknown> = { ...updates };
    if (typeof updates.exchangeRates === 'object') {
      dbUpdates.exchangeRates = JSON.stringify(updates.exchangeRates);
    }
    const res = await updateCompanyAction(id, dbUpdates as Parameters<typeof updateCompanyAction>[1]);
    if (res.success && res.data) {
      const real = mapDbCompany(res.data as unknown as Record<string, unknown>);
      setAllCompanies((prev) => prev.map((c) => (c.id === id ? real : c)));
      if (id === activeCompanyId) {
        setCompany({ ...DEFAULT_COMPANY, ...real, userCount: real.userCount });
      }
      return { success: true };
    }
    if (previous) {
      setAllCompanies((prev) => prev.map((c) => (c.id === id ? previous : c)));
      if (id === activeCompanyId) {
        setCompany({ ...DEFAULT_COMPANY, ...previous, userCount: previous.userCount });
      }
    }
    return { success: false, error: res.error };
  };

  const deleteTenantCompany = async (id: string) => {
    const previous = allCompanies.find((c) => c.id === id);
    setAllCompanies((prev) => prev.filter((c) => c.id !== id));
    const res = await deleteCompany(id);
    if (res.success) return { success: true };
    if (previous) {
      setAllCompanies((prev) => [...prev, previous].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    }
    return { success: false, error: res.error };
  };

  // ─── User Actions ──────────────────────────────────────────────────────────

  const addUser = async (data: Omit<User, 'id'>) => {
    if (!data.password) {
      return { success: false, error: 'Password is required.' };
    }
    const temp: User = { ...data, id: tempId() };
    setUsers((prev) => [...prev, temp]);
    const res = await createUser({ ...data, password: data.password, companyId: tenantId });
    if (res.success && res.data) {
      const real = mapDbUser(res.data as unknown as Record<string, unknown>);
      setUsers((prev) => prev.map((u) => (u.id === temp.id ? real : u)));
      return { success: true };
    }
    setUsers((prev) => prev.filter((u) => u.id !== temp.id));
    return { success: false, error: res.error };
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const previous = users.find((u) => u.id === id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    const dbUpdates = {
      ...updates,
      lastLogin: updates.lastLogin ? new Date(updates.lastLogin) : undefined,
    };
    const res = await updateUserAction(id, tenantId, dbUpdates);
    if (res.success && res.data) {
      const real = mapDbUser(res.data as unknown as Record<string, unknown>);
      setUsers((prev) => prev.map((u) => (u.id === id ? real : u)));
      return { success: true };
    }
    if (previous) {
      setUsers((prev) => prev.map((u) => (u.id === id ? previous : u)));
    }
    return { success: false, error: res.error };
  };

  const deleteUser = async (id: string) => {
    const previous = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    const res = await deleteUserAction(id, tenantId);
    if (res.success) return { success: true };
    if (previous) {
      setUsers((prev) => [...prev, previous].sort((a, b) => a.name.localeCompare(b.name)));
    }
    return { success: false, error: res.error };
  };

  // ─── Role Actions ──────────────────────────────────────────────────────────

  const addRole = async (data: Omit<Role, 'id' | 'companyId'>) => {
    const temp: Role = { ...data, id: tempId(), companyId: tenantId };
    setRoles((prev) => [...prev, temp]);
    const res = await createRole({ ...data, permissions: JSON.stringify(data.permissions), companyId: tenantId });
    if (res.success && res.data) {
      const real = mapDbRole(res.data as unknown as Record<string, unknown>);
      setRoles((prev) => prev.map((r) => (r.id === temp.id ? real : r)));
      return { success: true };
    }
    setRoles((prev) => prev.filter((r) => r.id !== temp.id));
    return { success: false, error: res.error };
  };

  const updateRole = async (id: string, updates: Partial<Role>) => {
    const previous = roles.find((r) => r.id === id);
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    const dbUpdates: Record<string, unknown> = { ...updates };
    if (updates.permissions) dbUpdates.permissions = JSON.stringify(updates.permissions);
    const res = await updateRoleAction(id, tenantId, dbUpdates as Parameters<typeof updateRoleAction>[2]);
    if (res.success && res.data) {
      const real = mapDbRole(res.data as unknown as Record<string, unknown>);
      setRoles((prev) => prev.map((r) => (r.id === id ? real : r)));
      return { success: true };
    }
    if (previous) {
      setRoles((prev) => prev.map((r) => (r.id === id ? previous : r)));
    }
    return { success: false, error: res.error };
  };

  const deleteRole = async (id: string) => {
    const previous = roles.find((r) => r.id === id);
    setRoles((prev) => prev.filter((r) => r.id !== id));
    const res = await deleteRoleAction(id, tenantId);
    if (res.success) return { success: true };
    if (previous) {
      setRoles((prev) => [...prev, previous].sort((a, b) => a.name.localeCompare(b.name)));
    }
    return { success: false, error: res.error };
  };

  // ─── Client Actions ────────────────────────────────────────────────────────

  const addClient = (data: Omit<Client, 'id' | 'createdAt'> & { groupId?: string }) => {
    if (!requireTenantId()) return;
    const { groupId, ...clientData } = data as Client & { groupId?: string };
    const effectiveCompanyId = clientData.companyId || tenantId;
    const temp: Client = { ...clientData, id: tempId(), createdAt: new Date().toISOString(), companyId: effectiveCompanyId };
    setClients((prev) => [...prev, temp]);
    createClient({ ...clientData, companyId: effectiveCompanyId }).then((res) => {
      if (res.success && res.data) {
        const d = res.data;
        const real: Client = { id: d.id, name: d.name, email: d.email, phone: d.phone ?? '', address: d.address ?? '', companyName: d.companyName ?? '', companyId: d.companyId, createdAt: d.createdAt.toString() };
        setClients((prev) => prev.map((c) => (c.id === temp.id ? real : c)));
        // Assign to group if selected
        if (groupId && groupId !== 'none') {
          setClientGroups((prev) =>
            prev.map((g) =>
              g.id === groupId && !g.clientIds.includes(real.id)
                ? { ...g, clientIds: [...g.clientIds, real.id] }
                : g,
            ),
          );
          toggleClientInGroupAction(groupId, real.id, tenantId).catch(console.error);
        }
      } else {
        setClients((prev) => prev.filter((c) => c.id !== temp.id));
        toast.error(res.error || 'Could not save client');
      }
    });
  };

  const updateClient = (id: string, updates: Partial<Client> & { groupId?: string }) => {
    const { groupId, ...clientUpdates } = updates as Partial<Client> & { groupId?: string };
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...clientUpdates } : c)));
    updateClientAction(id, tenantId, clientUpdates).catch(console.error);
    // Handle group change
    if (groupId !== undefined) {
      const oldGroup = clientGroups.find((g) => g.clientIds.includes(id));
      const newGroupId = groupId === 'none' ? null : groupId;
      if (oldGroup?.id !== newGroupId) {
        // Remove from old group
        if (oldGroup) {
          setClientGroups((prev) =>
            prev.map((g) =>
              g.id === oldGroup.id ? { ...g, clientIds: g.clientIds.filter((cid) => cid !== id) } : g,
            ),
          );
          toggleClientInGroupAction(oldGroup.id, id, tenantId).catch(console.error);
        }
        // Add to new group
        if (newGroupId) {
          setClientGroups((prev) =>
            prev.map((g) =>
              g.id === newGroupId && !g.clientIds.includes(id)
                ? { ...g, clientIds: [...g.clientIds, id] }
                : g,
            ),
          );
          toggleClientInGroupAction(newGroupId, id, tenantId).catch(console.error);
        }
      }
    }
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    setInvoices((prev) => prev.filter((inv) => inv.clientId !== id));
    setDomains((prev) => prev.filter((d) => d.clientId !== id));
    setSubscriptions((prev) => prev.filter((s) => s.clientId !== id));
    deleteClientAction(id, tenantId).catch(console.error);
  };

  const getClient = (id: string) => clients.find((c) => c.id === id);

  // ─── Client Group Actions ──────────────────────────────────────────────────

  const addClientGroup = (data: Omit<ClientGroup, 'id' | 'createdAt' | 'companyId'>) => {
    if (!requireTenantId()) return;
    const temp: ClientGroup = { ...data, id: tempId(), createdAt: new Date().toISOString(), companyId: tenantId };
    setClientGroups((prev) => [...prev, temp]);
    createClientGroup({ ...data, companyId: tenantId }).then((res) => {
      if (res.success && res.data) {
        const real = mapDbClientGroup(res.data as unknown as Record<string, unknown>);
        setClientGroups((prev) => prev.map((g) => (g.id === temp.id ? real : g)));
      } else {
        setClientGroups((prev) => prev.filter((g) => g.id !== temp.id));
        toast.error(res.error || 'Could not save client group');
      }
    });
  };

  const updateClientGroup = (id: string, updates: Partial<ClientGroup>) => {
    setClientGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    const dbUpdates: Record<string, unknown> = { ...updates };
    if (updates.clientIds) dbUpdates.clientIds = JSON.stringify(updates.clientIds);
    updateClientGroupAction(id, tenantId, dbUpdates as Parameters<typeof updateClientGroupAction>[2]).catch(console.error);
  };

  const deleteClientGroup = (id: string) => {
    setClientGroups((prev) => prev.filter((g) => g.id !== id));
    deleteClientGroupAction(id, tenantId).catch(console.error);
  };

  const toggleClientInGroup = (groupId: string, clientId: string) => {
    setClientGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const ids = g.clientIds ?? [];
        return { ...g, clientIds: ids.includes(clientId) ? ids.filter((i) => i !== clientId) : [...ids, clientId] };
      }),
    );
    toggleClientInGroupAction(groupId, clientId, tenantId).catch(console.error);
  };

  // ─── Invoice Actions ───────────────────────────────────────────────────────

  const addInvoice = (data: Omit<Invoice, 'id' | 'number' | 'createdAt' | 'updatedAt'>) => {
    if (!requireTenantId()) return null;
    const now = new Date().toISOString();
    const number = generateInvoiceNumber(invoices);
    const temp: Invoice = { ...data, id: tempId(), number, createdAt: now, updatedAt: now, companyId: tenantId };
    setInvoices((prev) => [...prev, temp]);

    createInvoice({
      clientId: data.clientId,
      companyId: tenantId,
      subscriptionId: data.serviceId,
      issueDate: data.issueDate,
      dueDate: new Date(data.dueDate),
      nextBillingDate: data.nextBillingDate ? new Date(data.nextBillingDate) : null,
      currency: data.currency,
      notes: data.notes,
      items: data.items,
    }).then((res) => {
      if (res.success && res.data) {
        const real = mapDbInvoice(res.data as unknown as Record<string, unknown>);
        setInvoices((prev) => prev.map((inv) => (inv.id === temp.id ? real : inv)));
      } else {
        setInvoices((prev) => prev.filter((inv) => inv.id !== temp.id));
        toast.error(res.error || 'Could not save invoice');
      }
    });

    return temp;
  };

  const updateInvoice = async (
    id: string,
    updates: Partial<Invoice>,
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await updateInvoiceAction(
      id,
      tenantId,
      updates as unknown as Record<string, unknown>,
    );
    if (res.success && res.data) {
      const real = mapDbInvoice(res.data as unknown as Record<string, unknown>);
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? real : inv)));
      return { success: true };
    }
    return {
      success: false,
      error: res.success === false ? res.error : 'Failed to update invoice',
    };
  };

  const deleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    deleteInvoiceAction(id, tenantId).catch(console.error);
  };

  const getInvoice = (id: string) => invoices.find((inv) => inv.id === id);

  const duplicateInvoice = (id: string) => {
    const original = getInvoice(id);
    if (!original) return;
    addInvoice({
      clientId: original.clientId,
      companyId: tenantId,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      paymentStatus: 'unpaid',
      currency: original.currency,
      items: original.items.map((item) => ({ ...item, id: tempId() })),
      notes: original.notes,
      ...calculateInvoiceTotals(original.items),
    });
    duplicateInvoiceAction(id, tenantId).catch(console.error);
  };

  const markAsPaid = (id: string, method: Payment['method']) => {
    const invoice = getInvoice(id);
    if (!invoice) return;
    const prevStatus = invoice.status;
    const prevPaymentStatus = invoice.paymentStatus;

    // Use setInvoices directly instead of updateInvoice to avoid double server actions
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, paymentStatus: 'paid', status: 'paid' } : inv))
    );

    markInvoiceAsPaid(id, tenantId, method).then((res) => {
      if (res.success && res.data) {
        const payment = mapDbPayment(res.data.payment as unknown as Record<string, unknown>);
        setPayments((prev) => [...prev, payment]);
        toast.success('Invoice marked as paid');
      } else {
        // Only rollback if it's NOT "already paid" (which might have been a race condition)
        if (res.error === 'Invoice is already paid') {
          return;
        }
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, paymentStatus: prevPaymentStatus, status: prevStatus } : inv))
        );
        toast.error(res.success === false ? res.error : 'Failed to mark as paid');
      }
    });
  };

  // ─── Website Actions ───────────────────────────────────────────────────────

  const addWebsite = (data: Omit<Website, 'id' | 'createdAt' | 'renewalDate' | 'companyId'> & { companyId?: string; linkedDomainId?: string }) => {
    const id = tempId();
    const now = new Date().toISOString();
    const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const cid = data.companyId || tenantId;
    const temp: Website = { ...data, id, createdAt: now, renewalDate, companyId: cid };
    setWebsites((prev) => [...prev, temp]);

    createWebsite({
      name: data.name,
      domain: data.domain,
      type: data.type,
      storage: data.storage,
      bandwidth: data.bandwidth,
      linkedDomain: data.linkedDomain,
      clientId: data.clientId,
      companyId: cid,
      planName: data.plan.name,
      planPrice: data.plan.price,
      billingCycle: data.plan.billingCycle,
    }).then((res) => {
      if (res.success && res.data) {
        const real = mapDbWebsite(res.data.website as unknown as Record<string, unknown>);
        setWebsites((prev) => prev.map((w) => (w.id === id ? real : w)));
        const sub = mapDbSubscription(res.data.subscription as unknown as Record<string, unknown>);
        setSubscriptions((prev) => [...prev, sub]);
        const inv = mapDbInvoice(res.data.invoice as unknown as Record<string, unknown>);
        setInvoices((prev) => [...prev, inv]);
        // Auto-link domain bidirectionally after real website ID is known
        if (data.linkedDomainId) {
          setDomains((prev) => prev.map((d) => {
            if (d.id !== data.linkedDomainId) return d;
            const existing = d.linkedServices?.websiteIds ?? [];
            if (existing.includes(real.id)) return d;
            return { ...d, linkedServices: { ...d.linkedServices, websiteIds: [...existing, real.id], emailIds: d.linkedServices?.emailIds ?? [], vpsIds: d.linkedServices?.vpsIds ?? [] } };
          }));
          updateDomainAction(data.linkedDomainId, tenantId, {
            linkedServices: {
              websiteIds: (() => {
                const d = domains.find(x => x.id === data.linkedDomainId);
                const existing = d?.linkedServices?.websiteIds ?? [];
                return existing.includes(real.id) ? existing : [...existing, real.id];
              })(),
              emailIds: domains.find(x => x.id === data.linkedDomainId)?.linkedServices?.emailIds ?? [],
              vpsIds: domains.find(x => x.id === data.linkedDomainId)?.linkedServices?.vpsIds ?? [],
            },
          } as Parameters<typeof updateDomainAction>[2]).catch(console.error);
        }
      } else {
        setWebsites((prev) => prev.filter((w) => w.id !== id));
      }
    });
  };

  const updateWebsite = (id: string, updates: Partial<Website>) => {
    setWebsites((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
    updateWebsiteAction(id, tenantId, updates as Parameters<typeof updateWebsiteAction>[2]).catch(console.error);
  };

  const deleteWebsite = (id: string) => {
    setWebsites((prev) => prev.filter((w) => w.id !== id));
    deleteWebsiteAction(id, tenantId).catch(console.error);
  };

  const getWebsite = (id: string) => websites.find((w) => w.id === id);

  // ─── Domain Actions ────────────────────────────────────────────────────────

  const addDomain = (data: Omit<Domain, 'id' | 'createdAt' | 'renewalDate' | 'subscriptionId'>) => {
    const id = tempId();
    const subId = tempId();
    const now = new Date().toISOString();
    const temp: Domain = { ...data, id, createdAt: now, renewalDate: data.expiryDate, subscriptionId: subId, companyId: tenantId };
    setDomains((prev) => [...prev, temp]);

    createDomain({
      name: data.name,
      tld: data.tld,
      registrar: data.registrar,
      expiryDate: new Date(data.expiryDate),
      autoRenew: data.autoRenew,
      notes: data.notes,
      reminderDays: data.reminderDays ?? undefined,
      clientId: data.clientId,
      companyId: tenantId,
      price: data.price,
      planName: data.planName,
    }).then((res) => {
      if (res.success && res.data) {
        const real = mapDbDomain(res.data.domain as unknown as Record<string, unknown>);
        setDomains((prev) => prev.map((d) => (d.id === id ? real : d)));
        const sub = mapDbSubscription(res.data.subscription as unknown as Record<string, unknown>);
        setSubscriptions((prev) => [...prev.filter((s) => s.id !== subId), sub]);
        const inv = mapDbInvoice(res.data.invoice as unknown as Record<string, unknown>);
        setInvoices((prev) => [...prev, inv]);
      } else {
        setDomains((prev) => prev.filter((d) => d.id !== id));
      }
    });

    return temp;
  };

  const updateDomain = (id: string, updates: Partial<Domain>) => {
    setDomains((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
    updateDomainAction(id, tenantId, updates as Parameters<typeof updateDomainAction>[2]).catch(console.error);
  };

  const deleteDomain = (id: string) => {
    setDomains((prev) => prev.filter((d) => d.id !== id));
    deleteDomainAction(id, tenantId).catch(console.error);
  };

  const getDomain = (id: string) => domains.find((d) => d.id === id);

  const renewDomain = (id: string) => {
    const domain = getDomain(id);
    if (!domain) return undefined;
    const newExpiry = new Date(domain.expiryDate);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    const optimistic: Domain = { ...domain, expiryDate: newExpiry.toISOString(), status: 'active' };
    updateDomain(id, { expiryDate: newExpiry.toISOString(), status: 'active' });
    renewDomainAction(id, tenantId).then((res) => {
      if (res.success && res.data) {
        const inv = mapDbInvoice(res.data.invoice as unknown as Record<string, unknown>);
        setInvoices((prev) => [...prev, inv]);
      }
    });
    return optimistic;
  };

  // ─── Subscription Actions ──────────────────────────────────────────────────

  const addSubscription = (data: Omit<Subscription, 'id' | 'companyId'>) => {
    const temp: Subscription = { ...data, id: tempId(), companyId: tenantId };
    setSubscriptions((prev) => [...prev, temp]);
    createSubscriptionAction({
      clientId: data.clientId,
      serviceType: data.serviceType,
      serviceId: data.serviceId,
      serviceName: data.serviceName,
      planName: data.planName,
      price: data.price,
      providerPrice: data.providerPrice ?? null,
      currency: data.currency,
      billingCycle: data.billingCycle,
      startDate: data.startDate,
      endDate: data.expiryDate,
      autoRenew: data.autoRenew,
      notes: data.notes,
      companyId: tenantId,
    }).then((res) => {
      if (res.success && res.data) {
        const real = mapDbSubscription(res.data as unknown as Record<string, unknown>);
        setSubscriptions((prev) => prev.map((s) => (s.id === temp.id ? real : s)));
      } else {
        setSubscriptions((prev) => prev.filter((s) => s.id !== temp.id));
      }
    });
    return temp;
  };

  const updateSubscription = (id: string, updates: Partial<Subscription>) => {
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    const actionInput: any = { ...updates };
    if (updates.expiryDate) {
      actionInput.endDate = updates.expiryDate;
      delete actionInput.expiryDate;
    }
    updateSubscriptionAction(id, tenantId, actionInput).catch(console.error);
  };

  const deleteSubscription = (id: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    deleteSubscriptionAction(id, tenantId).catch(console.error);
  };

  const getSubscription = (id: string) => subscriptions.find((s) => s.id === id);

  const cancelSubscription = (id: string) => {
    updateSubscription(id, { status: 'cancelled', autoRenew: false });
    cancelSubscriptionAction(id, tenantId).catch(console.error);
  };

  const renewSubscription = (id: string) => {
    if (!requireTenantId()) return;
    renewSubscriptionAction(id, tenantId).then((res) => {
      if (res.success && res.data) {
        const inv = mapDbInvoice(res.data.invoice as unknown as Record<string, unknown>);
        const sub = mapDbSubscription(res.data.subscription as unknown as Record<string, unknown>);
        setInvoices((prev) => [...prev, inv]);
        setSubscriptions((prev) => prev.map((s) => (s.id === id ? sub : s)));
        toast.success('Renewal invoice generated and subscription reactivated.');
      } else {
        toast.error(res.success === false ? res.error : 'Failed to renew subscription');
      }
    });
  };

  const renewSubscriptionWithSchedule = async (
    id: string,
    input: import('@/app/actions/subscriptions').RenewalScheduleInput,
  ): Promise<boolean> => {
    if (!requireTenantId()) return false;
    const res = await renewSubscriptionWithScheduleAction(id, tenantId, input);
    if (res.success && res.data) {
      const inv = mapDbInvoice(res.data.invoice as unknown as Record<string, unknown>);
      const sub = mapDbSubscription(res.data.subscription as unknown as Record<string, unknown>);
      setInvoices((prev) => [...prev, inv]);
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? sub : s)));
      toast.success('Renewal invoice created and subscription updated.');
      return true;
    }
    toast.error(res.success === false ? res.error : 'Failed to renew subscription');
    return false;
  };

  // ─── Payment Actions ───────────────────────────────────────────────────────

  const addPayment = (data: Omit<Payment, 'id' | 'companyId'>) => {
    const temp: Payment = { ...data, id: tempId(), companyId: tenantId };
    setPayments((prev) => [...prev, temp]);
    createPayment({
      amount: data.amount,
      method: data.method,
      currency: data.currency,
      date: new Date(data.date),
      notes: data.status,
      invoiceId: data.invoiceId,
      clientId: data.clientId,
      companyId: tenantId,
    }).then((res) => {
      if (res.success && res.data) {
        const real = mapDbPayment(res.data as unknown as Record<string, unknown>);
        setPayments((prev) => prev.map((p) => (p.id === temp.id ? real : p)));
      } else {
        setPayments((prev) => prev.filter((p) => p.id !== temp.id));
      }
    });
    return temp;
  };

  // ─── Transfer Actions ──────────────────────────────────────────────────────

  const addTransfer = (data: Omit<DomainTransfer, 'id' | 'createdAt'>) => {
    const temp: DomainTransfer = { ...data, id: tempId(), createdAt: new Date().toISOString() };
    setTransfers((prev) => [...prev, temp]);
    createTransfer({
      domainName: data.domainName,
      tld: data.tld,
      previousProvider: data.previousProvider,
      transferDate: new Date(data.transferDate),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      autoRenew: data.autoRenew,
      notes: data.notes,
      price: data.price,
      clientId: data.clientId,
      companyId: tenantId,
    }).then((res) => {
      if (res.success && res.data) {
        const real = mapDbTransfer(res.data as unknown as Record<string, unknown>);
        setTransfers((prev) => prev.map((t) => (t.id === temp.id ? real : t)));
      } else {
        setTransfers((prev) => prev.filter((t) => t.id !== temp.id));
      }
    });
    return temp;
  };

  const updateTransfer = (id: string, updates: Partial<DomainTransfer>) => {
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    updateTransferAction(id, tenantId, updates as Parameters<typeof updateTransferAction>[2]).catch(console.error);
  };

  const deleteTransfer = (id: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
    deleteTransferAction(id, tenantId).catch(console.error);
  };

  const getTransfer = (id: string) => transfers.find((t) => t.id === id);

  // ─── Email Actions ─────────────────────────────────────────────────────────

  const addEmail = (data: Omit<Email, 'id' | 'createdAt' | 'renewalDate' | 'companyId'>) => {
    const id = tempId();
    const now = new Date().toISOString();
    const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const temp: Email = { ...data, id, createdAt: now, renewalDate, companyId: tenantId };
    setEmails((prev) => [...prev, temp]);

    createEmail({
      name: data.name,
      domain: data.domain,
      storage: data.storage,
      clientId: data.clientId,
      companyId: tenantId,
      price: data.plan.price,
      billingCycle: data.plan.billingCycle,
    }).then((res) => {
      if (res.success && res.data) {
        const real = mapDbEmail(res.data.email as unknown as Record<string, unknown>);
        setEmails((prev) => prev.map((e) => (e.id === id ? real : e)));
        const sub = mapDbSubscription(res.data.subscription as unknown as Record<string, unknown>);
        setSubscriptions((prev) => [...prev, sub]);
        const inv = mapDbInvoice(res.data.invoice as unknown as Record<string, unknown>);
        setInvoices((prev) => [...prev, inv]);
      } else {
        setEmails((prev) => prev.filter((e) => e.id !== id));
      }
    });
  };

  const updateEmail = (id: string, updates: Partial<Email>) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    updateEmailAction(id, tenantId, updates as Parameters<typeof updateEmailAction>[2]).catch(console.error);
  };

  const deleteEmail = (id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
    deleteEmailAction(id, tenantId).catch(console.error);
  };

  const getEmail = (id: string) => emails.find((e) => e.id === id);

  // ─── VPS Actions ───────────────────────────────────────────────────────────

  const addVPS = (data: Omit<VPS, 'id' | 'createdAt' | 'renewalDate'>) => {
    if (!requireTenantId()) return;
    const id = tempId();
    const now = new Date().toISOString();
    const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const temp: VPS = { ...data, id, createdAt: now, renewalDate, companyId: tenantId };
    setVPS((prev) => [...prev, temp]);

    createVPS({
      name: data.name,
      planName: data.planName,
      ram: data.ram,
      storage: data.storage,
      cpu: data.cpu,
      notes: data.notes,
      clientId: data.clientId,
      companyId: tenantId,
      price: data.price,
      billingCycle: data.billingCycle,
    }).then((res) => {
      if (res.success && res.data) {
        const real = mapDbVPS(res.data.vps as unknown as Record<string, unknown>);
        setVPS((prev) => prev.map((v) => (v.id === id ? real : v)));
        const sub = mapDbSubscription(res.data.subscription as unknown as Record<string, unknown>);
        setSubscriptions((prev) => [...prev, sub]);
        const inv = mapDbInvoice(res.data.invoice as unknown as Record<string, unknown>);
        setInvoices((prev) => [...prev, inv]);
      } else {
        setVPS((prev) => prev.filter((v) => v.id !== id));
        toast.error(res.success === false ? res.error : 'Failed to create VPS');
      }
    });
  };

  const updateVPS = (id: string, updates: Partial<VPS>) => {
    setVPS((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    updateVPSAction(id, tenantId, updates as Parameters<typeof updateVPSAction>[2]).catch(console.error);
  };

  const deleteVPS = (id: string) => {
    setVPS((prev) => prev.filter((v) => v.id !== id));
    deleteVPSAction(id, tenantId).catch(console.error);
  };

  const getVPS = (id: string) => vps.find((v) => v.id === id);

  // ─── Hosting Actions ───────────────────────────────────────────────────────

  const addHosting = (data: Omit<Hosting, 'id' | 'createdAt' | 'subscriptionId'>) => {
    const id = tempId();
    const now = new Date().toISOString();
    const temp: Hosting = { ...data, id, createdAt: now, companyId: tenantId };
    setHosting((prev) => [...prev, temp]);

    createHosting({
      name: data.name,
      type: data.type,
      planName: data.planName,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      resources: JSON.stringify(data.resources),
      clientId: data.clientId,
      companyId: tenantId,
      price: data.price,
      billingCycle: data.billingCycle,
    }).then((res) => {
      if (res.success && res.data) {
        const real = mapDbHosting(res.data.hosting as unknown as Record<string, unknown>);
        setHosting((prev) => prev.map((h) => (h.id === id ? real : h)));
        const sub = mapDbSubscription(res.data.subscription as unknown as Record<string, unknown>);
        setSubscriptions((prev) => [...prev, sub]);
        const inv = mapDbInvoice(res.data.invoice as unknown as Record<string, unknown>);
        setInvoices((prev) => [...prev, inv]);
      } else {
        setHosting((prev) => prev.filter((h) => h.id !== id));
      }
    });

    return temp;
  };

  const updateHosting = (id: string, updates: Partial<Hosting>) => {
    setHosting((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
    updateHostingAction(id, tenantId, updates as Parameters<typeof updateHostingAction>[2]).catch(console.error);
  };

  const deleteHosting = (id: string) => {
    setHosting((prev) => prev.filter((h) => h.id !== id));
    deleteHostingAction(id, tenantId).catch(console.error);
  };

  const getHosting = (id: string) => hosting.find((h) => h.id === id);

  const suspendHosting = (id: string) => {
    updateHosting(id, { status: 'suspended' });
    const h = getHosting(id);
    if (h?.subscriptionId) cancelSubscription(h.subscriptionId);
    suspendHostingAction(id, tenantId).catch(console.error);
  };

  const renewHosting = (id: string) => {
    const h = getHosting(id);
    if (!h) return;
    const newExpiry = new Date(h.expiryDate);
    if (h.billingCycle === 'monthly') newExpiry.setMonth(newExpiry.getMonth() + 1);
    else newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    updateHosting(id, { expiryDate: newExpiry.toISOString(), status: 'active' });
    renewHostingAction(id, tenantId).then((res) => {
      if (res.success && res.data) {
        const inv = mapDbInvoice(res.data.invoice as unknown as Record<string, unknown>);
        setInvoices((prev) => [...prev, inv]);
      }
    });
  };

  // ─── Mobile App Actions ────────────────────────────────────────────────────

  const addMobileApp = (data: Omit<MobileApp, 'id' | 'createdAt' | 'updatedAt'> & { companyId?: string }) => {
    if (!requireTenantId()) return undefined;
    const id = tempId();
    const now = new Date().toISOString();
    const cid = data.companyId || tenantId;
    const temp: MobileApp = { ...data, id, createdAt: now, updatedAt: now, companyId: cid };
    setMobileApps((prev) => [...prev, temp]);

    createMobileApp({
      name: data.name,
      appType: data.appType,
      framework: data.framework,
      description: data.description,
      plan: data.plan,
      price: data.price,
      billingCycle: data.billingCycle,
      autoRenew: data.autoRenew,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      domainId: data.domainId,
      hostingId: data.hostingId,
      vpsId: data.vpsId,
      emailIds: data.emailIds,
      clientId: data.clientId,
      companyId: cid,
    }).then((res) => {
      if (res.success && res.data) {
        const real = mapDbMobileApp(res.data.app as unknown as Record<string, unknown>);
        setMobileApps((prev) => prev.map((a) => (a.id === id ? real : a)));
        const sub = mapDbSubscription(res.data.subscription as unknown as Record<string, unknown>);
        setSubscriptions((prev) => [...prev, sub]);
        const inv = mapDbInvoice(res.data.invoice as unknown as Record<string, unknown>);
        setInvoices((prev) => [...prev, inv]);
      } else {
        setMobileApps((prev) => prev.filter((a) => a.id !== id));
        toast.error(res.error || 'Could not save mobile app');
      }
    });

    return temp;
  };

  const updateMobileApp = (id: string, updates: Partial<MobileApp>) => {
    setMobileApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a)));
    const { emailIds, expiryDate, ...rest } = updates;
    updateMobileAppAction(id, tenantId, {
      ...rest,
      emailIds,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    }).catch(console.error);
  };

  const deleteMobileApp = (id: string) => {
    setMobileApps((prev) => prev.filter((a) => a.id !== id));
    deleteMobileAppAction(id, tenantId).catch(console.error);
  };

  const getMobileApp = (id: string) => mobileApps.find((a) => a.id === id);

  const setMobileAppStatus = (id: string, status: MobileApp['status']) => {
    setMobileApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    updateMobileAppStatus(id, tenantId, status).catch(console.error);
  };

  // ─── Analytics ────────────────────────────────────────────────────────────

  const getTotalRevenue = () => payments.reduce((sum, p) => sum + p.amount, 0);
  const getPaidRevenue = () => payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  const getPendingRevenue = () => invoices.filter((i) => i.paymentStatus === 'unpaid').reduce((sum, i) => sum + i.total, 0);
  const getTotalInvoices = () => invoices.length;

  const getRecentInvoices = (limit = 5) =>
    [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);

  const getInvoicesByClient = (clientId: string) => invoices.filter((inv) => inv.clientId === clientId);

  const getMonthlyRevenue = () => {
    const monthly: Record<string, number> = {};
    payments.forEach((p) => {
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = (monthly[key] ?? 0) + p.amount;
    });
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, revenue]) => ({
        month: new Date(`${month}-01`).toLocaleString('en-US', { month: 'short' }),
        revenue: Math.round(revenue),
      }));
  };

  const getTotalStorageUsed = () => getStorageSummary(hosting, vps).totalStorage;

  const getRecentDomains = (limit = 5) =>
    [...domains].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);

  const getRecentSubscriptions = (limit = 5) =>
    [...subscriptions].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).slice(0, limit);

  const getRecentWebsites = (limit = 5) =>
    [...websites].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);

  // ─── Context Value ─────────────────────────────────────────────────────────

  const value: InvoiceContextType = {
    company, currentCompany, allCompanies,
    users, roles, clients, invoices, websites, domains,
    domainSubscriptions, subscriptions, payments, transfers,
    emails, vps, hosting, emailPlans, vpsPlans, hostingPlans, cloudHostingPlans, clientGroups,
    mobileApps, isLoading,
    updateCompany, setActiveCompany, addTenantCompany, updateTenantCompany, deleteTenantCompany,
    addUser, updateUser, deleteUser,
    addRole, updateRole, deleteRole,
    addClient, updateClient, deleteClient, getClient,
    addClientGroup, updateClientGroup, deleteClientGroup, toggleClientInGroup,
    addInvoice, updateInvoice, deleteInvoice, getInvoice, duplicateInvoice, markAsPaid,
    addWebsite, updateWebsite, deleteWebsite, getWebsite,
    addDomain, updateDomain, deleteDomain, getDomain, renewDomain,
    addSubscription, updateSubscription, deleteSubscription, getSubscription, cancelSubscription, renewSubscription,
    renewSubscriptionWithSchedule,
    addPayment,
    addTransfer, updateTransfer, deleteTransfer, getTransfer,
    addEmail, updateEmail, deleteEmail, getEmail,
    addVPS, updateVPS, deleteVPS, getVPS,
    addHosting, updateHosting, deleteHosting, getHosting, suspendHosting, renewHosting,
    addMobileApp, updateMobileApp, deleteMobileApp, getMobileApp, setMobileAppStatus,
    getTotalRevenue, getPaidRevenue, getPendingRevenue, getTotalInvoices,
    getRecentInvoices, getInvoicesByClient, getMonthlyRevenue, getTotalStorageUsed,
    getRecentDomains, getRecentSubscriptions, getRecentWebsites,
    updateEmailPlans: setEmailPlans,
    updateVpsPlans: setVpsPlans,
    updateHostingPlans: setHostingPlans,
    updateCloudHostingPlans: setCloudHostingPlans,
  };

  return <InvoiceContext.Provider value={value}>{children}</InvoiceContext.Provider>;
}

export function useInvoiceData(): InvoiceContextType {
  const context = useContext(InvoiceContext);
  if (context === undefined) {
    throw new Error('useInvoiceData must be used within an InvoiceProvider');
  }
  return context;
}
