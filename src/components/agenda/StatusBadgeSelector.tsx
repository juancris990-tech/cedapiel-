import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, Play, XCircle, UserX, Calendar, Loader2, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

type Estado = "agendada" | "confirmada" | "en_atencion" | "finalizada" | "cancelada" | "no_asiste";

interface StatusBadgeSelectorProps {
  appointmentId: number | string;
  currentState: Estado;
  horaInicio: string;
  fecha: string;
  idEmpleado?: number | null;
  isImported?: boolean;
  size?: "sm" | "default";
}

const estadoConfig: Record<
  Estado,
  {
    label: string;
    icon: React.ElementType;
  }
> = {
  agendada: { label: "Agendada", icon: Calendar },
  confirmada: { label: "Confirmada", icon: Check },
  en_atencion: { label: "En Atención", icon: Play },
  finalizada: { label: "Finalizada", icon: Check },
  cancelada: { label: "Cancelada", icon: XCircle },
  no_asiste: { label: "No Asiste", icon: UserX },
};

const estadoTransiciones: Record<Estado, Estado[]> = {
  agendada: ["confirmada", "cancelada"],
  confirmada: ["en_atencion", "cancelada", "no_asiste"],
  en_atencion: ["finalizada", "cancelada"],
  finalizada: [],
  cancelada: [],
  no_asiste: [],
};

export function StatusBadgeSelector({
  appointmentId,
  currentState,
  horaInicio,
  fecha,
  idEmpleado,
  isImported = false,
  size = "sm",
}: StatusBadgeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [selectedState, setSelectedState] = useState<Estado | null>(null);
  const queryClient = useQueryClient();

  const canMarkNoShow = () => {
    const now = new Date();
    const [year, month, day] = fecha.split("-").map(Number);
    const [hours, minutes] = horaInicio.split(":").map(Number);
    const appointmentTime = new Date(year, month - 1, day, hours, minutes);
    const diffMinutes = (now.getTime() - appointmentTime.getTime()) / (1000 * 60);
    return diffMinutes >= 15;
  };

  const updateStateMutation = useMutation({
    mutationFn: async (newState: Estado) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (newState === "no_asiste" && !canMarkNoShow()) {
        throw new Error("Debe esperar 15 minutos después de la hora de inicio");
      }

      const { data: canChange, error: permError } = await supabase
        .rpc("puede_cambiar_estado_cita", {
          _user_id: user?.id,
          _cita_id: Number(appointmentId),
          _estado_actual: currentState,
          _estado_nuevo: newState,
        });

      if (permError) throw permError;

      if (!canChange) {
        throw new Error("No tienes permisos para realizar esta transición");
      }

      const updateData: Record<string, unknown> = {
        estado: newState,
        cambiado_por: user?.id,
      };

      if (newState === "cancelada" && motivo) {
        updateData.motivo_cancelacion = motivo;
      }

      const { error } = await supabase
        .from("agendas")
        .update(updateData)
        .eq("id", Number(appointmentId));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments-range"],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["appointment-detail", Number(appointmentId)],
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: ["appointment-history", Number(appointmentId)],
        exact: true,
      });
      toast.success("Estado actualizado");
      setOpen(false);
      setMotivo("");
      setSelectedState(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar");
    },
  });

  const config = estadoConfig[currentState];
  const IconComponent = config.icon;

  // Mostrar opciones por flujo de estados (la validación real queda en backend vía RPC)
  const availableTransitions = estadoTransiciones[currentState] || [];
  const isEmpty = availableTransitions.length === 0;
  const noShowDisabled =
    availableTransitions.includes("no_asiste") && !canMarkNoShow();

  const handleStateClick = (estado: Estado) => {
    if (estado === "cancelada") {
      setSelectedState(estado);
    } else {
      updateStateMutation.mutate(estado);
    }
  };

  const handleConfirmCancel = () => {
    if (selectedState === "cancelada") {
      updateStateMutation.mutate("cancelada");
    }
  };

  // Si es cita importada, no permitimos cambios desde aquí
  if (isImported) {
    return (
      <div
        className={cn(
          "rounded-full p-1 cursor-default",
          "bg-muted/60"
        )}
      >
        <Ticket className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }

  // Color del ícono según el estado
  const getIconColor = () => {
    const colors: Record<Estado, string> = {
      agendada: "text-slate-500",
      confirmada: "text-sky-500",
      en_atencion: "text-amber-500",
      finalizada: "text-emerald-500",
      cancelada: "text-rose-500",
      no_asiste: "text-orange-500",
    };
    return colors[currentState] || "text-slate-500";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded-full p-1 hover:bg-muted/80 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "bg-background/80 backdrop-blur-sm shadow-sm border border-border/50"
          )}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          title={config.label}
        >
          <Ticket className={cn("h-3.5 w-3.5", getIconColor())} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-56 p-2 z-[100] bg-popover border shadow-lg"
        align="start"
        sideOffset={5}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => e.stopPropagation()}
      >
        {selectedState === "cancelada" ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Motivo de cancelación</p>
            <Textarea
              placeholder="Ingresa el motivo (opcional)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedState(null)}
              >
                Volver
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={handleConfirmCancel}
                disabled={updateStateMutation.isPending}
              >
                {updateStateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Cancelar Cita"
                )}
              </Button>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="p-2">
            <p className="text-xs text-muted-foreground">
              No hay opciones disponibles para este estado.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              Cambiar a:
            </p>
            {availableTransitions.map((estado) => {
              const stateConfig = estadoConfig[estado];
              const StateIcon = stateConfig.icon;
              const disabled =
                updateStateMutation.isPending ||
                (estado === "no_asiste" && noShowDisabled);

              return (
                <Button
                  key={estado}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start h-8",
                    estado === "cancelada" ? "text-destructive" : "text-foreground",
                    disabled ? "opacity-60" : "",
                  )}
                  onClick={() => handleStateClick(estado)}
                  disabled={disabled}
                >
                  {updateStateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <StateIcon className="mr-2 h-4 w-4" />
                  )}
                  {stateConfig.label}
                </Button>
              );
            })}
            {noShowDisabled && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                “No Asiste” se habilita 15 min después de la hora de inicio.
              </p>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
