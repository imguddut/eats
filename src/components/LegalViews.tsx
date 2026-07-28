import { Shield, Lock, CreditCard } from 'lucide-react';

interface LegalViewsProps {
  type: 'terms' | 'privacy';
}

export default function LegalViews({ type }: LegalViewsProps) {
  if (type === 'privacy') {
    return (
      <div id="privacy-policy-view" className="max-w-4xl mx-auto px-4 md:px-6 py-8 pb-16 space-y-6">
        <div className="border-b border-brand-card pb-3">
          <h1 className="font-display text-3xl font-black text-brand-text flex items-center gap-2">
            <Lock className="text-brand-accent shrink-0" size={28} />
            Privacy Policy
          </h1>
          <p className="text-xs text-brand-text-sec font-semibold">Last updated: June 28, 2026</p>
        </div>

        <div className="space-y-4 text-xs text-brand-text-sec font-semibold leading-relaxed">
          <p>
            At ArwalEats ("we", "our", or "us"), we value your privacy and security. This Privacy Policy documents how we collect, use, and safe-guard your information when you register, log in, order food, or use our website.
          </p>

          <h3 className="font-display font-bold text-sm text-brand-text pt-2">1. Information We Collect</h3>
          <p>
            When you register on ArwalEats, we collect your name, email, phone number, physical delivery address, city, and pincode. This information is required to securely process and deliver your meals hot and fresh. If you choose to connect your Google Sheets Database, your credentials are saved locally on your browser and run through Google security firewalls.
          </p>

          <h3 className="font-display font-bold text-sm text-brand-text pt-2">2. How We Use Your Data</h3>
          <ul className="list-disc pl-4 space-y-1">
            <li>To manage your customer login and personal dashboard history.</li>
            <li>To transmit order items securely to our partner kitchens and assigned delivery partners.</li>
            <li>To calculate precise delivery fees and validate coupon discounts based on order subtotals.</li>
            <li>To offer localized WhatsApp customer service notifications.</li>
          </ul>

          <h3 className="font-display font-bold text-sm text-brand-text pt-2">3. Cookie Configuration</h3>
          <p>
            We use essential security cookies and browser LocalStorage to maintain your active login sessions and remember items placed inside your cart. Disabling LocalStorage will restrict you from adding items to your cart, registering accounts, or placing orders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="terms-conditions-view" className="max-w-4xl mx-auto px-4 md:px-6 py-8 pb-16 space-y-6">
      <div className="border-b border-brand-card pb-3">
        <h1 className="font-display text-3xl font-black text-brand-text flex items-center gap-2">
          <Shield className="text-brand-accent shrink-0" size={28} />
          Terms & Conditions
        </h1>
        <p className="text-xs text-brand-text-sec font-semibold">Last updated: June 28, 2026</p>
      </div>

      <div className="space-y-4 text-xs text-brand-text-sec font-semibold leading-relaxed">
        <p>
          Welcome to ArwalEats ("Website"). By accessing, browsing, or ordering from this Website, you acknowledge that you have read, understood, and agreed to be bound by these Terms and Conditions.
        </p>

        <h3 className="font-display font-bold text-sm text-brand-text pt-2">1. Account Registration</h3>
        <p>
          To place food orders, apply coupons, or track deliveries, you must create an authorized customer account. You are solely responsible for protecting your account credentials and password details. You must notify us immediately if you suspect any unauthorized access to your account profile.
        </p>

        <h3 className="font-display font-bold text-sm text-brand-text pt-2">2. Pricing & Payments</h3>
        <p>
          All prices displayed on ArwalEats are in Indian Rupees (₹) and correspond directly to specific variants (e.g., Half, Full, Regular portion dimensions). Delivery charges are dynamic based on service range: ₹20 for Arwal Local (0 - 3 km), ₹40 for Surrounding areas (3 - 5 km), and ₹60 for Rural outskirts (5 - 10 km). Delivery is restricted to a maximum 10 km service radius. We support Cash on Delivery (COD), simulated UPI requests, and Credit Cards.
        </p>

        <h3 className="font-display font-bold text-sm text-brand-text pt-2">3. Cancellation & Refund Policy</h3>
        <p>
          Since our partner kitchens prepare every order fresh on-demand, orders cannot be cancelled once they have transitioned to the <strong className="text-brand-text">"Accepted"</strong> or <strong className="text-brand-text">"Preparing"</strong> status on the timeline. Refunds are processed solely if food is delivered damaged, incorrect, or if delivery is delayed beyond 60 minutes due to partner negligence.
        </p>

        <h3 className="font-display font-bold text-sm text-brand-text pt-2">4. Disclaimers of Liability</h3>
        <p>
          This website is built for premium food ordering. All API transactions and Google Sheets database scripts are run client-side. While we strive to maintain 100% server uptime, we are not liable for delayed orders resulting from Google Sheets API quota limits or intermittent cellular networks.
        </p>
      </div>
    </div>
  );
}
