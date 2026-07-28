import { Award, Heart, ShieldCheck, Truck, Users } from 'lucide-react';

interface AboutViewProps {
  setCurrentView?: (view: string) => void;
}

export default function AboutView({ setCurrentView }: AboutViewProps) {
  return (
    <div id="about-view" className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-16 space-y-12">
      {/* Page Title */}
      <div className="text-center space-y-2">
        <h1 className="font-display text-4xl font-black text-brand-text">About ArwalEats</h1>
        <p className="text-sm text-brand-text-sec font-semibold max-w-lg mx-auto leading-relaxed">
          Arwal's ultimate hyperlocal food delivery service. Bridging the gap between the town's best culinary hubs and your doorstep with lightning speed.
        </p>
      </div>

      {/* Grid: Story Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-brand-bg-sec/55 border border-brand-card rounded-3xl p-6 md:p-12 shadow-sm">
        <div className="space-y-4">
          <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest bg-brand-accent/10 px-2.5 py-1 rounded-md">
            Our Mission
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-black text-brand-text">
            Born to solve Arwal's food delivery challenge
          </h2>
          <p className="text-xs text-brand-text-sec leading-relaxed font-semibold">
            In 2024, our founders looked around Arwal and noticed a massive gap: getting piping hot, high-quality restaurant food delivered fresh in under 30 minutes was nearly impossible. Delivery options were slow, uncoordinated, and unreliable.
          </p>
          <p className="text-xs text-brand-text-sec leading-relaxed font-semibold">
            That is why we launched <strong className="text-brand-text">ArwalEats</strong>—not as a single restaurant, but as a dedicated, fully managed **hyperlocal food delivery infrastructure and marketplace**. We partner with top local kitchens, coordinate instant rider dispatches, and optimize delivery paths so that your food arrives fresh, clean, and extremely hot!
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border-4 border-white shadow-xl bg-white flex items-center justify-center">
          <img
            src="https://plain-apac-prod-public.komododecks.com/202606/30/Ul1Pc1CY3iYbhJMjdntJ/image.png"
            alt="Food Delivery Service"
            className="w-full h-auto object-contain"
          />
        </div>
      </div>

      {/* Platform Portals */}
      <div className="bg-[#fef6e4] border border-amber-200/60 rounded-2xl p-6 md:p-8 space-y-3">
        <h3 className="font-display text-xs font-bold uppercase tracking-widest text-brand-text-sec mb-2">
          Platform Portals
        </h3>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => setCurrentView && setCurrentView('admin')}
            className="flex items-center gap-2 text-left font-bold text-lg md:text-xl text-[#F62440] hover:opacity-80 transition-opacity cursor-pointer w-max"
          >
            <span className="text-xl">🛡️</span>
            <span>Admin Portal</span>
          </button>
        </div>
      </div>

      {/* Mission & Vision Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-brand-card p-6 rounded-2xl space-y-3">
          <div className="h-10 w-10 bg-brand-accent/10 rounded-full flex items-center justify-center text-brand-accent">
            <Award size={20} />
          </div>
          <h3 className="font-display font-bold text-base text-brand-text">Our Service Promise</h3>
          <p className="text-xs text-brand-text-sec font-semibold leading-relaxed">
            To provide the most reliable, hygienic, and fastest food delivery service in Arwal. We make delicious restaurant food accessible to every household by employing real-time order routing and dedicated delivery partners.
          </p>
        </div>

        <div className="bg-white border border-brand-card p-6 rounded-2xl space-y-3">
          <div className="h-10 w-10 bg-brand-success/10 rounded-full flex items-center justify-center text-brand-success">
            <ShieldCheck size={20} />
          </div>
          <h3 className="font-display font-bold text-base text-brand-text">Our Network Vision</h3>
          <p className="text-xs text-brand-text-sec font-semibold leading-relaxed">
            To build Arwal's leading digital delivery network. By integrating top restaurant kitchens with our lightning-fast rider fleet and our Google Sheets order tracker database, we maintain absolute delivery accuracy and hyper-fast response times.
          </p>
        </div>
      </div>

      {/* Developer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center bg-gradient-to-br from-brand-accent/5 to-white border-2 border-brand-accent/20 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="lg:col-span-1 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative group">
            {/* Elegant outer rings */}
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-accent to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative max-w-[200px] rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-brand-bg-sec">
              <img
                src="https://plain-apac-prod-public.komododecks.com/202606/29/dk5dvf3YfpimQZxYTTOx/image.jpg"
                alt="Guddu - Lead Software Engineer"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-black text-lg text-brand-text">Guddu</h3>
            <p className="text-[10px] font-bold text-brand-accent uppercase tracking-wider bg-brand-accent/10 px-2.5 py-0.5 rounded-full inline-block">
              Lead Software Engineer
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest bg-brand-accent/10 px-2.5 py-1 rounded-md">
            The Brain Behind the Platform
          </span>
          <h2 className="font-display text-xl md:text-2xl font-black text-brand-text">
            Meet Our Chief Technology Engineer
          </h2>
          <p className="text-xs text-brand-text-sec leading-relaxed font-semibold">
            The seamless digital architecture powering <strong className="text-brand-text">ArwalEats</strong> was engineered by <strong className="text-brand-text">Guddu</strong>, an exceptional Software Engineer and Computer Science student from the prestigious <strong className="text-brand-text">Panjab University</strong>.
          </p>
          <p className="text-xs text-brand-text-sec leading-relaxed font-semibold">
            Leveraging cutting-edge modern React paradigms, lightning-fast order state synchronization, and robust Google Sheets database connections, Guddu single-handedly designed, built, and optimized this complete hyperlocal delivery ecosystem. From the client-side experience to the automated rider-dispatch and admin control systems, his work represents the perfect fusion of software engineering and local community utility.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-[10px] font-bold font-mono bg-brand-bg-sec border border-brand-card px-2.5 py-1 rounded-lg text-brand-text">
              🎓 Panjab University
            </span>
            <span className="text-[10px] font-bold font-mono bg-brand-bg-sec border border-brand-card px-2.5 py-1 rounded-lg text-brand-text">
              💻 Computer Science & Engineering
            </span>
            <span className="text-[10px] font-bold font-mono bg-brand-bg-sec border border-brand-card px-2.5 py-1 rounded-lg text-brand-text">
              🚀 Full-Stack React Architecture
            </span>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="space-y-6">
        <h3 className="font-display text-2xl font-black text-brand-text text-center">Why Arwal Chooses ArwalEats Delivery</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 text-center space-y-2.5">
            <div className="h-12 w-12 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center mx-auto shadow-sm">
              <Truck size={22} />
            </div>
            <h4 className="font-display font-bold text-sm text-brand-text">Piping Hot in 30 Mins</h4>
            <p className="text-xs text-brand-text-sec font-semibold leading-relaxed">
              Our active fleet of riders coordinates instantly with partner restaurants. As soon as the meal is packed, our delivery boy handles the run to your home.
            </p>
          </div>

          <div className="p-6 text-center space-y-2.5">
            <div className="h-12 w-12 rounded-full bg-brand-warning/10 text-brand-warning flex items-center justify-center mx-auto shadow-sm">
              <Heart size={22} className="fill-brand-warning/20" />
            </div>
            <h4 className="font-display font-bold text-sm text-brand-text">Vetted Partners & Riders</h4>
            <p className="text-xs text-brand-text-sec font-semibold leading-relaxed">
              We vet every partner kitchen for strict hygiene and sanitize all delivery bags daily. Your food stays entirely secure and untouched during transit.
            </p>
          </div>

          <div className="p-6 text-center space-y-2.5">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto shadow-sm">
              <Users size={22} />
            </div>
            <h4 className="font-display font-bold text-sm text-brand-text">Dedicated Delivery Team</h4>
            <p className="text-xs text-brand-text-sec font-semibold leading-relaxed">
              Our massive community delivery team serves residential blocks, offices, and colleges across Arwal with unparalleled care and speed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
