'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  HelpCircle, 
  Mail, 
  Search, 
  ExternalLink, 
  Book, 
  ShieldCheck, 
  Zap, 
  CreditCard,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CATEGORIES_RAW = [
  { id: 'start', title: 'Getting Started', icon: Zap, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/20' },
  { id: 'hosting', title: 'Hosting & Server', icon: Book, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
  { id: 'billing', title: 'Billing & Payments', icon: CreditCard, color: 'text-green-500 bg-green-50 dark:bg-green-950/20' },
  { id: 'security', title: 'Security & Safety', icon: ShieldCheck, color: 'text-red-500 bg-red-50 dark:bg-red-950/20' },
];

const FAQS = [
  // Getting Started
  {
    category: 'start',
    question: "How do I create my first VPS?",
    answer: "Go to the VPS section in your sidebar, click on 'Add VPS', select your desired plan and operating system. Once payment is confirmed, your server will be provisioned instantly."
  },
  {
    category: 'start',
    question: "What is the difference between Web Hosting and Cloud Hosting?",
    answer: "Web Hosting is shared among multiple users and is great for small to medium websites. Cloud Hosting provides dedicated resources (CPU/RAM) and isolated environments, suitable for high-traffic or resource-intensive applications."
  },
  {
    category: 'start',
    question: "How can I set up a custom email @mydomain.com?",
    answer: "First, ensure you have an active Email Plan. Then, go to the 'Emails' section, click 'Add Email', and follow the prompt to link it to your registered domain."
  },
  {
    category: 'start',
    question: "Where do I find my API key for integrations?",
    answer: "API keys are accessible under Management > API Access. You can generate multiple keys with different permission levels for your automation tools."
  },
  {
    category: 'start',
    question: "How do I migrate from cPanel to Pencil Panel?",
    answer: "We offer a 'Full Migration' tool in the Websites > Migrations section. Simply provide your cPanel backup file or server credentials, and our system will handle the data transfer automatically."
  },
  // Hosting & Server
  {
    category: 'hosting',
    question: "How do I upgrade my hosting plan?",
    answer: "You can upgrade your plan at any time through the Hosting > Hosting Overview section. Simply select your active hosting, click 'Upgrade Plan', and choose your new package. The cost will be pro-rated."
  },
  {
    category: 'hosting',
    question: "What is the auto-renew feature?",
    answer: "Auto-renew automatically generates a renewal invoice 7 days before your service expires. If paid, your service will be extended without any downtime."
  },
  {
    category: 'hosting',
    question: "How do I access my MySQL databases?",
    answer: "MySQL management is available within the control panel of each hosting account. You can create databases, users, and use phpMyAdmin for direct table management."
  },
  {
    category: 'hosting',
    question: "Do you offer automated daily backups?",
    answer: "Yes! All our Web and Cloud hosting plans include automated daily backups. You can restore your files or databases directly from the 'Backups' tab in your hosting management."
  },
  {
    category: 'hosting',
    question: "How can I change my PHP version?",
    answer: "Navigate to your hosting settings, look for 'Advanced' or 'PHP Settings', and you will find a dropdown to toggle between PHP 7.4, 8.0, 8.1, 8.2, and 8.3."
  },
  // Billing & Payments
  {
    category: 'billing',
    question: "Where can I find my unpaid invoices?",
    answer: "All your financial records are under the Invoices section. You can filter by 'Unpaid' status to see pending payments and pay them using your available balance or credit card."
  },
  {
    category: 'billing',
    question: "Can I pay using Cryptocurrency?",
    answer: "Currently, we support Credit/Debit Cards, PayPal, and Bank Transfers. Cryptocurrency support is planned for Q3 2026."
  },
  {
    category: 'billing',
    question: "How do I request a refund?",
    answer: "Refunds are processed according to our 30-day money-back guarantee. Open a support ticket within 30 days of purchase to request a full refund to your original payment method."
  },
  {
    category: 'billing',
    question: "What happens if a payment fails?",
    answer: "If a renewal payment fails, we will notify you via email. You will have a grace period of 3 days to settle the invoice before the service is automatically suspended."
  },
  {
    category: 'billing',
    question: "Do you offer recurring billing discounts?",
    answer: "Yes, customers who choose 'Yearly' billing cycles enjoy an automatic 15-20% discount compared to monthly subscriptions."
  },
  // Security & Safety
  {
    category: 'security',
    question: "How do I enable 2FA on my account?",
    answer: "Go to Account Settings > Security and toggle the Two-Factor Authentication switch. We support Google Authenticator, Authy, and hardware keys like Yubikey."
  },
  {
    category: 'security',
    question: "Are your SSL certificates free?",
    answer: "Absolutely! We provide free Let's Encrypt SSL certificates for all domains hosted on our platform. They auto-renew every 90 days."
  },
  {
    category: 'security',
    question: "What is DDoS Protection?",
    answer: "Our network is protected by enterprise-grade DDoS mitigation layers that can handle up to 2Tbps of attack traffic, ensuring your website remains online during malicious attacks."
  },
  {
    category: 'security',
    question: "How can I block specific IP addresses?",
    answer: "You can use the 'IP Blocker' tool in your Hosting Management dashboard to prevent specific IPs or ranges from accessing your website."
  },
  {
    category: 'security',
    question: "Can I hide my personal information from WHOIS lookups?",
    answer: "Yes, 'Whois Privacy Protection' is available for most domain extensions. You can enable it during registration or later in the Domain Portfolio management."
  }
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    return CATEGORIES_RAW.map(cat => ({
      ...cat,
      count: FAQS.filter(f => f.category === cat.id).length
    }));
  }, []);

  const filteredFaqs = useMemo(() => {
    return FAQS.filter(faq => {
      const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory ? faq.category === activeCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const handleCategoryClick = (id: string) => {
    if (activeCategory === id) {
      setActiveCategory(null);
      toast.info("Showing all questions");
    } else {
      setActiveCategory(id);
      const cat = categories.find(c => c.id === id);
      toast.success(`Filtering by ${cat?.title}`);
      setOpenFaq(0); // View first result
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground shadow-xl">
        <div className="absolute inset-0 bg-linear-to-br from-primary/50 to-primary opacity-50" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/20">
             <HelpCircle className="h-3 w-3" />
             OFFICIAL PENCIL SUPPORT
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight drop-shadow-sm">
            How can we help?
          </h1>
          <p className="text-primary-foreground/80 max-w-lg mx-auto">
            Search our dynamic knowledge base, browse categories, or contact our support team.
          </p>
          <div className="relative max-w-xl mx-auto shadow-2xl rounded-2xl overflow-hidden">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search for answers..." 
              className="h-14 pl-12 bg-background text-foreground border-none focus-visible:ring-0 text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Browse by Category</h2>
          {activeCategory && (
            <Button variant="ghost" size="sm" onClick={() => setActiveCategory(null)} className="text-muted-foreground">
              Clear Filter
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Card 
              key={cat.id} 
              onClick={() => handleCategoryClick(cat.id)}
              className={cn(
                "group transition-all cursor-pointer p-6 hover:shadow-lg border-2",
                activeCategory === cat.id ? "border-primary bg-primary/5 shadow-md" : "hover:border-primary/30 border-transparent"
              )}
            >
              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", cat.color)}>
                <cat.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg mb-1">{cat.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">Documentation and tutorials.</p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs font-medium text-muted-foreground">{cat.count} Articles</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* FAQs */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">
              {activeCategory ? `${categories.find(c => c.id === activeCategory)?.title} FAQ` : 'Popular Questions'}
            </h2>
            <span className="text-sm text-muted-foreground">{filteredFaqs.length} results</span>
          </div>
          
          <div className="space-y-3">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, idx) => (
                <Card 
                  key={idx} 
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    openFaq === idx ? "border-primary bg-muted/10 shadow-sm" : "hover:border-muted-foreground/30"
                  )}
                >
                  <button 
                    className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  >
                    <span className="font-bold text-base">{faq.question}</span>
                    {openFaq === idx ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-5 pt-0 text-muted-foreground text-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                      {faq.answer}
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-bold">No results found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search or category filters.</p>
                <Button variant="link" onClick={() => {setSearchQuery(''); setActiveCategory(null);}} className="mt-2">
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Contact Sidebar */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Need Support?</h2>
          <div className="space-y-4">
            <Card className="p-6 bg-primary/5 border-primary/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3">
                 <div className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" title="System Online" />
              </div>
              <MessageSquare className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Live Chat</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Chat with our support team for immediate help with your account.
              </p>
              <Button 
                className="w-full h-11 font-bold shadow-lg shadow-primary/10 transition-transform active:scale-95"
                onClick={() => toast.info("Initializing Secure Chat...", { description: "Connecting to support server." })}
              >
                Launch Messenger
              </Button>
            </Card>

            <Card className="p-6">
              <Mail className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Email Desk</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                For detailed inquiries or technical issues, send us a ticket.
              </p>
              <Button 
                variant="outline" 
                className="w-full h-11 font-bold hover:bg-primary hover:text-white transition-colors"
                onClick={() => {
                  window.location.href = "mailto:support@dipencil.com";
                  toast.success("Opening your mail client...");
                }}
              >
                support@dipencil.com
              </Button>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
