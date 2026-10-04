import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Resolves the signed-in user (or the demo user); redirects to /auth otherwise. */
export const useRequireUser = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) navigate("/auth");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return { user, loading };
};

/** "Maya" from user metadata, else a capitalised e-mail prefix. */
export const displayName = (user: User | null) => {
  const full = (user?.user_metadata as { full_name?: string } | undefined)?.full_name;
  if (full) return full.split(" ")[0];
  const prefix = user?.email?.split("@")[0]?.split(/[._-]/)[0];
  return prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : "there";
};
