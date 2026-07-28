import { Mail, Phone, MapPin, MessageSquare, Facebook, Instagram, Heart } from 'lucide-react';

interface FooterProps {
  setCurrentView: (view: string) => void;
}

export default function Footer({ setCurrentView }: FooterProps) {
  const handleNavClick = (view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="app-footer" className="bg-brand-bg-sec border-t border-brand-card pt-12 pb-24 md:pb-12 text-brand-text">
      <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        {/* About Section */}
        <div id="footer-about" className="space-y-4">
          <button onClick={() => handleNavClick('home')} className="flex items-center gap-2 text-left focus:outline-none">
            <div className="h-9 w-9 rounded-lg bg-brand-accent flex items-center justify-center text-white shadow-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                className="w-5.5 h-5.5"
                fill="none"
              >
                {/* Dome knob / handle */}
                <circle cx="55" cy="22" r="3" fill="currentColor" />
                
                {/* Dome of the cloche */}
                <path
                  d="M 36 45 A 19 19 0 0 1 74 45 Z"
                  fill="currentColor"
                />
                
                {/* Shiny accent line inside dome */}
                <path
                  d="M 43 40 A 14 14 0 0 1 67 40"
                  stroke="#F62440"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Plate */}
                <rect x="29" y="46" width="52" height="4" rx="2" fill="currentColor" />

                {/* Drip shape */}
                <path
                  d="M 51 50 C 51 54, 52.5 56, 52.5 58 C 52.5 59.5, 53.5 61, 55 61 C 56.5 61, 57.5 59.5, 57.5 58 C 57.5 56, 59 54, 59 50 Z"
                  fill="currentColor"
                />

                {/* Small drop under the drip */}
                <circle cx="55" cy="66" r="2" fill="currentColor" />

                {/* Speed lines */}
                <rect x="21" y="38" width="6" height="2" rx="1" fill="currentColor" />
                <rect x="13" y="43" width="13" height="2" rx="1" fill="currentColor" />
                <rect x="17" y="48" width="8" height="2" rx="1" fill="currentColor" />
              </svg>
            </div>
            <span className="font-display text-lg font-black tracking-tight text-brand-text">
              Arwal<span className="text-brand-accent">Eats</span>
            </span>
          </button>
          <p className="text-xs text-brand-text-sec leading-relaxed">
            Delivering hot, fresh, and mouth-watering meals right to your doorstep. Inspired by your cravings, crafted with premium freshness, delivered with lighting speed.
          </p>
          {/* Social Icons */}
          <div className="flex items-center gap-3 pt-2">
            <a href="https://www.facebook.com/profile.php?id=61591598768609" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-brand-card/40 hover:bg-brand-accent hover:text-white text-brand-text-sec transition-colors">
              <Facebook size={16} />
            </a>
            <a href="https://www.instagram.com/arwaleats/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-brand-card/40 hover:bg-brand-accent hover:text-white text-brand-text-sec transition-colors">
              <Instagram size={16} />
            </a>
          </div>
        </div>

        {/* Quick Navigation */}
        <div id="footer-quick-links" className="space-y-4">
          <h4 className="font-display text-sm font-bold text-brand-text uppercase tracking-wider border-b border-brand-card/60 pb-1.5 w-max">
            Quick Links
          </h4>
          <ul className="space-y-2 text-xs font-semibold text-brand-text-sec">
            <li>
              <button onClick={() => handleNavClick('home')} className="hover:text-brand-accent transition-colors cursor-pointer">
                Home
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick('menu')} className="hover:text-brand-accent transition-colors cursor-pointer">
                Explore Menu
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick('about')} className="hover:text-brand-accent transition-colors cursor-pointer">
                About Our Story
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick('contact')} className="hover:text-brand-accent transition-colors cursor-pointer">
                Contact & Support
              </button>
            </li>
          </ul>
        </div>

        {/* Support & Legal */}
        <div id="footer-support-links" className="space-y-4">
          <h4 className="font-display text-sm font-bold text-brand-text uppercase tracking-wider border-b border-brand-card/60 pb-1.5 w-max">
            Support & Legal
          </h4>
          <ul className="space-y-2 text-xs font-semibold text-brand-text-sec">
            <li>
              <button onClick={() => handleNavClick('privacy')} className="hover:text-brand-accent transition-colors cursor-pointer">
                Privacy Policy
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick('terms')} className="hover:text-brand-accent transition-colors cursor-pointer">
                Terms & Conditions
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick('privacy')} className="hover:text-brand-accent transition-colors cursor-pointer">
                Refund & Return Policy
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick('about')} className="hover:text-brand-accent transition-colors cursor-pointer">
                Frequently Asked Questions (FAQ)
              </button>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div id="footer-contact-info" className="space-y-4">
          <h4 className="font-display text-sm font-bold text-brand-text uppercase tracking-wider border-b border-brand-card/60 pb-1.5 w-max">
            Contact Us
          </h4>
          <ul className="space-y-2.5 text-xs text-brand-text-sec font-semibold">
            <li className="flex items-center gap-2">
              <Phone className="text-brand-accent shrink-0" size={14} />
              <span>+91 81021 23746</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="text-brand-accent shrink-0" size={14} />
              <span>arwaleats@gmail.com</span>
            </li>
            <li className="flex items-center gap-2 pt-1">
              <a
                href="https://wa.me/918102123746"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold text-[11px] transition-colors shadow-sm"
              >
                <MessageSquare size={12} />
                WhatsApp Chat
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 h-px bg-brand-card/50" />

      {/* Copyright Bar */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 flex flex-col md:flex-row items-center justify-between text-[11px] font-semibold text-brand-text-sec text-center md:text-left gap-3">
        <p>© 2026 ArwalEats Restaurant. All rights reserved.</p>
        <p className="flex items-center gap-1">
          Made with <Heart size={10} className="text-brand-accent fill-brand-accent animate-pulse" /> for delicious food lovers
        </p>
      </div>
    </footer>
  );
}
