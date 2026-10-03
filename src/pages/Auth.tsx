import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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
        toast({ title: "Hoş geldiniz!", description: "Başarıyla giriş yaptınız." });
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast({ title: "Hesap oluşturuldu!", description: "Şimdi giriş yapabilirsiniz." });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app flex flex-col lg:flex-row p-shell gap-shell">
      {/* Left panel - Brand (desktop only) */}
      <section
        aria-hidden="true"
        className="hidden lg:flex flex-1 bg-card rounded-lg items-center justify-center p-12"
      >
        <div className="max-w-md">
          <div className="size-12 rounded-md bg-primary text-primary-foreground flex items-center justify-center mb-8">
            <span className="text-heading-sm" aria-hidden="true">L</span>
          </div>
          <h1 className="text-display-lg text-foreground mb-3">Lumra</h1>
          <p className="text-body-md text-muted-foreground">
            AI-powered image generation platform. Create stunning visuals with intelligent style packs.
          </p>
        </div>
      </section>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:px-8 bg-background rounded-lg">
        <div className="w-full max-w-[400px] bg-card text-card-foreground rounded-lg p-4 md:p-7">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="size-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <span className="text-label-md" aria-hidden="true">L</span>
            </div>
            <span className="text-heading-sm">Lumra</span>
          </div>

          <h2 className="text-heading-md mb-1">
            {isLogin ? "Hoş geldiniz" : "Hesap oluştur"}
          </h2>
          <p className="text-body-sm text-muted-foreground mb-6">
            {isLogin ? "Devam etmek için giriş yapın" : "Başlamak için kayıt olun"}
          </p>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
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
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              className="md:h-control-md md:text-label-md"
              loading={loading}
              disabled={loading}
            >
              {isLogin ? "Giriş yap" : "Kayıt ol"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-body-sm text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-touch px-2"
            >
              {isLogin ? "Hesabınız yok mu? Kayıt olun" : "Zaten hesabınız var mı? Giriş yapın"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
