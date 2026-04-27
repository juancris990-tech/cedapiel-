import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { useUserRoles } from "@/hooks/use-user-roles";

type Estado = 'agendada' | 'confirmada' | 'en_atencion' | 'finalizada' | 'cancelada' | 'no_asiste';

interface QuickStateChangeProps {
  appointmentId: number;
  currentState: Estado;
  horaInicio: string;
}

const estadoLabels: Record<Estado, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  en_atencion: 'En Atención',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
  no_asiste: 'No Asiste',
};

const estadoTransiciones: Record<Estado, Estado[]> = {
  agendada: ['confirmada', 'cancelada'],
  confirmada: ['en_atencion', 'cancelada', 'no_asiste'],
  en_atencion: ['finalizada', 'cancelada'],
  finalizada: [],
  cancelada: [],
  no_asiste: [],
};

export function QuickStateChange({
  appointmentId,
  currentState,
  horaInicio,
}: QuickStateChangeProps) {
  const queryClient = useQueryClient();
  const { isAdmin, isGerencia, isRecepcion, isProfesional } = useUserRoles();

  const canMarkNoShow = () => {
    const now = new Date();
    const [hours, minutes] = horaInicio.split(':');
    const appointmentTime = new Date();
    appointmentTime.setHours(parseInt(hours), parseInt(minutes), 0);
    const diffMinutes = (now.getTime() - appointmentTime.getTime()) / (1000 * 60);
    return diffMinutes >= 15;
  };

  const updateStateMutation = useMutation({
    mutationFn: async (newState: Estado) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Validación para no_asiste
      if (newState === 'no_asiste' && !canMarkNoShow()) {
        throw new Error('Debe esperar 15 minutos después de la hora de inicio');
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
        throw new Error('No tienes permisos para realizar esta transición');
      }

      const { error } = await supabase
        .from('agendas')
        .update({
          estado: newState,
          cambiado_por: user?.id,
        })
        .eq('id', appointmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments-range'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['appointment-detail', appointmentId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['appointment-history', appointmentId], exact: true });
      toast.success('Estado actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar');
    },
  });

  const availableTransitions = estadoTransiciones[currentState] || [];

  // Filtrar transiciones según permisos
  const getFilteredTransitions = () => {
    if (isAdmin || isGerencia) return availableTransitions;
    
    if (isRecepcion) {
      if (currentState === 'agendada') return ['confirmada', 'cancelada'] as Estado[];
      if (currentState === 'confirmada') {
        const options: Estado[] = ['en_atencion', 'cancelada'];
        if (canMarkNoShow()) options.push('no_asiste');
        return options;
      }
      if (currentState === 'en_atencion') return ['cancelada'] as Estado[];
      return [];
    }
    
    if (isProfesional) {
      if (currentState === 'en_atencion') return ['finalizada'] as Estado[];
      return [];
    }
    
    return [];
  };

  const filteredTransitions = getFilteredTransitions();

  if (filteredTransitions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {filteredTransitions.map((estado) => (
          <DropdownMenuItem
            key={estado}
            onClick={() => updateStateMutation.mutate(estado)}
            disabled={updateStateMutation.isPending}
          >
            {estadoLabels[estado]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
