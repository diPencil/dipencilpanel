export interface Company {
  id: string;
  name: string;
  ownerName?: string;
  logo: string;
  invoiceLogo: string;
  /** Custom invoice email header HTML; `{{placeholders}}` replaced when sending. */
  invoiceEmailHeaderHtml?: string | null;
  /** Custom invoice email body HTML (middle); `{{itemsTableRows}}`, `{{totalsBlock}}`, text placeholders. */
  invoiceEmailBodyHtml?: string | null;
  /** Custom invoice email footer HTML; `{{placeholders}}` replaced when sending. */
  invoiceEmailFooterHtml?: string | null;
  /** Subscription reminder email sections — Settings → Reminder email template. */
  reminderEmailHeaderHtml?: string | null;
  reminderEmailBodyHtml?: string | null;
  reminderEmailFooterHtml?: string | null;
  email: string;
  phone: string;
  address: string;
  vatNumber: string;
  currency: string;
  taxRate: number;
  exchangeRates: Record<string, number>;
  status: 'active' | 'suspended';
  createdAt: string;
  userCount: number;
}

export type SystemCompany = Company;

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  companyName: string;
  createdAt: string;
  companyId: string;
  groupId?: string;
  /** System row for diPencil internal invoices; hide from client pickers / lists. */
  isDipencilInternal?: boolean;
}

export interface ClientGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  clientIds: string[];
  createdAt: string;
  companyId: string;
}

// Invoice line item
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  discount: number; // percentage
  vat: number; // percentage
}

export type InvoiceKind = 'client' | 'dipencil';

// Invoice data
export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  /** Normal client billing vs diPencil company invoices. */
  invoiceKind: InvoiceKind;
  counterpartyName?: string | null;
  counterpartyAddress?: string | null;
  subscriptionId?: string;
  serviceType?: 'website' | 'domain' | 'email' | 'vps' | 'hosting' | 'general' | 'mobile_app';
  serviceId?: string;
  serviceName?: string;
  issueDate: string;
  dueDate: string;
  nextBillingDate?: string | null;
  status: 'paid' | 'pending' | 'overdue';
  paymentStatus: 'paid' | 'unpaid';
  currency: string;
  items: InvoiceItem[];
  notes: string;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  companyId: string;
}

/** Website / hosting-style billing: recurring or single charge. */
export type WebsiteBillingCycle = 'monthly' | 'yearly' | 'onetime';

// Website data
export interface Website {
  id: string;
  name: string;
  domain: string;
  type: 'wordpress' | 'node' | 'php' | 'html';
  plan: {
    name: string;
    price: number;
    billingCycle: WebsiteBillingCycle;
  };
  storage: number; // in GB
  bandwidth: number; // in GB
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  linkedDomain?: string;
  renewalDate: string;
  clientId: string;
  companyId: string;
}

// Domain data
export interface Domain {
  id: string;
  name: string;
  tld: string;
  registrar: string;
  expiryDate: string;
  autoRenew: boolean;
  /** Optional reminder before expiry in days (e.g. 7, 14, 21, 30) */
  reminderDays?: number | null;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'expiring' | 'expired' | 'suspended';
  /** Host/service information associated with this domain (optional) */
  host?: {
    id?: string;
    type: 'website' | 'email' | 'vps' | 'custom' | 'none';
    name?: string;
    planName?: string;
    price?: number;
  } | null;
  createdAt: string;
  renewalDate: string;
  clientId: string;
  subscriptionId?: string;
  nextInvoiceDate: string;
  planName: string;
  dnsRecords?: DomainDNSRecord[];
  nameservers: string[];
  linkedServices: DomainLinkedServices;
  notes?: string;
  companyId: string;
}

export interface EmailPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  maxMailboxes: number;
  storage: number; 
  emailsPerDay: number | string;
  features: string[];
  isPopular?: boolean;
}

// Email account data
export interface Email {
  id: string;
  name: string;
  domain: string;
  storage: number; // in GB
  status: 'active' | 'suspended' | 'expired';
  createdAt: string;
  plan: {
    price: number;
    billingCycle: 'monthly' | 'yearly';
  };
  renewalDate: string;
  clientId: string;
  companyId: string;
}

export interface DomainDNSRecord {
  id: string;
  type: 'A' | 'CNAME' | 'MX' | 'TXT';
  host: string;
  value: string;
  ttl: string;
}

export interface DomainLinkedServices {
  websiteIds: string[];
  emailIds: string[];
  vpsIds: string[];
}

export interface VPSPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  cpu: number; // cores
  ram: number; // in GB
  storage: number; // in GB
  bandwidth: string;
  features: string[];
  isPopular?: boolean;
}

// VPS data
export interface VPS {
  id: string;
  name: string;
  status: 'active' | 'expiring' | 'expired' | 'suspended';
  ram: number; // in GB
  storage: number; // in GB
  cpu: number; // cores
  planName: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  createdAt: string;
  renewalDate: string;
  clientId: string;
  companyId: string;
  subscriptionId?: string;
  notes?: string;
}

export interface Hosting {
  id: string;
  name: string;
  clientId: string;
  domainId: string; // Linked domain
  type: 'web' | 'node' | 'wordpress' | 'cloud';
  planName: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'suspended' | 'expired';
  expiryDate: string;
  createdAt: string;
  subscriptionId?: string;
  resources: {
    cpu: string;
    ram: string;
    storage: string;
    bandwidth: string;
  };
  linkedServices: {
    emailIds: string[];
    vpsIds: string[];
  };
  companyId: string;
}

export interface HostingPlan {
  id: string;
  name: string;
  type: Hosting['type'];
  originalPrice?: { monthly: number; yearly: number };
  price: {
    monthly: number;
    yearly: number;
  };
  discount?: number;
  freeMonths?: number;
  resources: Hosting['resources'];
  features: string[];
  isPopular?: boolean;
}

export interface CloudHostingPlan {
  id: string;
  name: string;
  subtitle?: string;
  type: 'cloud';
  originalPrice?: { monthly: number; yearly: number };
  price: { monthly: number; yearly: number };
  discount?: number;
  freeMonths?: number;
  resources: {
    cpu: string;
    ram: string;
    storage: string;
    bandwidth: string;
    inodes?: string;
    phpWorkers?: string;
    websites?: string;
    nodeApps?: string;
    accessSharing?: boolean;
  };
  features: string[];
  isPopular?: boolean;
}

// Mobile Application data
export type MobileAppType = 'android' | 'ios' | 'windows';
export type MobileAppFramework =
  | 'flutter'
  | 'react_native'
  | 'kotlin'
  | 'swift'
  | 'java'
  | 'dart'
  | 'python'
  | 'nodejs'
  | 'native';
export type MobileAppStatus = 'development' | 'live' | 'suspended' | 'expired';
export type MobileAppPlan = 'basic' | 'pro' | 'enterprise';

export interface MobileApp {
  id: string;
  name: string;
  appType: MobileAppType;
  framework: MobileAppFramework;
  description?: string;
  status: MobileAppStatus;
  plan: MobileAppPlan;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  autoRenew: boolean;
  expiryDate?: string;
  // Linked service IDs (soft references)
  domainId?: string;
  hostingId?: string;
  vpsId?: string;
  emailIds: string[];
  clientId: string;
  companyId: string;
  subscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  clientId: string;
  serviceType: 'website' | 'vps' | 'email' | 'domain' | 'hosting' | 'mobile_app';
  serviceName: string; // e.g. dipencil.com / VPS-01
  serviceId: string;
  planName: string;
  billingCycle: 'monthly' | 'yearly';
  price: number;
  /** Your cost from the vendor — internal / Financial Summary only; never invoiced */
  providerPrice?: number | null;
  currency: string;
  startDate: string;
  expiryDate: string;
  nextInvoiceDate?: string;
  autoRenew: boolean;
  status: 'active' | 'expired' | 'suspended' | 'cancelled';
  invoiceId?: string; // Last generated invoice
  notes?: string;
  companyId: string;
  /** Optional domain linked to this subscription (for manual subscriptions) */
  domainId?: string;
}





export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';
export type PermissionModule = 'dashboard' | 'clients' | 'domains' | 'hosting' | 'emails' | 'vps' | 'websites' | 'mobile_apps' | 'billing' | 'users' | 'companies' | 'roles';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Record<PermissionModule, ModulePermissions>;
  companyId: string;
  userCount?: number;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  roleId: string;
  companyId: string;
  status: 'active' | 'disabled';
  lastLogin?: string;
  lastLogoutAt?: string;
  avatar?: string;
}

export interface Payment {
  id: string;
  clientId: string;
  clientName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  method: 'card' | 'cash' | 'bank';
  date: string;
  status: 'completed' | 'failed' | 'refunded';
  companyId: string;
}

export interface DomainSubscription {
  id: string;
  domainId: string;
  clientId: string;
  type: 'domain';
  planName: string;
  billingCycle: 'yearly';
  price: number;
  startDate: string;
  expiryDate: string;
  nextInvoiceDate: string;
  autoRenew: boolean;
  status: 'active' | 'expired' | 'suspended';
  source: 'registration' | 'transfer' | 'renewal';
  invoiceId?: string;
}

export interface DomainTransfer {
  id: string;
  domainName: string;
  tld: string;
  clientId: string;
  previousProvider: string;
  transferDate: string;
  expiryDate: string;
  subscriptionDuration: 12 | 24;
  price: number;
  status: 'pending' | 'completed' | 'failed';
  autoRenew: boolean;
  notes?: string;
  createdAt: string;
  domainId?: string;
}

// Generic Service interface for linking to invoices
export interface Service {
  id: string;
  type: 'website' | 'domain' | 'email' | 'vps' | 'hosting';
  serviceId: string; // References the actual ID of website/domain/email/vps
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  status: string;
}

// API Response types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
