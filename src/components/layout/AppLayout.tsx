import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import { SidebarProvider } from "@/components/ui/sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const demoModeEnabled = localStorage.getItem("demo_mode") === "true";
    setIsDemoMode(demoModeEnabled);

    if (demoModeEnabled) {
      setIsLoading(false);
      return;
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (!session) {
        navigate("/auth");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === "SIGNED_OUT") {
          navigate("/auth");
        } else if (event === "SIGNED_IN" && location.pathname === "/auth") {
          navigate("/dashboard");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!isDemoMode && (!user || !session)) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="h-svh flex w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-muted/30">
          <AppHeader
            userEmail={isDemoMode ? "demo@cedapiel.local" : user?.email ?? ""}
            isDemoMode={isDemoMode}
          />
          <main className="flex-1 min-h-0 overflow-auto">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
