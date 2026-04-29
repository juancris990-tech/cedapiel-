import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CalendarDays, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";

interface AppHeaderProps {
  userEmail: string;
  isDemoMode?: boolean;
}

const AppHeader = ({ userEmail, isDemoMode = false }: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const sectionTitleByRoute: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/agenda": "Agenda",
    "/clientes": "Clientes",
    "/pos": "Punto de venta",
    "/reportes": "Reportes",
    "/marketing": "Marketing",
  };

  const sectionTitle =
    sectionTitleByRoute[location.pathname] ||
    location.pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 2)
      .join(" / ")
      .replace(/-/g, " ");

  const handleLogout = async () => {
    if (isDemoMode) {
      localStorage.removeItem("demo_mode");
      toast.success("Modo demo finalizado");
      navigate("/auth");
      return;
    }

    try {
      await supabase.auth.signOut();
      toast.success("Sesión cerrada");
      navigate("/auth");
    } catch (error) {
      toast.error("Error al cerrar sesión");
    }
  };

  return (
    <header className="h-16 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="h-9 w-9 rounded-md border border-border/70" />
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span className="capitalize truncate">{sectionTitle}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <span className="hidden sm:inline text-sm text-muted-foreground max-w-[220px] truncate">
          {userEmail}
        </span>
        <Button variant="outline" size="icon" onClick={handleLogout} className="h-9 w-9">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
