import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function RecalcularVentasButton() {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleRecalcular = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('recalcular-ventas');
      
      if (error) throw error;
      
      toast.success("Totales recalculados", {
        description: `${data.ventas_actualizadas} ventas actualizadas`
      });
      
      queryClient.invalidateQueries({ queryKey: ['ventas-pendientes'] });
    } catch (error: any) {
      toast.error("Error al recalcular", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleRecalcular}
      disabled={loading}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      Recalcular Totales
    </Button>
  );
}
