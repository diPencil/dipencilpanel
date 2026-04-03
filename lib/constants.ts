import { SystemCompany as Company, Client, Invoice, Website, Domain, DomainSubscription, DomainTransfer, Email, VPS, Subscription, Payment, Hosting, HostingPlan, CloudHostingPlan, Role, User, Company as TenantCompany } from './types';

// Default company data
export const DEFAULT_COMPANY: Company = {
  id: 'sys-1',
  name: 'Pencil Panel',
  logo: '/pencil-logo.png',
  invoiceLogo: '/hostinger-black.svg',
  address: 'Cairo, Egypt',
  email: 'support@dipencil.com',
  phone: '+20 100 377 8273',
  vatNumber: 'TAX-123-456',
  currency: 'USD',
  taxRate: 14,
  exchangeRates: { EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.53, EGP: 50.0, SAR: 3.75 },
  status: 'active',
  createdAt: new Date().toISOString(),
  userCount: 0,
  ownerName: 'System Admin'
};

// Sample Companies (Tenants)
export const SAMPLE_COMPANIES: TenantCompany[] = [];

const DEFAULT_PERMISSIONS = { view: true, create: true, edit: true, delete: true };
const READ_ONLY_PERMISSIONS = { view: true, create: false, edit: false, delete: false };

// Sample Roles
export const SAMPLE_ROLES: Role[] = [];

// Sample Users
export const SAMPLE_USERS: User[] = [];

// Default Nameservers per Registrar
export const REGISTRAR_NAMESERVERS: Record<string, string[]> = {
  'Hostinger': ['ns1.dns-parking.com', 'ns2.dns-parking.com'],
  'GoDaddy': ['ns01.domaincontrol.com', 'ns02.domaincontrol.com'],
  'Namecheap': ['dns1.registrar-servers.com', 'dns2.registrar-servers.com'],
  'Cloudflare': ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
  'Google Domains': ['ns-cloud-a1.googledomains.com', 'ns-cloud-a2.googledomains.com'],
  'Bluehost': ['ns1.bluehost.com', 'ns2.bluehost.com'],
};

export const HOSTING_PLANS: HostingPlan[] = [
  {
    id: 'web-single',
    name: 'Single',
    type: 'web',
    originalPrice: { monthly: 9.99, yearly: 107.88 },
    price: { monthly: 1.49, yearly: 17.88 },
    discount: 85,
    freeMonths: 3,
    resources: { cpu: 'Shared', ram: '768 MB', storage: '10 GB SSD', bandwidth: '100 GB' },
    features: [
      'Create 1 website',
      '10 GB of fast storage for your files (SSD)',
      '1 mailbox per website — free for 1 year',
      'Managed WordPress & WordPress Builder',
      'Free SSL & DDoS protection',
      'Weekly auto backups',
      'Free site migration',
      'PHP/HTML/Node.js support',
    ],
    isPopular: false,
  },
  {
    id: 'web-premium',
    name: 'Premium',
    type: 'web',
    originalPrice: { monthly: 12.49, yearly: 149.88 },
    price: { monthly: 2.49, yearly: 29.88 },
    discount: 80,
    freeMonths: 3,
    resources: { cpu: 'Shared', ram: '1 GB', storage: '20 GB SSD', bandwidth: 'Unlimited' },
    features: [
      'Create up to 3 websites',
      '20 GB of fast storage for your files (SSD)',
      '2 mailboxes per website — free for 1 year',
      'Free domain for 1 year',
      'Managed WordPress & AI Website Builder',
      'Unlimited SSL & Cloudflare protection',
      'Weekly auto backups',
      'Free site migration & Email marketing',
      'PHP/HTML/Node.js support',
    ],
    isPopular: false,
  },
  {
    id: 'web-business',
    name: 'Business',
    type: 'web',
    originalPrice: { monthly: 19.99, yearly: 239.88 },
    price: { monthly: 3.29, yearly: 39.48 },
    discount: 83,
    freeMonths: 3,
    resources: { cpu: 'Shared', ram: '2 GB', storage: '50 GB NVMe', bandwidth: 'Unlimited' },
    features: [
      'Create up to 50 websites',
      '50 GB of world-fastest NVMe storage',
      '5 mailboxes per website — free for 1 year',
      'Daily and on-demand backups',
      'Build an ecommerce site with AI',
      'AI Agent for WordPress & free CDN',
      'Unlimited SSL & Cloudflare protection',
      'WordPress Multisite & Staging Tool',
      'PHP/HTML/Node.js (up to 5 apps)',
    ],
    isPopular: true,
  },
];

// Cloud Hosting Plans
export const CLOUD_HOSTING_PLANS: CloudHostingPlan[] = [
  {
    id: 'cloud-startup',
    name: 'Cloud Startup',
    subtitle: 'Everything in Business, plus specialized cloud features.',
    type: 'cloud',
    originalPrice: { monthly: 27.99, yearly: 335.88 },
    price: { monthly: 6.99, yearly: 83.88 },
    discount: 75,
    freeMonths: 3,
    resources: {
      cpu: '4 CPU cores',
      ram: '4 GB RAM',
      storage: '100 GB SSD',
      bandwidth: 'Unlimited',
      inodes: '2,000,000',
      phpWorkers: '100',
      websites: '100',
      nodeApps: 'Up to 10 apps',
      accessSharing: true,
    },
    features: [
      'Create up to 100 websites',
      '100 GB of fast storage for your files (SSD)',
      '10 mailboxes per website — free for 1 year',
      'Enjoy priority expert support — 24/7',
      'Handle peak traffic with a power boost',
      'Dedicated IP address & 100 PHP workers',
      '2M inodes to scale your files',
      '4 GB RAM for smooth site performance',
      'Managed WordPress & Ecommerce support',
    ],
    isPopular: false,
  },
  {
    id: 'cloud-professional',
    name: 'Cloud Professional',
    subtitle: 'Optimized for scaling professional websites.',
    type: 'cloud',
    originalPrice: { monthly: 47.99, yearly: 575.88 },
    price: { monthly: 15.99, yearly: 191.88 },
    discount: 67,
    freeMonths: 3,
    resources: {
      cpu: '5 CPU cores',
      ram: '6 GB RAM',
      storage: '200 GB SSD',
      bandwidth: 'Unlimited',
      inodes: '3,000,000',
      phpWorkers: '200',
      websites: '100',
      nodeApps: 'Up to 10 apps',
      accessSharing: true,
    },
    features: [
      'Create up to 100 websites',
      '200 GB of fast storage for your files (SSD)',
      '10 mailboxes per website — free for 1 year',
      'Enjoy priority expert support — 24/7',
      'Dedicated IP address & 200 PHP workers',
      '3M inodes to scale your files',
      '6 GB RAM for smooth site performance',
      'Managed WordPress & Ecommerce support',
      'Horizons trial — free credits',
    ],
    isPopular: true,
  },
  {
    id: 'cloud-enterprise',
    name: 'Cloud Enterprise',
    subtitle: 'Maximum performance for your websites.',
    type: 'cloud',
    originalPrice: { monthly: 69.99, yearly: 839.88 },
    price: { monthly: 29.99, yearly: 359.88 },
    discount: 57,
    freeMonths: 3,
    resources: {
      cpu: '6 CPU cores',
      ram: '12 GB RAM',
      storage: '300 GB SSD',
      bandwidth: 'Unlimited',
      inodes: '4,000,000',
      phpWorkers: '300',
      websites: '100',
      nodeApps: 'Up to 10 apps',
      accessSharing: true,
    },
    features: [
      'Create up to 100 websites',
      '300 GB of fast storage for your files (SSD)',
      '10 mailboxes per website — free for 1 year',
      'Enjoy priority expert support — 24/7',
      'Dedicated IP address & 300 PHP workers',
      '4M inodes to scale your files',
      '12 GB RAM for smooth site performance',
      'Managed WordPress & Ecommerce support',
      'Horizons trial — free credits',
    ],
    isPopular: false,
  },
];

// Sample clients
export const SAMPLE_CLIENTS: Client[] = [];

// Sample invoices
export const SAMPLE_INVOICES: Invoice[] = [];

export const INVOICE_STATUSES = ['paid', 'pending', 'overdue'] as const;
export const PAYMENT_STATUSES = ['paid', 'unpaid'] as const;
export const CURRENCIES = ['USD', 'EGP', 'SAR', 'EUR', 'GBP', 'CAD', 'AUD'] as const;

// Sample websites
export const SAMPLE_WEBSITES: Website[] = [];

// Sample domains
export const SAMPLE_DOMAINS: Domain[] = [];

export const SAMPLE_DOMAIN_SUBSCRIPTIONS: DomainSubscription[] = [];
export const SAMPLE_DOMAIN_TRANSFERS: DomainTransfer[] = [];

// Sample email accounts
export const SAMPLE_EMAILS: Email[] = [];

// Sample VPS
export const SAMPLE_VPS: VPS[] = [];

export const SAMPLE_SUBSCRIPTIONS: Subscription[] = [];

export const SAMPLE_PAYMENTS: Payment[] = [];

export const SAMPLE_HOSTING: Hosting[] = [];

export const NAVIGATION_ITEMS = [
  { label: 'Home', href: '/dashboard', icon: 'Home' },
];
