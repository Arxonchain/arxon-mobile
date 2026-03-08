import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, Shield, Users, ArrowRight } from 'lucide-react';
import arxonLogo from '@/assets/arxon-logo.jpg';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="glow-orb glow-orb-steel w-[500px] h-[500px] top-0 left-1/4 opacity-30 fixed" />
      <div className="glow-orb glow-orb-blue w-96 h-96 bottom-0 right-1/4 opacity-20 fixed" />
      
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={arxonLogo} alt="Arxon" className="h-12 w-12 rounded-xl" />
          <span className="text-2xl font-bold">Arxon</span>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => navigate('/auth?mode=signin')}>
            Sign In
          </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => navigate('/auth?mode=signup')}>
            Get Started
          </Button>
        </div>
      </header>
      
      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Mine <span className="text-gradient">ARX-P</span> Points
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
            Join the Arxon network and start earning rewards. Simple, secure, and rewarding.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="btn-mining btn-glow text-lg px-8"
              onClick={() => navigate('/auth?mode=signup')}
            >
              Start Mining Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-4xl mx-auto">
          <div className="glass-card p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">Easy Mining</h3>
            <p className="text-muted-foreground">
              One click to start. No complex setup required. Just sign up and begin earning.
            </p>
          </div>
          
          <div className="glass-card p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-7 w-7 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-3">Secure</h3>
            <p className="text-muted-foreground">
              Your points are safe with enterprise-grade security and reliable infrastructure.
            </p>
          </div>
          
          <div className="glass-card p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <Users className="h-7 w-7 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-3">Community</h3>
            <p className="text-muted-foreground">
              Join thousands of miners in the Arxon ecosystem and grow together.
            </p>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-border/50">
        <div className="flex items-center justify-center gap-3">
          <img src={arxonLogo} alt="Arxon" className="h-8 w-8 rounded-lg" />
          <span className="text-muted-foreground">© 2025 Arxon. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
