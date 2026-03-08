import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Users,
  ArrowRight,
  Gift,
  Target,
  Trophy,
  Clock,
  Percent,
  Send,
  ChevronRight,
  Sparkles,
  Shield,
  TrendingUp,
} from "lucide-react";
import XIcon from "@/components/icons/XIcon";
 import arxonLogo from "@/assets/arxon-logo-full.jpg";
import { useState, useEffect, memo, useRef } from "react";

// Animated counter
const AnimatedCounter = memo(({ end, suffix = "" }: { end: number; suffix?: string }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end]);

  return <span>{count}{suffix}</span>;
});
AnimatedCounter.displayName = "AnimatedCounter";

// Scroll-triggered animated stat for active miners
const ScrollAnimatedStat = memo(() => {
  const { ref, isVisible } = useScrollAnimation();
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isVisible && !hasAnimated.current) {
      hasAnimated.current = true;
      const duration = 2500;
      const end = 10000;
      let startTime: number;
      let animationFrame: number;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * end));
        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [isVisible]);

  return (
    <div ref={ref} className="text-center">
      <div className="inline-flex items-center gap-4 px-8 py-6 rounded-2xl bg-card/40 border border-border/30 backdrop-blur-sm">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl md:text-5xl lg:text-6xl font-black text-primary">
            {count.toLocaleString()}+
          </span>
          <span className="text-lg md:text-xl text-muted-foreground font-medium">
            Active Miners
          </span>
        </div>
      </div>
    </div>
  );
});
ScrollAnimatedStat.displayName = "ScrollAnimatedStat";

// Scroll animation hook
const useScrollAnimation = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
};

export default function Landing() {
  const navigate = useNavigate();
  
  // Smooth scroll for anchor links
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (anchor) {
        e.preventDefault();
        const id = anchor.getAttribute('href')?.slice(1);
        const element = document.getElementById(id || '');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  const features = [
    { icon: Zap, title: "Browser Mining", description: "Start mining with one click. No hardware needed — earn ARX-P directly from your browser, 24/7." },
    { icon: Gift, title: "Referral Rewards", description: "Earn 100 ARX-P per referral plus 5% lifetime boost on all their mining earnings." },
    { icon: Target, title: "Daily Tasks", description: "Complete simple tasks like following @arxonarx on X and joining Discord for bonus ARX-P." },
    { icon: Trophy, title: "Arena Battles", description: "Stake your points in prediction markets. Win big from the pool when your side wins." },
    { icon: Send, title: "Nexus Transfers", description: "Send ARX-P to other users and earn 2.5 ARX-P boost to your mining rate per transaction." },
    { icon: TrendingUp, title: "Leaderboard", description: "Compete with thousands of miners. Top 100 get exclusive rewards and recognition." },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Gradient overlays */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[400px] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] opacity-40" style={{ background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.3) 0%, transparent 60%)" }} />
        <div className="absolute top-1/3 -right-[200px] w-[600px] h-[800px] opacity-20" style={{ background: "radial-gradient(ellipse at center, hsl(var(--accent) / 0.4) 0%, transparent 60%)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-[400px] bg-gradient-to-t from-primary/5 to-transparent" />
      </div>

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20 animate-fade-in">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <img src={arxonLogo} alt="Arxon" className="h-8 w-auto object-contain" />
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hidden sm:inline-flex" onClick={() => navigate("/auth?mode=signin")}>
              Log in
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-5 font-medium" onClick={() => navigate("/auth?mode=signup")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="mb-8">
            </div>

             <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[1.1]">
               <span className="text-foreground font-semibold">Mine</span>{" "}
               <span className="text-primary font-black">ARX-P</span>
              <br />
               <span className="text-foreground font-semibold">& Earn</span>{" "}
               <span className="text-primary font-black">$ARX</span>
              <br />
               <span className="text-3xl sm:text-4xl md:text-5xl text-muted-foreground/70 font-light tracking-wide">
                 as Real Rewards
               </span>
            </h1>

             <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 mt-10 leading-relaxed">
              The <span className="text-foreground font-semibold">easiest</span> privacy-focused Web3 mining. <span className="text-foreground font-semibold">No hardware</span> needed — start from your browser and convert points to <span className="text-primary font-semibold">real $ARX tokens</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="group bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 py-6 rounded-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300" onClick={() => navigate("/auth?mode=signup")}>
                Get Started <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 py-6 rounded-lg border-border/40 hover:bg-card/50 hover:border-primary/30 transition-all duration-300" onClick={() => navigate("/auth?mode=signin")}>Sign in</Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 max-w-4xl mx-auto">
            {/* Big Active Miners Stat */}
            <ScrollAnimatedStat />
            
            {/* Other Stats */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-border/20 rounded-2xl overflow-hidden">
              {[{ value: 10, suffix: "", label: "ARX-P / Hour", icon: Zap }, { value: 100, suffix: "", label: "Per Referral", icon: Gift }, { value: 8, suffix: "hr", label: "Max Session", icon: Clock }, { value: 5, suffix: "%", label: "Lifetime Boost", icon: Percent }].map((stat, i) => (
                <div key={i} className="bg-card/30 backdrop-blur-sm p-6 md:p-8 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <stat.icon className="h-5 w-5 text-primary" />
                    <span className="text-2xl md:text-3xl font-bold text-foreground"><AnimatedCounter end={stat.value} suffix={stat.suffix} /></span>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 md:py-32 relative" id="features">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] -translate-y-1/2 opacity-20" style={{ background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.3) 0%, transparent 60%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">Features</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Everything You Need to <span className="text-primary">Earn</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">A complete mining ecosystem designed for maximum rewards</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="group relative p-6 md:p-8 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm hover:border-primary/30 hover:bg-card/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="relative z-10 text-lg font-bold mb-3 text-foreground">{feature.title}</h3>
                <p className="relative z-10 text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 md:py-32 relative" id="how-it-works">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <ChevronRight className="h-4 w-4 text-accent" />
              <span className="text-sm text-accent font-medium">How it works</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
              Start <span className="text-accent">Earning</span> in 3 Steps
            </h2>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 md:gap-12">
            {[{ step: "01", title: "Create account", desc: "Sign up with email in seconds" }, { step: "02", title: "Start mining", desc: "One click to activate mining" }, { step: "03", title: "Earn rewards", desc: "Collect ARX-P automatically" }].map((item, i) => (
              <div key={i} className="text-center group">
                 <div className="text-8xl md:text-9xl font-black text-primary/20 mb-4 group-hover:text-primary/40 transition-all duration-500" style={{ fontFamily: 'inherit' }}>{item.step}</div>
                <h3 className="text-xl font-bold mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 blur-2xl group-hover:blur-3xl transition-all duration-500" />
            <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative rounded-3xl border border-border/30 bg-card/40 backdrop-blur-xl p-10 md:p-16 text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/10 border border-foreground/20 mb-6">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">Secure & Private</span>
              </div>
              <h2 className="relative z-10 text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Ready to Start <span className="text-primary">Mining</span>?
              </h2>
              <p className="relative z-10 text-muted-foreground text-lg mb-8 max-w-xl mx-auto">Join thousands of miners earning ARX-P every day.</p>
              <Button size="lg" className="relative z-10 group/btn bg-primary text-primary-foreground hover:bg-primary/90 text-base px-10 py-6 rounded-lg font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300" onClick={() => navigate("/auth?mode=signup")}>
                Get Started Free <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
               <img src={arxonLogo} alt="Arxon" className="h-6 w-auto object-contain" />
              <span className="text-sm text-muted-foreground">© 2025 Arxon. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://t.me/Arxonofficial" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><Send className="h-5 w-5" /></a>
              <a href="https://x.com/arxonarx" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><XIcon className="h-5 w-5" /></a>
              <a href="https://discord.gg/7FXxFDTqwj" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><Users className="h-5 w-5" /></a>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}