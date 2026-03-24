import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
    <div className="min-h-screen bg-background flex">
      {/* Left panel - Brand */}
      <div className="hidden lg:flex flex-1 bg-foreground dark:bg-accent text-background dark:text-foreground items-center justify-center p-12">
        <div className="max-w-md">
          <div className="w-12 h-12 rounded-xl bg-white/10 dark:bg-foreground/10 flex items-center justify-center mb-8">
            <span className="text-white dark:text-foreground font-bold text-xl">L</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Lumra</h1>
          <p className="text-lg text-white/50 leading-relaxed">
            AI-powered image generation platform. Create stunning visuals with intelligent style packs.
          </p>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
              <span className="text-background font-bold text-lg">L</span>
            </div>
            <span className="text-xl font-bold">Lumra</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-1">
            {isLogin ? "Hoş Geldiniz" : "Hesap Oluştur"}
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            {isLogin ? "Devam etmek için giriş yapın" : "Başlamak için kayıt olun"}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                E-posta
              </label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-secondary/50 border-0 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Şifre
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 bg-secondary/50 border-0 rounded-xl text-sm"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium rounded-xl text-sm"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? "Giriş Yap" : "Kayıt Ol"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Hesabınız yok mu? Kayıt olun" : "Zaten hesabınız var mı? Giriş yapın"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
