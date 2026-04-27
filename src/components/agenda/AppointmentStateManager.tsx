import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useUserRoles } from "@/hooks/use-user-roles";
import { AlertCircle } from "lucide-react";

type Estado = 'agendada' | 'confirmada' | 'en_atencion' | 'finalizada' | 'cancelada' | 'no_asiste';

interface AppointmentStateManagerProps {
  appointmentId: number;
  currentState: Estado;
  horaInicio?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const estadoTransiciones: Record<Estado, Estado[]> = {
  agendada: ['confirmada', 'cancelada'],
  confirmada: ['en_atencion', 'cancelada', 'no_asiste'],
  en_atencion: ['finalizada', 'cancelada'],
  finalizada: [],
  cancelada: [],
  no_asiste: [],
};

const estadoLabels: Record<Estado, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  en_atencion: 'En Atención',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
  no_asiste: 'No Asiste',
};

export function AppointmentStateManager({
  appointmentId,
  currentState,
  horaInicio,
  open,
  onOpenChange,
}: AppointmentStateManagerProps) {
  const [newState, setNewState] = useState<Estado | ''>('');
  const [motivo, setMotivo] = useState('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { isAdmin, isGerencia, isRecepcion, isProfesional, isLoading: rolesLoading } = useUserRoles();

  // Obtener datos mínimos de la cita (evitar colisionar con el cache del detalle completo)
  const { data: appointment } = useQuery({
    queryKey: ['appointment-state-data', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agendas')
        .select('id_empleado, hora_inicio, fecha')
        .eq('id', appointmentId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && appointmentId > 0,
  });

  // Verificar si han pasado 15 minutos desde hora_inicio para No_Show
  const canMarkNoShow = () => {
    if (!appointment) return false;
    const now = new Date();
    const appointmentDateTime = new Date(`${appointment.fecha}T${appointment.hora_inicio}`);
    const diffMinutes = (now.getTime() - appointmentDateTime.getTime()) / (1000 * 60);
    return diffMinutes >= 15;
  };

  // Determinar estados disponibles según rol y permisos
  const getAvailableStates = (): Estado[] => {
    if (rolesLoading || !appointment) return [];
    
    // Admin y gerencia pueden todo
    if (isAdmin || isGerencia) {
      return estadoTransiciones[currentState] || [];
    }
    
    const transitions = estadoTransiciones[currentState] || [];
    
    // Recepción
    if (isRecepcion) {
      if (currentState === 'agendada') {
        return transitions.filter(s => ['confirmada', 'cancelada'].includes(s));
      }
      if (currentState === 'confirmada') {
        const allowed: Estado[] = ['en_atencion', 'cancelada'];
        if (canMarkNoShow()) {
          allowed.push('no_asiste');
        }
        return transitions.filter(s => allowed.includes(s));
      }
      if (currentState === 'en_atencion') {
        return transitions.filter(s => ['finalizada', 'cancelada'].includes(s));
      }
      return [];
    }
    
    // Profesional (solo sus propias citas)
    if (isProfesional) {
      // Solo puede marcar en_atencion -> finalizada en sus propias citas
      if (currentState === 'en_atencion') {
        return transitions.filter(s => s === 'finalizada');
      }
      return [];
    }
    
    return [];
  };

  useEffect(() => {
    if (open) {
      setNewState('');
      setMotivo('');
      setPermissionError(null);
    }
  }, [open]);

  const updateState = useMutation({
    mutationFn: async () => {
      if (!newState) return;

      const { data: { user } } = await supabase.auth.getUser();
      
      // Validación adicional para no_asiste
      if (newState === 'no_asiste' && !canMarkNoShow()) {
        throw new Error('Debe esperar al menos 15 minutos después de la hora de inicio para marcar como No Asiste');
      }

      // Validar permisos usando la función de base de datos
      const { data: canChange, error: permError } = await supabase
        .rpc('puede_cambiar_estado_cita', {
          _user_id: user?.id,
          _cita_id: appointmentId,
          _estado_actual: currentState,
          _estado_nuevo: newState,
        });

      if (permError) throw permError;
      
      if (!canChange) {
        throw new Error('No tiene permisos para realizar esta transición de estado');
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
      // Refrescar la agenda actual (día o semana) y el detalle/historial
      queryClient.invalidateQueries({ queryKey: ['appointments-range'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['appointment-detail', appointmentId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['appointment-history', appointmentId], exact: true });

      toast.success('Estado actualizado correctamente');
      onOpenChange(false);
      setNewState('');
      setMotivo('');
      setPermissionError(null);
    },
    onError: (error: any) => {
      console.error('Error updating state:', error);
      if (error.message.includes('Transición inválida')) {
        setPermissionError('Transición de estado no permitida');
      } else if (error.message.includes('permisos')) {
        setPermissionError(error.message);
      } else if (error.message.includes('15 minutos')) {
        setPermissionError(error.message);
      } else {
        setPermissionError('Error al actualizar estado: ' + error.message);
      }
    },
  });

  const availableStates = getAvailableStates();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar Estado de Cita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {permissionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{permissionError}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label>Estado actual</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {estadoLabels[currentState]}
            </p>
          </div>

          <div>
            <Label>Nuevo estado</Label>
            <Select 
              value={newState} 
              onValueChange={(value) => {
                setNewState(value as Estado);
                setPermissionError(null);
              }}
              disabled={rolesLoading || availableStates.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  rolesLoading 
                    ? "Cargando permisos..." 
                    : availableStates.length === 0 
                      ? "No hay transiciones disponibles"
                      : "Selecciona el nuevo estado"
                } />
              </SelectTrigger>
              <SelectContent>
                {availableStates.map((state) => (
                  <SelectItem key={state} value={state}>
                    {estadoLabels[state]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {newState === 'cancelada' && (
            <div>
              <Label>Motivo de cancelación *</Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ingresa el motivo de la cancelación..."
                className="mt-1"
              />
            </div>
          )}

          {newState === 'no_asiste' && !canMarkNoShow() && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Debe esperar al menos 15 minutos después de la hora de inicio para marcar como No Asiste.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateState.mutate()}
              disabled={
                !newState || 
                updateState.isPending || 
                (newState === 'cancelada' && !motivo.trim()) ||
                (newState === 'no_asiste' && !canMarkNoShow()) ||
                rolesLoading
              }
            >
              {updateState.isPending ? 'Actualizando...' : 'Actualizar Estado'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
