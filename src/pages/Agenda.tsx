import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Ban, X, CalendarClock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { AppointmentDialog } from "@/components/agenda/AppointmentDialog";
import { AppointmentDetailDialog } from "@/components/agenda/AppointmentDetailDialog";
import { BloqueoDialog } from "@/components/agenda/BloqueoDialog";
import { BloqueoDetailDialog } from "@/components/agenda/BloqueoDetailDialog";
import { WeeklyCalendar } from "@/components/agenda/WeeklyCalendar";
import { DailyCalendar } from "@/components/agenda/DailyCalendar";
import { AgendaFilters } from "@/components/agenda/AgendaFilters";
import { WeeklyStats } from "@/components/agenda/WeeklyStats";
import { AgendaTableView } from "@/components/agenda/AgendaTableView";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Interface para la cita que se va a reagendar
interface RescheduleAppointment {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  cliente_nombre: string;
  servicio_nombre: string;
  id_empleado: number;
}

const Agenda = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [bloqueoDialogOpen, setBloqueoDialogOpen] = useState(false);
  const [selectedBloqueoId, setSelectedBloqueoId] = useState<number | null>(null);
  const [bloqueoDetailDialogOpen, setBloqueoDetailDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const [viewRange, setViewRange] = useState<"day" | "week">("week");

  const stickyRef = useRef<HTMLDivElement | null>(null);
  const [stickyOffset, setStickyOffset] = useState(0);
  // State for quick add appointment dialog
  const [quickAddDialogOpen, setQuickAddDialogOpen] = useState(false);
  const [quickAddInitialValues, setQuickAddInitialValues] = useState<{
    profesional_nombre?: string;
    fecha?: string;
    hora_inicio?: string;
    hora_fin?: string;
    sucursal_nombre?: string;
  }>({});

  // State for reschedule mode
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<RescheduleAppointment | null>(null);
  
  // Filters
  const [selectedSucursal, setSelectedSucursal] = useState("all");
  const [selectedEmpleado, setSelectedEmpleado] = useState("all");
  const [selectedEstado, setSelectedEstado] = useState("all");
  const [selectedServicio, setSelectedServicio] = useState("all");

  // Los datos de filtros se extraerán directamente de las citas

  useLayoutEffect(() => {
    const el = stickyRef.current;
    if (!el) return;

    const update = () => {
      setStickyOffset(Math.ceil(el.getBoundingClientRect().height));
    };

    update();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode, viewRange]);

  // Calculate date range based on viewRange
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  
  // For queries, use day or week range
  const queryStartDate = viewRange === "day" ? selectedDate : weekStart;
  const queryEndDate = viewRange === "day" ? selectedDate : weekEnd;

  // Fetch sucursales from database
  const { data: sucursalesDB = [] } = useQuery({
    queryKey: ["sucursales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sucursales")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch empleados (profesionales) from database
  const { data: empleadosDB = [] } = useQuery({
    queryKey: ["empleados-profesionales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleados")
        .select(`
          id,
          nombre,
          apellidos,
          id_sucursal,
          sucursales(id, nombre)
        `)
        .eq("activo", true)
        .eq("es_profesional", true)
        .order("nombre");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch bloqueos for the date range
  const { data: bloqueos = [] } = useQuery({
    queryKey: ["bloqueos-agenda", format(queryStartDate, "yyyy-MM-dd"), format(queryEndDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bloqueos_agenda")
        .select(`
          *,
          empleados(nombre, apellidos),
          sucursales(nombre)
        `)
        .gte("fecha", format(queryStartDate, "yyyy-MM-dd"))
        .lte("fecha", format(queryEndDate, "yyyy-MM-dd"))
        .order("fecha")
        .order("hora_inicio");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch from agendas table (sin filtros, se aplicarán después)
  const { data: agendasData, isLoading: isLoadingAgendas } = useQuery({
    queryKey: [
      "appointments-range",
      format(queryStartDate, "yyyy-MM-dd"),
      format(queryEndDate, "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendas")
        .select(`
          *,
          clientes(nombre, apellidos),
          empleados(nombre, apellidos, especialidad),
          sucursales(nombre),
          servicios(nombre, duracion_minutos, precio)
        `)
        .gte("fecha", format(queryStartDate, "yyyy-MM-dd"))
        .lte("fecha", format(queryEndDate, "yyyy-MM-dd"))
        .order("fecha")
        .order("hora_inicio");

      if (error) throw error;
      return data;
    },
  });

  // Fetch from citas_agendadas table (sin filtros, se aplicarán después)
  const { data: citasAgendadasData, isLoading: isLoadingCitasAgendadas } = useQuery({
    queryKey: [
      "citas-agendadas-range",
      format(queryStartDate, "yyyy-MM-dd"),
      format(queryEndDate, "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("citas_agendadas")
        .select("*")
        .gte("fecha", format(queryStartDate, "yyyy-MM-dd"))
        .lte("fecha", format(queryEndDate, "yyyy-MM-dd"))
        .order("fecha")
        .order("hora_inicio");

      if (error) throw error;
      
      // Helper function to convert 12-hour format to 24-hour format
      const convertTo24Hour = (time12h: string): string => {
        if (!time12h) return "00:00:00";
        
        const trimmedTime = time12h.trim();
        const isPM = trimmedTime.toLowerCase().includes('pm');
        const isAM = trimmedTime.toLowerCase().includes('am');
        
        // Remove AM/PM and clean up
        let timeStr = trimmedTime.replace(/\s*(am|pm)/gi, '').trim();
        
        // Parse hours and minutes
        const parts = timeStr.split(':');
        let hours = parseInt(parts[0] || '0');
        const minutes = parts[1] || '00';
        
        // Convert to 24-hour format
        if (isPM && hours !== 12) {
          hours += 12;
        } else if (isAM && hours === 12) {
          hours = 0;
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
      };
      
      // Transform citas_agendadas to match agendas format
      return (data || []).map(cita => {
        const clienteParts = (cita.cliente || '').split(' ');
        const profesionalParts = (cita.profesional || '').split(' ');
        
        return {
          id: `ca-${cita.id}` as any,
          fecha: cita.fecha,
          hora_inicio: convertTo24Hour(cita.hora_inicio),
          hora_fin: convertTo24Hour(cita.hora_fin),
          estado: cita.estado.toLowerCase(),
          id_cliente: 0,
          id_empleado: 0,
          id_servicio: 0,
          id_sucursal: 0,
          observaciones: null,
          clientes: {
            nombre: clienteParts[0] || 'Sin nombre',
            apellidos: clienteParts.slice(1).join(' ') || ''
          },
          empleados: {
            nombre: profesionalParts[0] || 'Sin asignar',
            apellidos: profesionalParts.slice(1).join(' ') || '',
            especialidad: null
          },
          sucursales: {
            nombre: cita.sucursal || 'Sin sucursal'
          },
          servicios: {
            nombre: cita.servicio || 'Sin servicio',
            duracion_minutos: 60,
            precio: cita.valor_mxn || 0
          },
          _source: 'citas_agendadas'
        };
      });
    },
  });

  const isLoading = isLoadingAgendas || isLoadingCitasAgendadas;
  const allAppointments = [...(agendasData || []), ...(citasAgendadasData || [])];

  // Usar sucursales de la base de datos para filtros
  const sucursales = sucursalesDB;

  // Empleados para el filtro dropdown (de la base de datos)
  const empleados = empleadosDB.map(emp => ({
    id: emp.id,
    nombre: emp.nombre,
    apellidos: emp.apellidos || '',
  }));

  // Profesionales filtrados por sucursal para el calendario diario
  const selectedSucursalId = selectedSucursal !== "all" ? parseInt(selectedSucursal) : null;
  const selectedSucursalNombre = selectedSucursalId 
    ? sucursales.find(s => s.id === selectedSucursalId)?.nombre 
    : null;
  
  const profesionalesCalendario = empleadosDB
    .filter(emp => {
      // Filtrar por sucursal si está seleccionada
      if (selectedSucursalId && emp.id_sucursal !== selectedSucursalId) {
        return false;
      }
      // Filtrar por empleado si está seleccionado
      if (selectedEmpleado !== "all") {
        return emp.id === parseInt(selectedEmpleado);
      }
      return true;
    })
    .map(emp => ({
      id: emp.id,
      nombre: emp.nombre,
      apellidos: emp.apellidos || '',
    }));

  const servicios = Array.from(
    new Set(allAppointments.map(apt => apt.servicios?.nombre).filter(Boolean))
  ).map((nombre, index) => ({ id: index + 1, nombre: nombre as string }));

  // Aplicar filtros en memoria
  const appointments = allAppointments.filter(apt => {
    if (selectedSucursalNombre && apt.sucursales?.nombre !== selectedSucursalNombre) {
      return false;
    }
    if (selectedEmpleado !== "all") {
      const empleadoNombre = empleados.find(e => e.id === parseInt(selectedEmpleado));
      const aptNombre = apt.empleados?.nombre || '';
      const aptApellidos = apt.empleados?.apellidos || '';
      const aptNombreCompleto = `${aptNombre} ${aptApellidos}`.trim();
      const empleadoNombreCompleto = empleadoNombre ? `${empleadoNombre.nombre} ${empleadoNombre.apellidos}`.trim() : '';
      if (empleadoNombre && aptNombreCompleto !== empleadoNombreCompleto) {
        return false;
      }
    }
    if (selectedEstado !== "all" && apt.estado?.toLowerCase() !== selectedEstado.toLowerCase()) {
      return false;
    }
    if (selectedServicio !== "all" && apt.servicios?.nombre !== servicios.find(s => s.id === parseInt(selectedServicio))?.nombre) {
      return false;
    }
    return true;
  });

  // Handle entering reschedule mode
  const handleStartReschedule = (apt: any) => {
    if (apt._source === 'citas_agendadas' || typeof apt.id !== 'number') {
      toast.error('No se puede reagendar una cita importada');
      return;
    }
    setAppointmentToReschedule({
      id: apt.id,
      fecha: apt.fecha,
      hora_inicio: apt.hora_inicio,
      hora_fin: apt.hora_fin,
      cliente_nombre: `${apt.clientes?.nombre || ''} ${apt.clientes?.apellidos || ''}`.trim(),
      servicio_nombre: apt.servicios?.nombre || 'Sin servicio',
      id_empleado: apt.id_empleado,
    });
    setRescheduleMode(true);
    setViewRange("day"); // Switch to day view for easier slot selection
    toast.info('Selecciona un bloque disponible para reagendar la cita', {
      description: 'Navega entre días usando los controles de fecha'
    });
  };

  // Handle canceling reschedule mode
  const handleCancelReschedule = () => {
    setRescheduleMode(false);
    setAppointmentToReschedule(null);
  };

  // ESC key to exit reschedule mode
  useEffect(() => {
    if (!rescheduleMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelReschedule();
        toast.info("Modo reagendar cancelado");
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [rescheduleMode]);

  // Handle completing the reschedule
  const handleCompleteReschedule = async (professionalId: number, hour: number, minute: number = 0) => {
    if (!appointmentToReschedule) return;

    const newFecha = format(selectedDate, 'yyyy-MM-dd');
    const newHoraInicio = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    
    // Calculate new end time preserving original duration
    const [oldHoursStart, oldMinsStart] = appointmentToReschedule.hora_inicio.split(':').map(Number);
    const [oldHoursEnd, oldMinsEnd] = appointmentToReschedule.hora_fin.split(':').map(Number);
    const durationMinutes = (oldHoursEnd * 60 + oldMinsEnd) - (oldHoursStart * 60 + oldMinsStart);
    
    const newEndTotalMinutes = hour * 60 + minute + durationMinutes;
    const newEndHour = Math.floor(newEndTotalMinutes / 60);
    const newEndMinute = newEndTotalMinutes % 60;
    const newHoraFin = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}:00`;

    try {
      const { error } = await supabase
        .from('agendas')
        .update({
          fecha: newFecha,
          hora_inicio: newHoraInicio,
          hora_fin: newHoraFin,
          id_empleado: professionalId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentToReschedule.id);

      if (error) throw error;

      toast.success('Cita reagendada exitosamente', {
        description: `${appointmentToReschedule.cliente_nombre} - ${format(selectedDate, "d 'de' MMMM", { locale: es })} a las ${newHoraInicio.substring(0, 5)}`
      });
      
      queryClient.invalidateQueries({ queryKey: ['appointments-range'] });
      handleCancelReschedule();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Error al reagendar la cita');
    }
  };

  // Handle completing the reschedule from weekly view
  const handleCompleteRescheduleWeekly = async (professionalId: number, hour: number, date: Date) => {
    if (!appointmentToReschedule) return;

    const newFecha = format(date, 'yyyy-MM-dd');
    const newHoraInicio = `${hour.toString().padStart(2, '0')}:00:00`;
    
    // Calculate new end time preserving original duration
    const [oldHoursStart, oldMinsStart] = appointmentToReschedule.hora_inicio.split(':').map(Number);
    const [oldHoursEnd, oldMinsEnd] = appointmentToReschedule.hora_fin.split(':').map(Number);
    const durationMinutes = (oldHoursEnd * 60 + oldMinsEnd) - (oldHoursStart * 60 + oldMinsStart);
    
    const newEndTotalMinutes = hour * 60 + durationMinutes;
    const newEndHour = Math.floor(newEndTotalMinutes / 60);
    const newEndMinute = newEndTotalMinutes % 60;
    const newHoraFin = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}:00`;

    try {
      const { error } = await supabase
        .from('agendas')
        .update({
          fecha: newFecha,
          hora_inicio: newHoraInicio,
          hora_fin: newHoraFin,
          id_empleado: professionalId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentToReschedule.id);

      if (error) throw error;

      toast.success('Cita reagendada exitosamente', {
        description: `${appointmentToReschedule.cliente_nombre} - ${format(date, "d 'de' MMMM", { locale: es })} a las ${newHoraInicio.substring(0, 5)}`
      });
      
      queryClient.invalidateQueries({ queryKey: ['appointments-range'] });
      handleCancelReschedule();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Error al reagendar la cita');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Agenda
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las citas y horarios de los profesionales
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBloqueoDialogOpen(true)}>
            <Ban className="h-4 w-4 mr-2" />
            Bloquear Horario
          </Button>
          <AppointmentDialog />
        </div>
      </div>

      <AgendaFilters
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedSucursal={selectedSucursal}
        onSucursalChange={setSelectedSucursal}
        selectedEmpleado={selectedEmpleado}
        onEmpleadoChange={setSelectedEmpleado}
        selectedEstado={selectedEstado}
        onEstadoChange={setSelectedEstado}
        selectedServicio={selectedServicio}
        onServicioChange={setSelectedServicio}
        sucursales={sucursales}
        empleados={empleados}
        servicios={servicios}
        viewRange={viewRange}
        onViewRangeChange={setViewRange}
      />

      {/* Reschedule mode banner */}
      {rescheduleMode && appointmentToReschedule && (
        <Alert className="border-primary bg-primary/10">
          <CalendarClock className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span>
              <strong>Modo Reagendar:</strong> {appointmentToReschedule.cliente_nombre} - {appointmentToReschedule.servicio_nombre}
              <span className="text-muted-foreground ml-2">
                (Original: {format(new Date(appointmentToReschedule.fecha + 'T12:00:00'), "d MMM", { locale: es })} {appointmentToReschedule.hora_inicio.substring(0, 5)})
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelReschedule}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Sticky: solo Tabs + KPIs (como en la imagen) */}
      <div
        ref={stickyRef}
        className="sticky top-0 z-30 -mx-6 px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-4 border-b border-border/60 shadow-sm"
      >
        <div className="space-y-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "table")}>
            <TabsList>
              <TabsTrigger value="calendar">Vista Calendario</TabsTrigger>
              <TabsTrigger value="table">Vista Tabla</TabsTrigger>
            </TabsList>
          </Tabs>

          {!isLoading && appointments && <WeeklyStats appointments={appointments} />}
        </div>
      </div>

      <div className="animate-fade-in">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "calendar" ? (
          viewRange === "day" ? (
            profesionalesCalendario.length > 0 ? (
              <DailyCalendar
                appointments={appointments}
                bloqueos={bloqueos}
                selectedDate={selectedDate}
                professionals={profesionalesCalendario}
                rescheduleMode={rescheduleMode}
                appointmentToReschedule={appointmentToReschedule}
                onAppointmentClick={(id) => {
                  if (!rescheduleMode) {
                    setSelectedAppointmentId(id);
                    setDetailDialogOpen(true);
                  }
                }}
                onBloqueoClick={(id) => {
                  setSelectedBloqueoId(id);
                  setBloqueoDetailDialogOpen(true);
                }}
                onAddAppointment={(professionalId, hour, minute = 0) => {
                  // If in reschedule mode, complete the reschedule
                  if (rescheduleMode && appointmentToReschedule) {
                    handleCompleteReschedule(professionalId, hour, minute);
                    return;
                  }
                  
                  const professional = profesionalesCalendario.find(e => e.id === professionalId);
                  const sucursalSeleccionada = selectedSucursal !== "all" 
                    ? sucursales.find(s => s.id === parseInt(selectedSucursal))?.nombre 
                    : undefined;
                  
                  // Calculate end time (+15 minutes default)
                  const endMinute = minute + 15;
                  const endHour = hour + Math.floor(endMinute / 60);
                  const finalEndMinute = endMinute % 60;
                  
                  setQuickAddInitialValues({
                    profesional_nombre: professional ? `${professional.nombre} ${professional.apellidos}` : '',
                    fecha: format(selectedDate, 'yyyy-MM-dd'),
                    hora_inicio: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                    hora_fin: `${endHour.toString().padStart(2, '0')}:${finalEndMinute.toString().padStart(2, '0')}`,
                    sucursal_nombre: sucursalSeleccionada,
                  });
                  setQuickAddDialogOpen(true);
                }}
                onExtendAppointment={async (apt, minutes) => {
                  if (apt._source === 'citas_agendadas' || typeof apt.id !== 'number') {
                    toast.error('No se puede extender una cita importada');
                    return;
                  }
                  try {
                    const [hoursFin, minutesFin] = apt.hora_fin.split(':').map(Number);
                    const totalMinutes = minutesFin + minutes;
                    const newHour = hoursFin + Math.floor(totalMinutes / 60);
                    const newMinute = totalMinutes % 60;
                    const newHoraFin = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}:00`;
                    
                    const { error } = await supabase
                      .from('agendas')
                      .update({ 
                        hora_fin: newHoraFin,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', apt.id);
                      
                    if (error) throw error;
                    toast.success(`Cita extendida ${minutes} minutos`);
                    queryClient.invalidateQueries({ queryKey: ['appointments-range'] });
                  } catch (error) {
                    console.error('Error extending appointment:', error);
                    toast.error('Error al extender la cita');
                  }
                }}
                onStartReschedule={handleStartReschedule}
              />
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay profesionales</h3>
                  <p className="text-muted-foreground mb-4">
                    No se encontraron profesionales para la sucursal seleccionada
                  </p>
                </CardContent>
              </Card>
            )
          ) : (
            <WeeklyCalendar
              appointments={appointments}
              bloqueos={bloqueos}
              weekStart={weekStart}
              professionals={profesionalesCalendario}
              rescheduleMode={rescheduleMode}
              appointmentToReschedule={appointmentToReschedule}
              onAppointmentClick={(id) => {
                if (!rescheduleMode) {
                  setSelectedAppointmentId(id);
                  setDetailDialogOpen(true);
                }
              }}
              onBloqueoClick={(id) => {
                setSelectedBloqueoId(id);
                setBloqueoDetailDialogOpen(true);
              }}
              onAddAppointment={(professionalId, hour, date) => {
                // If in reschedule mode, complete the reschedule
                if (rescheduleMode && appointmentToReschedule) {
                  handleCompleteRescheduleWeekly(professionalId, hour, date);
                  return;
                }
                
                const professional = profesionalesCalendario.find(p => p.id === professionalId);
                const sucursalSeleccionada = selectedSucursal !== "all" 
                  ? sucursales.find(s => s.id === parseInt(selectedSucursal))?.nombre 
                  : undefined;
                setQuickAddInitialValues({
                  profesional_nombre: professional ? `${professional.nombre} ${professional.apellidos}` : '',
                  fecha: format(date, 'yyyy-MM-dd'),
                  hora_inicio: `${hour.toString().padStart(2, '0')}:00`,
                  sucursal_nombre: sucursalSeleccionada,
                });
                setQuickAddDialogOpen(true);
              }}
              onExtendAppointment={async (apt, minutes) => {
                if (apt._source === 'citas_agendadas' || typeof apt.id !== 'number') {
                  toast.error('No se puede extender una cita importada');
                  return;
                }
                try {
                  const [hoursFin, minutesFin] = apt.hora_fin.split(':').map(Number);
                  const totalMinutes = minutesFin + minutes;
                  const newHour = hoursFin + Math.floor(totalMinutes / 60);
                  const newMinute = totalMinutes % 60;
                  const newHoraFin = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}:00`;
                  
                  const { error } = await supabase
                    .from('agendas')
                    .update({ 
                      hora_fin: newHoraFin,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', apt.id);
                    
                  if (error) throw error;
                  toast.success(`Cita extendida ${minutes} minutos`);
                  queryClient.invalidateQueries({ queryKey: ['appointments-range'] });
                } catch (error) {
                  console.error('Error extending appointment:', error);
                  toast.error('Error al extender la cita');
                }
              }}
              onStartReschedule={handleStartReschedule}
            />
          )
        ) : appointments && appointments.length > 0 ? (
          <AgendaTableView
            appointments={appointments}
            onAppointmentClick={(id) => {
              setSelectedAppointmentId(id);
              setDetailDialogOpen(true);
            }}
          />
        ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay citas agendadas</h3>
            <p className="text-muted-foreground mb-4">
              No se encontraron citas para los filtros seleccionados
            </p>
            <AppointmentDialog />
          </CardContent>
        </Card>
      )}

      <AppointmentDetailDialog
        appointmentId={selectedAppointmentId}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />

      <BloqueoDialog
        open={bloqueoDialogOpen}
        onOpenChange={setBloqueoDialogOpen}
        sucursales={sucursales}
        empleados={empleados}
        defaultDate={selectedDate}
      />

      <BloqueoDetailDialog
        bloqueoId={selectedBloqueoId}
        open={bloqueoDetailDialogOpen}
        onOpenChange={setBloqueoDetailDialogOpen}
      />

      {/* Quick add appointment dialog */}
      <AppointmentDialog
        initialValues={quickAddInitialValues}
        open={quickAddDialogOpen}
        onOpenChange={setQuickAddDialogOpen}
        showTrigger={false}
      />
    </div>
  </div>
  );
};

export default Agenda;
