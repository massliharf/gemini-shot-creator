import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { enterDemoMode, exitDemoMode } from "@/lib/demo";
import { mockImage, type MockImageKey } from "@/data/mock";
import { cn } from "@/lib/utils";

/* Three slowly drifting columns of sample generations for the brand panel. */
const columns: MockImageKey[][] = [
  ["portrait-blush", "space-sage", "product-lilac", "portrait-mint"],
  ["product-coral", "portrait-tangerine", "space-cobalt", "portrait-close-blush"],
  ["space-terracotta", "portrait-lilac", "product-sky", "portrait-cobalt"],
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // A real account replaces any demo tour left on in this browser.
        exitDemoMode();
        toast({ title: "Welcome back!", description: "You're signed in." });
        navigate("/home");
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/home` },
        });
        if (error) throw error;
        exitDemoMode();
        toast({ title: "Account created", description: "You can sign in now." });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({ title: "Something went wrong", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const startDemo = () => {
    enterDemoMode();
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-app flex flex-col lg:flex-row p-shell gap-shell">
      {/* Brand panel (desktop) */}
      <section aria-hidden="true" className="relative hidden lg:flex flex-1 overflow-hidden rounded-lg bg-[#0F0F0F]">
        <div className="absolute inset-0 grid grid-cols-3 gap-3 p-3 opacity-90 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_75%,transparent)]">
          {columns.map((col, ci) => (
            <div key={ci} className={cn("flex flex-col gap-3 animate-auth-drift motion-reduce:animate-none", ci === 1 && "[animation-direction:reverse] -mt-24")}>
              {[...col, ...col].map((k, i) => (
                <img key={`${k}-${i}`} src={mockImage(k)} alt="" className="w-full aspect-[4/5] rounded-md object-cover" />
              ))}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_20%_100%,rgba(15,15,15,0.96)_30%,rgba(15,15,15,0)_72%)]" />
        <div className="relative mt-auto p-10 max-w-lg">
          <LogoMark size={56} />
          <h1 className="mt-6 text-[40px] leading-[46px] font-semibold tracking-[-0.03em] text-white">
            One reference.
            <br />
            <span className="bg-gradient-to-r from-[#FF57AE] via-[#A98BFF] to-[#6F86FF] bg-clip-text text-transparent">A whole image pack.</span>
          </h1>
          <p className="mt-3 text-body-md text-white/65">
            Lumra keeps your model, product and light consistent across every scene — generate, curate and ship in minutes.
          </p>
        </div>
      </section>

      {/* Form */}
      <div className="flex-1 lg:flex-none lg:w-[520px] flex items-center justify-center px-4 py-8 md:px-8 bg-background rounded-lg">
        <div className="w-full max-w-[380px]">
          <Logo size={32} className="mb-10" />

          <h2 className="text-heading-lg text-foreground">{isLogin ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-1 mb-8 text-body-sm text-muted-foreground">
            {isLogin ? "Sign in to continue to your studio." : "Start generating your first pack today."}
          </p>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>
            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} disabled={loading}>
              {isLogin ? "Sign in" : "Create account"}
              {!loading && <ArrowRight aria-hidden="true" />}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-caption text-tertiary-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" size="lg" fullWidth onClick={startDemo}>
            <Sparkles aria-hidden="true" />
            Explore the demo — no account needed
          </Button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-body-sm text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-touch px-2"
            >
              {isLogin ? "New to Lumra? Create an account" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
