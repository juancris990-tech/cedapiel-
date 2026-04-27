import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, XCircle, UserCheck, CircleCheck } from "lucide-react";
import { useUserRoles } from "@/hooks/use-user-roles";

type Estado = 'agendada' | 'confirmada' | 'en_atencion' | 'finalizada' | 'cancelada' | 'no_asiste';

interface QuickActionButtonsProps {
  appointmentId: number;
  currentState: Estado;
  horaInicio: string;
  fecha: string;
  idEmpleado?: number;
}

export function QuickActionButtons({
  appointmentId,
  currentState,
  horaInicio,
  fecha,
  idEmpleado,
}: QuickActionButtonsProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const queryClient = useQueryClient();
  const { isAdmin, isGerencia, isRecepcion, isProfesional } = useUserRoles();

  const updateStateMutation = useMutation({
    mutationFn: async (newState: Estado) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Validar que el profesional solo pueda marcar sus propias citas
      if (isProfesional && newState === 'finalizada' && idEmpleado) {
        const { data: empleado } = await supabase
          .from('empleados')
          .select('id')
          .eq('email', user?.email || '')
          .single();
        
        if (empleado?.id !== idEmpleado) {
          throw new Error('Solo puedes marcar como atendidas tus propias citas');
        }
      }
      
      const { data: canChange, error: permError } = await supabase
        .rpc('puede_cambiar_estado_cita', {
          _user_id: user?.id,
          _cita_id: appointmentId,
          _estado_actual: currentState,
          _estado_nuevo: newState,
        });

      if (permError) throw permError;
      
      if (!canChange) {
        throw new Error('No tienes permisos para realizar esta transición de estado');
      }

      const { error } = await supabase
        .from('agendas')
        .update({
          estado: newState,
          motivo_cancelacion: newState === 'cancelada' ? motivo : null,
          cambiado_por: user?.id,
        })
        .eq('id', appointmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments-range'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['appointment-detail', appointmentId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['appointment-history', appointmentId], exact: true });
      toast.success('Estado actualizado correctamente');
      setCancelDialogOpen(false);
      setMotivo('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar estado');
    },
  });

  const canMarkNoShow = () => {
    const now = new Date();
    const appointmentDateTime = new Date(`${fecha}T${horaInicio}`);
    const diffMinutes = (now.getTime() - appointmentDateTime.getTime()) / (1000 * 60);
    return diffMinutes >= 15;
  };

  const handleCancelWithReason = () => {
    if (!motivo.trim()) {
      toast.error('Debes ingresar un motivo de cancelación');
      return;
    }
    updateStateMutation.mutate('cancelada');
  };

  // Botones según el estado actual y permisos
  const renderButtons = () => {
    // Desde agendada
    if (currentState === 'agendada' && (isRecepcion || isGerencia || isAdmin)) {
      return (
        <>
          <Button
            size="sm"
            variant="default"
            onClick={() => updateStateMutation.mutate('confirmada')}
            disabled={updateStateMutation.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Confirmar Asistencia
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setCancelDialogOpen(true)}
            disabled={updateStateMutation.isPending}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        </>
      );
    }

    // Desde confirmada
    if (currentState === 'confirmada' && (isRecepcion || isGerencia || isAdmin)) {
      return (
        <>
          <Button
            size="sm"
            variant="default"
            onClick={() => updateStateMutation.mutate('en_atencion')}
            disabled={updateStateMutation.isPending}
          >
            <UserCheck className="h-4 w-4 mr-1" />
            Paciente Llegó
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setCancelDialogOpen(true)}
            disabled={updateStateMutation.isPending}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          {canMarkNoShow() && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStateMutation.mutate('no_asiste')}
              disabled={updateStateMutation.isPending}
            >
              No se presentó
            </Button>
          )}
        </>
      );
    }

    // Desde en_atencion
    if (currentState === 'en_atencion' && (isProfesional || isGerencia || isAdmin)) {
      return (
        <>
          <Button
            size="sm"
            variant="default"
            onClick={() => updateStateMutation.mutate('finalizada')}
            disabled={updateStateMutation.isPending}
          >
            <CircleCheck className="h-4 w-4 mr-1" />
            Marcar Atendida
          </Button>
          {(isGerencia || isAdmin) && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setCancelDialogOpen(true)}
              disabled={updateStateMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <>
      {renderButtons()}
      
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo de cancelación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              className="w-full min-h-[100px] p-2 border rounded-md"
              placeholder="Ingresa el motivo de la cancelación..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Cerrar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCancelWithReason}
              disabled={!motivo.trim() || updateStateMutation.isPending}
            >
              Cancelar Cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { Button } from "@/components/ui/button";
