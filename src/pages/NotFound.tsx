import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="mt-2 text-lg font-medium">Página no encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          La ruta <span className="font-mono">{location.pathname}</span> no existe o fue movida.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link to="/dashboard">
            <Home className="mr-2 h-4 w-4" />
            Volver al dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
