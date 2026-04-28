import { Plus, Clock, ChevronsUpDown, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { parseDateOnlyToLocal } from "@/lib/date";
import { useNavigate } from "react-router-dom";
import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadgeSelector } from "./StatusBadgeSelector";

interface Appointment {
  id: number | string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  id_cliente: number;
  id_empleado: number;
  id_servicio: number;
  id_sucursal: number;
  clientes: { nombre: string; apellidos: string } | null;
  empleados: { nombre: string; apellidos: string } | null;
  sucursales: { nombre: string } | null;
  servicios: { nombre: string; duracion_minutos: number; precio: number } | null;
  observaciones?: string;
  _source?: string;
}

interface Bloqueo {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  id_empleado: number | null;
  id_sucursal: number;
  motivo: string | null;
  empleados: { nombre: string; apellidos: string } | null;
  sucursales: { nombre: string };
}

interface Professional {
  id: number;
  nombre: string;
  apellidos: string;
}

interface RescheduleAppointment {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  cliente_nombre: string;
  servicio_nombre: string;
  id_empleado: number;
}

interface WeeklyCalendarProps {
  appointments: Appointment[];
  bloqueos: Bloqueo[];
  weekStart: Date;
  professionals: Professional[];
  rescheduleMode?: boolean;
  appointmentToReschedule?: RescheduleAppointment | null;
  onAppointmentClick: (appointmentId: number | string) => void;
  onBloqueoClick: (bloqueoId: number) => void;
  onAddAppointment?: (professionalId: number, hour: number, date: Date) => void;
  onBlockTime?: (professionalId: number, hour: number, date: Date) => void;
  onExtendAppointment?: (appointment: Appointment, minutes: number) => void;
  onStartReschedule?: (appointment: Appointment) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm
const DAYS = 6; // Monday to Saturday

// Colores sobrios y suaves para cada profesional
const PROFESSIONAL_COLORS = [
  { bg: 'bg-slate-50/50 dark:bg-slate-900/20', border: 'border-l-slate-400', header: 'bg-slate-500', text: 'text-white' },
  { bg: 'bg-stone-50/50 dark:bg-stone-900/20', border: 'border-l-stone-400', header: 'bg-stone-500', text: 'text-white' },
  { bg: 'bg-zinc-50/50 dark:bg-zinc-900/20', border: 'border-l-zinc-400', header: 'bg-zinc-500', text: 'text-white' },
  { bg: 'bg-neutral-50/50 dark:bg-neutral-900/20', border: 'border-l-neutral-400', header: 'bg-neutral-500', text: 'text-white' },
  { bg: 'bg-gray-50/50 dark:bg-gray-900/20', border: 'border-l-gray-400', header: 'bg-gray-500', text: 'text-white' },
  { bg: 'bg-slate-100/50 dark:bg-slate-800/20', border: 'border-l-slate-500', header: 'bg-slate-600', text: 'text-white' },
  { bg: 'bg-stone-100/50 dark:bg-stone-800/20', border: 'border-l-stone-500', header: 'bg-stone-600', text: 'text-white' },
  { bg: 'bg-zinc-100/50 dark:bg-zinc-800/20', border: 'border-l-zinc-500', header: 'bg-zinc-600', text: 'text-white' },
];

const getProfessionalColor = (index: number) => {
  return PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length];
};

const getEstadoBorderColor = (estado: string) => {
  const colors: Record<string, string> = {
    agendada: "border-l-slate-400",
    confirmada: "border-l-sky-400",
    en_atencion: "border-l-amber-300",
    finalizada: "border-l-emerald-400",
    cancelada: "border-l-rose-400",
    no_asiste: "border-l-orange-300",
  };
  return colors[estado] || "border-l-slate-400";
};

const getEstadoBgColor = (estado: string) => {
  const colors: Record<string, string> = {
    agendada: "bg-slate-50/80 dark:bg-slate-900/30",
    confirmada: "bg-sky-50/80 dark:bg-sky-900/30",
    en_atencion: "bg-amber-50/80 dark:bg-amber-900/30",
    finalizada: "bg-emerald-50/80 dark:bg-emerald-900/30",
    cancelada: "bg-rose-50/80 dark:bg-rose-900/30",
    no_asiste: "bg-orange-50/80 dark:bg-orange-900/30",
  };
  return colors[estado] || "bg-slate-50/80 dark:bg-slate-900/30";
};

// Draggable Resizable Compact Appointment for Weekly View
function DraggableCompactAppointment({ 
  apt, 
  onAppointmentClick,
  onClientClick,
  onAddAppointment,
  onExtendAppointment,
  onResizeEnd,
  onStartReschedule,
  allAppointments,
  professionalName,
  isDragging: externalIsDragging,
  rescheduleMode,
  isBeingRescheduled
}: { 
  apt: Appointment;
  onAppointmentClick: (id: number | string) => void;
  onClientClick?: (clientId: number) => void;
  onAddAppointment?: () => void;
  onExtendAppointment?: (minutes: number) => void;
  onResizeEnd?: (apt: Appointment, newHoraFin: string) => void;
  onStartReschedule?: () => void;
  allAppointments: Appointment[];
  professionalName: string;
  isDragging?: boolean;
  rescheduleMode?: boolean;
  isBeingRescheduled?: boolean;
}) {
  const isImported = apt._source === 'citas_agendadas';

  const [dragEnabled, setDragEnabled] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resizePreview, setResizePreview] = useState<{ horaFin: string; duration: number } | null>(null);

  const dragWasActiveRef = useRef(false);
  const clickTimeoutRef = useRef<number | null>(null);
  const suppressMenuOpenRef = useRef(false);
  const lastPointerDownAtRef = useRef(0);
  const activatedFromPointerDownRef = useRef(false);

  const resizeStartY = useRef<number>(0);
  const originalEndMinutesRef = useRef<number>(0);
  const liveEndMinutesRef = useRef<number | null>(null);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `weekly-apt-${apt.id}`,
    data: { appointment: apt },
    disabled: isImported || !dragEnabled,
  });

  // Reset drag mode only after a real drag happened
  useEffect(() => {
    if (isDragging) {
      dragWasActiveRef.current = true;
    }

    if (!isDragging && dragEnabled && dragWasActiveRef.current) {
      dragWasActiveRef.current = false;
      setDragEnabled(false);
    }
  }, [isDragging, dragEnabled]);

  // ESC key to exit drag mode
  useEffect(() => {
    if (!dragEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDragEnabled(false);
        toast.info("Modo arrastre desactivado");
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If clicking outside this appointment card, exit drag mode
      if (!target.closest(`[data-apt-id="${apt.id}"]`)) {
        setDragEnabled(false);
        toast.info("Modo arrastre desactivado");
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [dragEnabled, apt.id]);

  const DOUBLE_CLICK_WINDOW_MS = 650;

  // Cleanup click timeout
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current != null) {
        window.clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };
  }, []);

  const activateDragMode = (e?: { stopPropagation?: () => void; preventDefault?: () => void }) => {
    if (isImported) {
      toast.error("No se puede mover una cita importada");
      return;
    }

    e?.stopPropagation?.();
    e?.preventDefault?.();

    if (clickTimeoutRef.current != null) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    setMenuOpen(false);

    setDragEnabled(true);
    toast.info("Modo arrastre activado", {
      description: "Arrastra la cita a su nueva ubicación",
      duration: 2000,
    });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (dragEnabled) return;

    // En el 2do click (doble click), activamos modo arrastre (y evitamos menú)
    if (e.detail > 1) {
      activatedFromPointerDownRef.current = true;
      suppressMenuOpenRef.current = true;
      activateDragMode(e);
      return;
    }

    if (suppressMenuOpenRef.current) {
      suppressMenuOpenRef.current = false;
      return;
    }

    if (clickTimeoutRef.current != null) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    // Espera la ventana de doble-click antes de abrir el menú.
    clickTimeoutRef.current = window.setTimeout(() => {
      setMenuOpen(true);
    }, DOUBLE_CLICK_WINDOW_MS);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (dragEnabled) return;
    if (isImported) return;

    const now = Date.now();
    const isDouble = now - lastPointerDownAtRef.current <= DOUBLE_CLICK_WINDOW_MS;
    lastPointerDownAtRef.current = now;

    if (isDouble) {
      activatedFromPointerDownRef.current = true;
      suppressMenuOpenRef.current = true;
      activateDragMode(e);
    }
  };

  // IMPORTANT: when drag mode is active we must NOT override dnd-kit listeners.
  const handleAppointmentPointerDown = (e: React.PointerEvent) => {
    if (dragEnabled) {
      (listeners as any).onPointerDown?.(e);
      return;
    }

    handlePointerDown(e);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Si ya activamos desde pointerdown (más confiable), evitamos doble toast
    if (activatedFromPointerDownRef.current) {
      activatedFromPointerDownRef.current = false;
      return;
    }

    activateDragMode(e);
  };

  const horaInicio = apt.hora_inicio?.substring(0, 5) || "";
  const horaFin = apt.hora_fin?.substring(0, 5) || "";
  const precio = apt.servicios?.precio ? `$${apt.servicios.precio}` : "";
  const employeeDisplayName = `${apt.empleados?.nombre || ""} ${apt.empleados?.apellidos || ""}`.trim() || professionalName;

  const borderColor = getEstadoBorderColor(apt.estado);
  const bgColor = getEstadoBgColor(apt.estado);

  const parseTimeToMinutes = useCallback((time: string) => {
    const [hStr, mStr] = time.split(":");
    const h = Number(hStr ?? 0);
    const m = Number(mStr ?? 0);
    return h * 60 + m;
  }, []);

  const minutesToHHMM = useCallback((minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }, []);

  const startMinutes = parseTimeToMinutes(apt.hora_inicio);
  const currentEndMinutes = parseTimeToMinutes(apt.hora_fin);
  const currentDuration = currentEndMinutes - startMinutes;

  const isSameProfessional = useCallback(
    (other: Appointment) => {
      if (other.id_empleado === apt.id_empleado) return true;
      const otherProfName = `${other.empleados?.nombre || ""} ${other.empleados?.apellidos || ""}`.trim();
      return otherProfName === professionalName;
    },
    [apt.id_empleado, professionalName]
  );

  const getMaxAllowedEndMinutes = useCallback(() => {
    const WORK_END_MINUTES = 21 * 60;
    let maxEnd = WORK_END_MINUTES;

    for (const other of allAppointments) {
      if (other.id === apt.id) continue;
      if (other.fecha !== apt.fecha) continue;
      if (!isSameProfessional(other)) continue;

      const otherStart = parseTimeToMinutes(other.hora_inicio);
      if (otherStart > startMinutes) {
        maxEnd = Math.min(maxEnd, otherStart);
      }
    }

    return maxEnd;
  }, [allAppointments, apt.id, apt.fecha, isSameProfessional, parseTimeToMinutes, startMinutes]);

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  const handleResizeStart = (e: React.PointerEvent) => {
    if (isImported) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;

    try {
      target.setPointerCapture(pointerId);
    } catch {
      // ignore
    }

    setIsResizing(true);
    resizeStartY.current = e.clientY;

    originalEndMinutesRef.current = parseTimeToMinutes(apt.hora_fin);
    liveEndMinutesRef.current = originalEndMinutesRef.current;

    const MIN_END_MINUTES = startMinutes + 15;
    const MAX_END_MINUTES = Math.max(MIN_END_MINUTES, getMaxAllowedEndMinutes());

    const PIXELS_PER_15_MIN = 20;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - resizeStartY.current;
      const deltaMinutes = Math.round(deltaY / PIXELS_PER_15_MIN) * 15;

      const desiredEnd = originalEndMinutesRef.current + deltaMinutes;
      const clampedEnd = clamp(desiredEnd, MIN_END_MINUTES, MAX_END_MINUTES);

      liveEndMinutesRef.current = clampedEnd;

      setResizePreview({
        horaFin: minutesToHHMM(clampedEnd),
        duration: clampedEnd - startMinutes,
      });
    };

    const handlePointerUp = () => {
      setIsResizing(false);

      const finalEndMinutes = liveEndMinutesRef.current;
      if (finalEndMinutes != null && finalEndMinutes !== currentEndMinutes) {
        onResizeEnd?.(apt, `${minutesToHHMM(finalEndMinutes)}:00`);
      }

      setResizePreview(null);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      try {
        target.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleClientClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (apt.id_cliente && onClientClick) {
      onClientClick(apt.id_cliente);
    }
  };

  const displayHoraFin = resizePreview?.horaFin ?? horaFin;
  const displayDuration = resizePreview?.duration ?? currentDuration;

  // When dragging, show a placeholder
  if (isDragging) {
    return (
      <div className="mb-1 h-[44px] w-full p-1.5 rounded border-2 border-dashed border-primary/50 bg-primary/5 opacity-50 overflow-hidden">
        <p className="text-xs font-medium truncate">
          {apt.clientes?.nombre} {apt.clientes?.apellidos}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {apt.servicios?.nombre}
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative">
        {dragEnabled ? (
          <div
            ref={setNodeRef}
            data-apt-id={apt.id}
            {...attributes}
            {...listeners}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handleAppointmentPointerDown}
            className={`relative mb-1 w-full p-1.5 rounded border-l-4 cursor-grab active:cursor-grabbing hover:opacity-80 transition-colors group overflow-visible ${borderColor} ${bgColor} ${isResizing ? 'ring-2 ring-primary z-30' : ''} ring-2 ring-primary`}
            style={{ minHeight: '44px' }}
          >
            <div className="pr-6">
              <p
                className="text-xs font-semibold text-foreground truncate hover:text-primary hover:underline cursor-pointer"
                onClick={handleClientClick}
              >
                {apt.clientes?.nombre} {apt.clientes?.apellidos}
              </p>
            </div>
            <p className="text-[10px] font-medium text-foreground truncate">
              Servicio: {apt.servicios?.nombre || "Sin servicio"} {precio && `(${precio})`}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Profesional: {employeeDisplayName}
            </p>
            <p className={`text-[10px] font-medium truncate ${isResizing ? 'text-primary' : 'text-muted-foreground'}`}>
              {horaInicio} - {displayHoraFin} ({displayDuration} min)
            </p>

            {/* Resize handle at bottom */}
            {!isImported && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onPointerDown={handleResizeStart}
                    className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-muted/50 to-transparent rounded-b"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Arrastra para ajustar duración
                </TooltipContent>
              </Tooltip>
            )}

            {/* Resize preview overlay */}
            {isResizing && resizePreview && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium shadow-lg whitespace-nowrap z-50">
                {horaInicio} - {resizePreview.horaFin} ({resizePreview.duration} min)
              </div>
            )}
          </div>
        ) : (
          <DropdownMenu
            open={menuOpen}
            onOpenChange={(next) => {
              if (!next) setMenuOpen(false);
            }}
          >
            <DropdownMenuTrigger asChild>
              <div
                ref={setNodeRef}
                data-apt-id={apt.id}
                onClick={handleCardClick}
                onDoubleClick={handleDoubleClick}
                onPointerDown={handleAppointmentPointerDown}
                className={`relative mb-1 w-full p-1.5 rounded border-l-4 cursor-pointer hover:opacity-80 transition-colors group overflow-visible ${borderColor} ${bgColor} ${isResizing ? 'ring-2 ring-primary z-30' : ''} ${isBeingRescheduled ? 'ring-2 ring-primary ring-offset-2 animate-pulse' : ''}`}
                style={{ minHeight: '44px' }}
              >
                <div className="pr-6">
                  <p
                    className="text-xs font-semibold text-foreground truncate hover:text-primary hover:underline cursor-pointer"
                    onClick={handleClientClick}
                  >
                    {apt.clientes?.nombre} {apt.clientes?.apellidos}
                  </p>
                </div>
                <p className="text-[10px] font-medium text-foreground truncate">
                  Servicio: {apt.servicios?.nombre || "Sin servicio"} {precio && `(${precio})`}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Profesional: {employeeDisplayName}
                </p>
                <p className={`text-[10px] font-medium truncate ${isResizing ? 'text-primary' : 'text-muted-foreground'}`}>
                  {horaInicio} - {displayHoraFin} ({displayDuration} min)
                </p>

                {/* Resize handle at bottom */}
                {!isImported && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        onPointerDown={handleResizeStart}
                        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-muted/50 to-transparent rounded-b"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Arrastra para ajustar duración
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Resize preview overlay */}
                {isResizing && resizePreview && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium shadow-lg whitespace-nowrap z-50">
                    {horaInicio} - {resizePreview.horaFin} ({resizePreview.duration} min)
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onAddAppointment?.()}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar cita
              </DropdownMenuItem>
              {!isImported && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Clock className="mr-2 h-4 w-4" />
                    Extender tiempo
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onExtendAppointment?.(15)}>
                      +15 minutos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExtendAppointment?.(30)}>
                      +30 minutos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExtendAppointment?.(45)}>
                      +45 minutos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExtendAppointment?.(60)}>
                      +60 minutos
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {!isImported && onStartReschedule && (
                <DropdownMenuItem onClick={onStartReschedule}>
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Reagendar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onAppointmentClick(apt.id)}>
                Ver detalle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!isImported && (
          <div className="absolute right-1 top-1 z-40">
            <StatusBadgeSelector
              appointmentId={apt.id}
              currentState={apt.estado as 'agendada' | 'confirmada' | 'en_atencion' | 'finalizada' | 'cancelada' | 'no_asiste'}
              horaInicio={apt.hora_inicio}
              fecha={apt.fecha}
              idEmpleado={apt.id_empleado}
              isImported={isImported}
              size="sm"
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Droppable Time Slot Component for Weekly View
function DroppableTimeSlot({ 
  id,
  children, 
  hasBloqueos,
  colorConfig,
  onEmptyClick,
  onBlockTime,
  isOver,
  hasContent
}: { 
  id: string;
  children: React.ReactNode;
  hasBloqueos: boolean;
  colorConfig: { bg: string; border: string };
  onEmptyClick?: () => void;
  onBlockTime?: () => void;
  isOver?: boolean;
  hasContent?: boolean;
}) {
  const { setNodeRef, isOver: droppableIsOver } = useDroppable({ id });
  const isHovered = isOver ?? droppableIsOver;
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only trigger if clicking on the background itself or empty overlay
    const target = e.target as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    
    if ((target === currentTarget || target.closest('[data-empty-overlay]')) && !hasBloqueos) {
      e.stopPropagation();
      setShowQuickMenu((prev) => !prev);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleBackgroundClick}
      className={`relative min-h-[60px] border border-border rounded-md p-1 transition-colors border-l-4 overflow-visible ${colorConfig.border} ${
        hasBloqueos 
          ? 'bg-muted/40 cursor-not-allowed' 
          : isHovered
            ? 'bg-primary/10 border-primary/50'
            : colorConfig.bg + ' hover:opacity-80 cursor-pointer'
      }`}
    >
      {/* Clickable overlay for empty slots */}
      {!hasContent && !hasBloqueos && !showQuickMenu && (
        <div 
          data-empty-overlay
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setShowQuickMenu((prev) => !prev);
          }}
        >
          <Plus className="h-4 w-4 text-muted-foreground/30" />
        </div>
      )}

      {showQuickMenu && !hasContent && !hasBloqueos && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-[1px] rounded-md">
          <div className="w-[170px] rounded-md border bg-popover p-2 shadow-lg space-y-1">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start h-8"
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickMenu(false);
                onEmptyClick?.();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agendar cita
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start h-8"
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickMenu(false);
                onBlockTime?.();
              }}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Bloquear tiempo
            </Button>
          </div>
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// Droppable Day Cell for Multiple Professionals View
function DroppableDayCell({
  id,
  children,
  hasBloqueos,
  colorConfig,
  onEmptyClick,
  onBlockTime,
  hasContent
}: {
  id: string;
  children: React.ReactNode;
  hasBloqueos: boolean;
  colorConfig: { bg: string; border: string };
  onEmptyClick?: () => void;
  onBlockTime?: () => void;
  hasContent?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only trigger if clicking on the background itself, not on children
    const target = e.target as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    
    // Check if the click is on the container or on the empty state overlay
    if (target === currentTarget || target.closest('[data-empty-overlay]')) {
      e.stopPropagation();
      setShowQuickMenu((prev) => !prev);
    }
  };

  return (
    <div 
      ref={setNodeRef}
      className={`relative min-h-[80px] p-1 rounded-md border border-l-4 ${colorConfig.border} ${
        hasBloqueos 
          ? 'bg-muted/40' 
          : isOver
            ? 'bg-primary/10 border-primary/50'
            : colorConfig.bg + ' hover:opacity-90'
      } cursor-pointer transition-colors overflow-auto max-h-[200px]`}
      onClick={handleBackgroundClick}
    >
      {/* Clickable overlay for empty areas */}
      {!hasContent && !hasBloqueos && !showQuickMenu && (
        <div 
          data-empty-overlay
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setShowQuickMenu((prev) => !prev);
          }}
        >
          <Plus className="h-4 w-4 text-muted-foreground/50" />
        </div>
      )}

      {showQuickMenu && !hasContent && !hasBloqueos && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-[1px] rounded-md">
          <div className="w-[170px] rounded-md border bg-popover p-2 shadow-lg space-y-1">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start h-8"
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickMenu(false);
                onEmptyClick?.();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agendar cita
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start h-8"
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickMenu(false);
                onBlockTime?.();
              }}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Bloquear tiempo
            </Button>
          </div>
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export function WeeklyCalendar({ 
  appointments, 
  bloqueos, 
  weekStart, 
  professionals,
  rescheduleMode,
  appointmentToReschedule,
  onAppointmentClick, 
  onBloqueoClick,
  onAddAppointment,
  onBlockTime,
  onExtendAppointment,
  onStartReschedule
}: WeeklyCalendarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const weekDays = Array.from({ length: DAYS }, (_, i) => addDays(startOfWeek(weekStart, { weekStartsOn: 1 }), i));
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const apt = active.data.current?.appointment as Appointment;
    setActiveAppointment(apt);
  };

  // Handle drag end - move appointment to new slot
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAppointment(null);

    if (!over) return;

    const apt = active.data.current?.appointment as Appointment;
    if (!apt || apt._source === "citas_agendadas") return;

    // Parse drop target: format is "weekly-slot-{profId}-{dayIndex}-{hour}" or "weekly-day-{profId}-{dayIndex}"
    const parts = over.id.toString().split("-");
    if (parts[0] !== "weekly") return;

    const slotType = parts[1]; // "slot" or "day"
    const profId = parseInt(parts[2] || "", 10);
    const dayIndex = parseInt(parts[3] || "", 10);
    const newHour = slotType === "slot" ? parseInt(parts[4] || "", 10) : null;

    if (Number.isNaN(profId) || Number.isNaN(dayIndex)) return;

    const newProfessional = professionals.find((p) => p.id === profId);
    if (!newProfessional) return;

    const newDate = weekDays[dayIndex];
    if (!newDate) return;

    const parseTimeToMinutes = (time: string) => {
      const [hStr, mStr] = time.split(":");
      return Number(hStr ?? 0) * 60 + Number(mStr ?? 0);
    };

    const formatMinutesToTime = (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
    };

    const currentStartMinutes = parseTimeToMinutes(apt.hora_inicio);
    const currentEndMinutes = parseTimeToMinutes(apt.hora_fin);
    const currentDuration = currentEndMinutes - currentStartMinutes;

    // If dropped on hourly slot, use that hour; otherwise keep original hour
    const preservedMinute = currentStartMinutes % 60;
    const targetHour = newHour !== null ? newHour : Math.floor(currentStartMinutes / 60);
    const newStartMinutes = targetHour * 60 + (newHour !== null ? 0 : preservedMinute);
    const newEndMinutes = newStartMinutes + currentDuration;

    const newHoraInicio = formatMinutesToTime(newStartMinutes);
    const newHoraFin = formatMinutesToTime(newEndMinutes);
    const newFecha = format(newDate, "yyyy-MM-dd");

    // Find the actual empleado ID from the database
    const { data: empleadoData } = await supabase
      .from("empleados")
      .select("id")
      .ilike("nombre", newProfessional.nombre)
      .ilike("apellidos", newProfessional.apellidos)
      .single();

    const newEmpleadoId = empleadoData?.id;

    // Check if anything changed
    const currentProfName = `${apt.empleados?.nombre || ""} ${apt.empleados?.apellidos || ""}`.trim();
    const newProfName = `${newProfessional.nombre} ${newProfessional.apellidos}`.trim();

    if (apt.fecha === newFecha && currentStartMinutes === newStartMinutes && currentProfName === newProfName) {
      return; // No change
    }

    try {
      const aptId = typeof apt.id === "number" ? apt.id : parseInt(String(apt.id).replace("ca-", ""));

      const { error } = await supabase
        .from("agendas")
        .update({
          fecha: newFecha,
          hora_inicio: newHoraInicio,
          hora_fin: newHoraFin,
          id_empleado: newEmpleadoId || apt.id_empleado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", aptId);

      if (error) throw error;

      toast.success("Cita movida", {
        description: `${format(newDate, "EEE d MMM", { locale: es })} a las ${newHoraInicio.substring(0, 5)} con ${newProfessional.nombre}`,
      });

      queryClient.invalidateQueries({ queryKey: ["appointments-range"] });
    } catch (error) {
      console.error("Error moving appointment:", error);
      toast.error("Error al mover la cita");
    }
  };

  // Custom collision detection
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    return closestCenter(args);
  }, []);

  // Handle resize end - update appointment duration
  const handleResizeEnd = async (apt: Appointment, newHoraFin: string) => {
    if (apt._source === 'citas_agendadas' || typeof apt.id !== 'number') {
      toast.error('No se puede redimensionar una cita importada');
      return;
    }

    try {
      const { error } = await supabase
        .from('agendas')
        .update({
          hora_fin: newHoraFin,
          updated_at: new Date().toISOString(),
        })
        .eq('id', apt.id);

      if (error) throw error;

      toast.success('Duración actualizada', {
        description: `Nueva hora de término: ${newHoraFin.substring(0, 5)}`,
      });

      queryClient.invalidateQueries({ queryKey: ['appointments-range'] });
    } catch (error) {
      console.error('Error updating appointment duration:', error);
      toast.error('Error al actualizar la duración');
    }
  };

  const getAppointmentsForProfessionalDayAndHour = (professional: Professional, day: Date, hour: number) => {
    return appointments.filter((apt) => {
      const aptDate = parseDateOnlyToLocal(apt.fecha);
      const aptHour = parseInt(apt.hora_inicio.split(":")[0]);
      const aptProfessionalName = `${apt.empleados?.nombre || ''} ${apt.empleados?.apellidos || ''}`.trim();
      const professionalName = `${professional.nombre} ${professional.apellidos}`.trim();
      return isSameDay(aptDate, day) && aptHour === hour && aptProfessionalName === professionalName;
    });
  };

  const getBloqueosForProfessionalDayAndHour = (professional: Professional, day: Date, hour: number) => {
    return bloqueos.filter((bloqueo) => {
      const bloqueoDate = parseDateOnlyToLocal(bloqueo.fecha);
      const horaInicio = parseInt(bloqueo.hora_inicio.split(":")[0]);
      const horaFin = parseInt(bloqueo.hora_fin.split(":")[0]);
      const bloqueoName = bloqueo.empleados 
        ? `${bloqueo.empleados.nombre} ${bloqueo.empleados.apellidos}`.trim()
        : null;
      const professionalName = `${professional.nombre} ${professional.apellidos}`.trim();
      const matchesProfessional = bloqueoName === null || bloqueoName === professionalName;
      return isSameDay(bloqueoDate, day) && hour >= horaInicio && hour < horaFin && matchesProfessional;
    });
  };

  const numProfessionals = professionals.length;
  const isSingleProfessionalView = professionals.length === 1;

  if (professionals.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No hay profesionales con citas para esta semana
      </div>
    );
  }

  // Single professional view: days as columns
  if (isSingleProfessionalView) {
    const professional = professionals[0];
    const colorConfig = getProfessionalColor(0);

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div>
          <div className="min-w-[1200px]">
            {/* Professional header */}
            <div className="text-center mb-4">
              <div className={`inline-block text-lg font-semibold px-6 py-2 rounded-lg ${colorConfig.header} ${colorConfig.text}`}>
                {professional.nombre} {professional.apellidos}
              </div>
            </div>

            {/* Days header row */}
            <div 
              className="grid gap-2 mb-2 sticky top-[var(--agenda-sticky-offset)] z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-2"
              style={{ gridTemplateColumns: `80px repeat(${DAYS}, 1fr)` }}
            >
              <div className="text-sm font-medium text-muted-foreground pt-2">Hora</div>
              {weekDays.map((day) => (
                <div 
                  key={day.toISOString()} 
                  className="text-center py-2 px-1 rounded-t-md bg-muted"
                >
                  <div className="text-sm font-semibold capitalize">
                    {format(day, "EEEE", { locale: es })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(day, "d MMM", { locale: es })}
                  </div>
                </div>
              ))}
            </div>

            {/* Time slots grid with days as columns */}
            {HOURS.map((hour) => (
              <div 
                key={hour} 
                className="grid gap-2 mb-1"
                style={{ gridTemplateColumns: `80px repeat(${DAYS}, 1fr)` }}
              >
                <div className="text-sm text-muted-foreground font-medium pt-2">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                {weekDays.map((day, dayIndex) => {
                  const dayAppointments = getAppointmentsForProfessionalDayAndHour(professional, day, hour);
                  const dayBloqueos = getBloqueosForProfessionalDayAndHour(professional, day, hour);
                  const hasBloqueos = dayBloqueos.length > 0;
                  const hasContent = dayAppointments.length > 0 || hasBloqueos;
                  const droppableId = `weekly-slot-${professional.id}-${dayIndex}-${hour}`;
                  
                  return (
                    <DroppableTimeSlot 
                      key={`${day.toISOString()}-${hour}`}
                      id={droppableId}
                      hasBloqueos={hasBloqueos}
                      hasContent={hasContent}
                      colorConfig={colorConfig}
                      onEmptyClick={() => onAddAppointment?.(professional.id, hour, day)}
                      onBlockTime={() => onBlockTime?.(professional.id, hour, day)}
                    >
                      {hasBloqueos && dayBloqueos.map((bloqueo) => (
                        <div
                          key={`bloqueo-${bloqueo.id}`}
                          className="mb-1 h-[44px] w-full p-1.5 rounded bg-destructive/10 border-l-4 border-l-destructive cursor-pointer hover:opacity-80 transition-colors overflow-hidden"
                          onClick={() => onBloqueoClick(bloqueo.id)}
                        >
                          <p className="text-xs font-medium text-destructive truncate">
                            Bloqueado
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {bloqueo.motivo || `${bloqueo.hora_inicio} - ${bloqueo.hora_fin}`}
                          </p>
                        </div>
                      ))}

                      {dayAppointments.map((apt) => {
                        const professionalName = `${professional.nombre} ${professional.apellidos}`.trim();
                        const isBeingRescheduled = rescheduleMode && appointmentToReschedule?.id === apt.id;
                        return (
                          <DraggableCompactAppointment
                            key={apt.id}
                            apt={apt}
                            onAppointmentClick={onAppointmentClick}
                            onClientClick={(clientId) => navigate(`/clientes/${clientId}`)}
                            onAddAppointment={() => onAddAppointment?.(professional.id, hour, day)}
                            onExtendAppointment={(minutes) => onExtendAppointment?.(apt, minutes)}
                            onResizeEnd={handleResizeEnd}
                            onStartReschedule={() => onStartReschedule?.(apt)}
                            allAppointments={appointments}
                            professionalName={professionalName}
                            rescheduleMode={rescheduleMode}
                            isBeingRescheduled={isBeingRescheduled}
                          />
                        );
                      })}
                    </DroppableTimeSlot>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeAppointment && (
            <div className="w-[180px] p-2 rounded border-l-4 border-l-primary bg-background shadow-xl opacity-90">
              <p className="text-xs font-semibold truncate">
                {activeAppointment.clientes?.nombre} {activeAppointment.clientes?.apellidos}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {activeAppointment.servicios?.nombre}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {activeAppointment.hora_inicio?.substring(0, 5)} - {activeAppointment.hora_fin?.substring(0, 5)}
              </p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  }

  // Multiple professionals view: days as columns, professionals as rows (block view)
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div>
        <div className="min-w-[1200px]">
          {/* Header row with days */}
          <div 
            className="grid gap-1 mb-2 sticky top-[var(--agenda-sticky-offset)] z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-2"
            style={{ gridTemplateColumns: `150px repeat(${DAYS}, 1fr)` }}
          >
            <div className="text-sm font-medium text-muted-foreground pt-2">Profesional</div>
            {weekDays.map((day) => (
              <div 
                key={day.toISOString()} 
                className="text-center py-2 px-1 rounded-md bg-muted"
              >
                <div className="text-sm font-semibold capitalize">
                  {format(day, "EEE", { locale: es })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(day, "d MMM", { locale: es })}
                </div>
              </div>
            ))}
          </div>

          {/* Rows per professional */}
          {professionals.map((prof, profIndex) => {
            const colorConfig = getProfessionalColor(profIndex);
            
            return (
              <div key={prof.id} className="mb-3">
                {/* Professional name row */}
                <div 
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `150px repeat(${DAYS}, 1fr)` }}
                >
                  <div className={`py-2 px-2 rounded-l-md text-sm font-semibold truncate ${colorConfig.header} ${colorConfig.text}`}>
                    {prof.nombre} {prof.apellidos}
                  </div>
                  
                  {/* Appointments for each day */}
                  {weekDays.map((day, dayIndex) => {
                    // Get all appointments for this professional on this day
                    const dayAppointments = appointments.filter((apt) => {
                      const aptDate = parseDateOnlyToLocal(apt.fecha);
                      const aptProfessionalName = `${apt.empleados?.nombre || ''} ${apt.empleados?.apellidos || ''}`.trim();
                      const professionalName = `${prof.nombre} ${prof.apellidos}`.trim();
                      return isSameDay(aptDate, day) && aptProfessionalName === professionalName;
                    }).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

                    // Get all bloqueos for this professional on this day
                    const dayBloqueos = bloqueos.filter((bloqueo) => {
                      const bloqueoDate = parseDateOnlyToLocal(bloqueo.fecha);
                      const bloqueoName = bloqueo.empleados 
                        ? `${bloqueo.empleados.nombre} ${bloqueo.empleados.apellidos}`.trim()
                        : null;
                      const professionalName = `${prof.nombre} ${prof.apellidos}`.trim();
                      const matchesProfessional = bloqueoName === null || bloqueoName === professionalName;
                      return isSameDay(bloqueoDate, day) && matchesProfessional;
                    });

                    const hasBloqueos = dayBloqueos.length > 0;
                    const droppableId = `weekly-day-${prof.id}-${dayIndex}`;

                    const hasContent = dayAppointments.length > 0 || dayBloqueos.length > 0;

                    return (
                      <DroppableDayCell
                        key={`${prof.id}-${day.toISOString()}`}
                        id={droppableId}
                        hasBloqueos={hasBloqueos}
                        colorConfig={colorConfig}
                        hasContent={hasContent}
                        onEmptyClick={() => onAddAppointment?.(prof.id, 9, day)}
                        onBlockTime={() => onBlockTime?.(prof.id, 9, day)}
                      >
                        {/* Bloqueos */}
                        {dayBloqueos.map((bloqueo) => (
                          <div
                            key={`bloqueo-${bloqueo.id}`}
                            className="mb-1 p-1.5 rounded bg-destructive/10 border-l-2 border-l-destructive cursor-pointer hover:opacity-80 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onBloqueoClick(bloqueo.id);
                            }}
                          >
                            <p className="text-[10px] font-medium text-destructive truncate">
                              Bloqueado: {bloqueo.hora_inicio.substring(0,5)} - {bloqueo.hora_fin.substring(0,5)}
                            </p>
                            {bloqueo.motivo && (
                              <p className="text-[9px] text-muted-foreground truncate">{bloqueo.motivo}</p>
                            )}
                          </div>
                        ))}

                        {dayAppointments.map((apt) => {
                          const professionalName = `${prof.nombre} ${prof.apellidos}`.trim();
                          const isBeingRescheduled = rescheduleMode && appointmentToReschedule?.id === apt.id;
                          return (
                            <DraggableCompactAppointment
                              key={apt.id}
                              apt={apt}
                              onAppointmentClick={onAppointmentClick}
                              onClientClick={(clientId) => navigate(`/clientes/${clientId}`)}
                              onAddAppointment={() => onAddAppointment?.(prof.id, 9, day)}
                              onExtendAppointment={(minutes) => onExtendAppointment?.(apt, minutes)}
                              onResizeEnd={handleResizeEnd}
                              onStartReschedule={() => onStartReschedule?.(apt)}
                              allAppointments={appointments}
                              professionalName={professionalName}
                              rescheduleMode={rescheduleMode}
                              isBeingRescheduled={isBeingRescheduled}
                            />
                          );
                        })}
                      </DroppableDayCell>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeAppointment && (
          <div className="w-[180px] p-2 rounded border-l-4 border-l-primary bg-background shadow-xl opacity-90">
            <p className="text-xs font-semibold truncate">
              {activeAppointment.clientes?.nombre} {activeAppointment.clientes?.apellidos}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {activeAppointment.servicios?.nombre}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {activeAppointment.hora_inicio?.substring(0, 5)} - {activeAppointment.hora_fin?.substring(0, 5)}
            </p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
