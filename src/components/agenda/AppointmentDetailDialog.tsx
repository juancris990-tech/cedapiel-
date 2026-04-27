import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, User, MapPin, Calendar, History, ShoppingCart, ArrowRight, Pencil } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseDateOnlyToLocal } from "@/lib/date";
import { NotasPanel } from "./NotasPanel";
import { AppointmentStateManager } from "./AppointmentStateManager";
import { AppointmentEditDialog } from "./AppointmentEditDialog";
import { toast } from "sonner";

interface AppointmentDetailDialogProps {
  appointmentId: number | string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentDetailDialog({
  appointmentId,
  open,
  onOpenChange,
}: AppointmentDetailDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stateDialogOpen, setStateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const migrarCitaMutation = useMutation({
    mutationFn: async (citaId: number) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrar-cita-importada`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ citaImportadaId: citaId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al migrar cita');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success("Cita migrada exitosamente");
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-appointments'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al migrar la cita");
    },
  });

  const handleGoToPOS = () => {
    if (appointment?.clientes?.id) {
      navigate('/pos', { 
        state: { 
          citaId: appointment.id,
          clienteId: appointment.clientes.id,
          sucursalId: appointment.id_sucursal,
          servicioId: appointment.id_servicio,
          empleadoId: appointment.id_empleado,
          precioServicio: appointment.servicios?.precio || 0,
          nombreCliente: `${appointment.clientes?.nombre || ''} ${appointment.clientes?.apellidos || ''}`,
          nombreEmpleado: `${appointment.empleados?.nombre || ''} ${appointment.empleados?.apellidos || ''}`,
          nombreServicio: appointment.servicios?.nombre || '',
          nombreSucursal: appointment.sucursales?.nombre || ''
        } 
      });
      onOpenChange(false);
    }
  };

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment-detail', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      
      // Si es una cita importada (ID con prefijo "ca-")
      if (typeof appointmentId === 'string') {
        const numericId = parseInt(appointmentId.replace('ca-', ''));
        const { data, error } = await supabase
          .from('citas_agendadas')
          .select('*')
          .eq('id', numericId)
          .single();

        if (error) throw error;
        
        // Transform to match agendas structure
        const clienteParts = (data.cliente || '').split(' ');
        const profesionalParts = (data.profesional || '').split(' ');
        
        return {
          id: appointmentId,
          fecha: data.fecha,
          hora_inicio: data.hora_inicio,
          hora_fin: data.hora_fin,
          estado: data.estado.toLowerCase(),
          observaciones: null,
          id_cliente: 0,
          id_empleado: 0,
          id_servicio: 0,
          id_sucursal: 0,
          clientes: {
            id: null,
            nombre: clienteParts[0] || '',
            apellidos: clienteParts.slice(1).join(' ') || '',
            email: data.email,
            telefono: data.telefono,
          },
          empleados: {
            nombre: profesionalParts[0] || '',
            apellidos: profesionalParts.slice(1).join(' ') || '',
            especialidad: null,
          },
          sucursales: {
            nombre: data.sucursal,
            direccion: null,
          },
          servicios: {
            nombre: data.servicio || '',
            duracion_minutos: 60,
            precio: data.valor_mxn || 0,
          },
          _source: 'citas_agendadas' as const,
          _rawId: numericId,
        };
      }
      
      // Cita normal de agendas
      const { data, error } = await supabase
        .from('agendas')
        .select(`
          *,
          clientes(id, nombre, apellidos, email, telefono),
          empleados(nombre, apellidos, especialidad),
          sucursales(nombre, direccion),
          servicios(nombre, duracion_minutos, precio)
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;
      return { ...data, _source: 'agendas' as const };
    },
    enabled: !!appointmentId && open,
  });

  const { data: historial } = useQuery({
    queryKey: ['appointment-history', appointmentId],
    queryFn: async () => {
      if (!appointmentId || typeof appointmentId === 'string') return [];
      
      const { data, error } = await supabase
        .from('citas_historial_estado')
        .select(`
          *,
          profiles:cambiado_por(nombre_completo)
        `)
        .eq('id_cita', appointmentId)
        .order('cambiado_en', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!appointmentId && typeof appointmentId === 'number' && open,
  });

  if (!appointment || isLoading) {
    return null;
  }

  const estadoLabels: Record<string, string> = {
    agendada: 'Agendada',
    confirmada: 'Confirmada',
    en_atencion: 'En Atención',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
    no_asiste: 'No Asiste',
    // Legacy states for backward compatibility
    reservada: 'Reservada',
    llego_paciente: 'Paciente llegó',
    asistida: 'Atendida',
    no_show: 'No se presentó',
    cancelada_cliente: 'Cancelada por cliente',
    cancelada_clinica: 'Cancelada por clínica',
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Cita</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">
                    {appointment.clientes?.nombre} {appointment.clientes?.apellidos}
                  </p>
                  {appointment.clientes?.email && (
                    <p className="text-sm text-muted-foreground">{appointment.clientes.email}</p>
                  )}
                  {appointment.clientes?.telefono && (
                    <p className="text-sm text-muted-foreground">{appointment.clientes.telefono}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Profesional</p>
                  <p className="font-medium">
                    {appointment.empleados?.nombre} {appointment.empleados?.apellidos}
                  </p>
                  <p className="text-sm text-muted-foreground">{appointment.empleados?.especialidad}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Servicio</p>
                  <p className="font-medium">{appointment.servicios?.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.servicios?.duracion_minutos} min
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Sucursal</p>
                  <p className="font-medium">{appointment.sucursales?.nombre}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(parseDateOnlyToLocal(appointment.fecha), "d 'de' MMMM, yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{appointment.hora_inicio} - {appointment.hora_fin}</span>
              </div>
              <Badge>{estadoLabels[appointment.estado]}</Badge>
            </div>

            {appointment.observaciones && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Observaciones</p>
                <p className="text-sm p-3 bg-muted/50 rounded-lg">{appointment.observaciones}</p>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              {appointment._source !== 'citas_agendadas' && (
                <>
                  <Button onClick={() => setEditDialogOpen(true)} variant="outline">
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button onClick={() => setStateDialogOpen(true)}>
                    Cambiar Estado
                  </Button>
                  <Button variant="outline" onClick={handleGoToPOS}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Ir a POS
                  </Button>
                </>
              )}
              {appointment._source === 'citas_agendadas' && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                    Esta es una cita importada. Para gestionarla completamente, migra los datos a la tabla de citas.
                  </div>
                  <Button 
                    onClick={() => migrarCitaMutation.mutate(appointment._rawId)}
                    disabled={migrarCitaMutation.isPending}
                    className="w-full"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    {migrarCitaMutation.isPending ? "Migrando..." : "Migrar a Agenda Principal"}
                  </Button>
                </div>
              )}
            </div>

            {appointment._source !== 'citas_agendadas' && (
              <Tabs defaultValue="notas" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="notas">Notas de Cita</TabsTrigger>
                  <TabsTrigger value="cliente">Notas de Cliente</TabsTrigger>
                  <TabsTrigger value="historial">Historial</TabsTrigger>
                </TabsList>
                
              <TabsContent value="notas">
                <NotasPanel type="cita" id={typeof appointment.id === 'number' ? appointment.id : 0} />
                </TabsContent>
                
                <TabsContent value="cliente">
                  {appointment.clientes?.id && (
                    <NotasPanel type="cliente" id={appointment.clientes.id} />
                  )}
                </TabsContent>
                
                <TabsContent value="historial">
                  <div className="space-y-3">
                    {historial && historial.length > 0 ? (
                      historial.map((cambio: any) => (
                        <div key={cambio.id} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <History className="h-4 w-4" />
                            <span className="font-medium">
                              {cambio.estado_anterior ? estadoLabels[cambio.estado_anterior] : 'Inicial'}
                            </span>
                            <span>→</span>
                            <span className="font-medium">{estadoLabels[cambio.estado_nuevo]}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(cambio.cambiado_en), "d 'de' MMM, HH:mm", { locale: es })} por{' '}
                            {cambio.profiles?.nombre_completo || 'Usuario'}
                          </p>
                          {cambio.motivo && (
                            <p className="text-sm mt-2">Motivo: {cambio.motivo}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay historial de cambios
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {appointment && appointment._source !== 'citas_agendadas' && typeof appointment.id === 'number' && (
        <>
          <AppointmentStateManager
            appointmentId={appointment.id}
            currentState={appointment.estado as 'agendada' | 'confirmada' | 'en_atencion' | 'finalizada' | 'cancelada' | 'no_asiste'}
            horaInicio={appointment.hora_inicio}
            open={stateDialogOpen}
            onOpenChange={setStateDialogOpen}
          />
          <AppointmentEditDialog
            appointmentId={appointment.id}
            appointment={appointment}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        </>
      )}
    </>
  );
}
