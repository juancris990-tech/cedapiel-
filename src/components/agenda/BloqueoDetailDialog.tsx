import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin, FileText, Ban } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseDateOnlyToLocal } from "@/lib/date";
import { toast } from "sonner";
import { useState } from "react";

interface BloqueoDetailDialogProps {
  bloqueoId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BloqueoDetailDialog({
  bloqueoId,
  open,
  onOpenChange,
}: BloqueoDetailDialogProps) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: bloqueo, isLoading } = useQuery({
    queryKey: ["bloqueo-detail", bloqueoId],
    queryFn: async () => {
      if (!bloqueoId) return null;

      const { data, error } = await supabase
        .from("bloqueos_agenda")
        .select(`
          *,
          empleados(nombre, apellidos),
          sucursales(nombre)
        `)
        .eq("id", bloqueoId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!bloqueoId && open,
  });

  const handleDelete = async () => {
    if (!bloqueoId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("bloqueos_agenda")
        .delete()
        .eq("id", bloqueoId);

      if (error) throw error;

      toast.success("Bloqueo eliminado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["bloqueos-agenda"] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error al eliminar bloqueo:", error);
      toast.error("Error al eliminar el bloqueo");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || !bloqueo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                Detalle del Bloqueo
              </DialogTitle>
              <DialogDescription>
                Información del horario bloqueado
              </DialogDescription>
            </div>
            <Badge variant="destructive">Bloqueado</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Fecha</span>
              </div>
              <p className="text-sm">
                {format(
                  parseDateOnlyToLocal(bloqueo.fecha),
                  "EEEE, d 'de' MMMM 'de' yyyy",
                  {
                    locale: es,
                  }
                )}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Horario</span>
              </div>
              <p className="text-sm">
                {bloqueo.hora_inicio} - {bloqueo.hora_fin}
              </p>
            </div>
          </div>

          {/* Profesional */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium">Profesional</span>
            </div>
            <p className="text-sm">
              {bloqueo.empleados
                ? `${bloqueo.empleados.nombre} ${bloqueo.empleados.apellidos}`
                : "Todos los profesionales"}
            </p>
          </div>

          {/* Sucursal */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">Sucursal</span>
            </div>
            <p className="text-sm">{bloqueo.sucursales.nombre}</p>
          </div>

          {/* Motivo */}
          {bloqueo.motivo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Motivo</span>
              </div>
              <p className="text-sm bg-muted p-3 rounded-md">{bloqueo.motivo}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Eliminando..." : "Desbloquear Horario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
