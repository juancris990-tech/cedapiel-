import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, ChevronsUpDown, CalendarClock } from "lucide-react";
import { format, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { parseDateOnlyToLocal } from "@/lib/date";
import { StatusBadgeSelector } from "./StatusBadgeSelector";
import { useNavigate } from "react-router-dom";
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
import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
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

interface DailyCalendarProps {
  appointments: Appointment[];
  bloqueos: Bloqueo[];
  selectedDate: Date;
  professionals: Professional[];
  rescheduleMode?: boolean;
  appointmentToReschedule?: RescheduleAppointment | null;
  onAppointmentClick: (appointmentId: number | string) => void;
  onBloqueoClick: (bloqueoId: number) => void;
  onAddAppointment?: (professionalId: number, hour: number, minute?: number) => void;
  onBlockTime?: (professionalId: number, hour: number, minute?: number) => void;
  onExtendAppointment?: (appointment: Appointment, minutes: number) => void;
  onStartReschedule?: (appointment: Appointment) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

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

const getEstadoColor = (estado: string) => {
  const colors: Record<string, string> = {
    agendada: "bg-slate-400",
    confirmada: "bg-sky-400",
    en_atencion: "bg-amber-300",
    finalizada: "bg-emerald-400",
    cancelada: "bg-rose-400",
    no_asiste: "bg-orange-300",
  };
  return colors[estado] || "bg-slate-400";
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

// Resizable Appointment Card with drag-to-resize functionality
function ResizableAppointment({ 
  apt, 
  onAppointmentClick, 
  onGoToPOS,
  onAddAppointment,
  onExtendAppointment,
  onClientClick,
  onResizeEnd,
  onStartReschedule,
  allAppointments,
  professionalName,
  rescheduleMode,
  isBeingRescheduled
}: { 
  apt: Appointment;
  onAppointmentClick: (id: number | string) => void;
  onGoToPOS: (e: React.MouseEvent, apt: Appointment) => void;
  onAddAppointment?: () => void;
  onExtendAppointment?: (minutes: number) => void;
  onClientClick?: (clientId: number) => void;
  onResizeEnd?: (apt: Appointment, newHoraFin: string) => void;
  onStartReschedule?: () => void;
  allAppointments: Appointment[];
  professionalName: string;
  rescheduleMode?: boolean;
  isBeingRescheduled?: boolean;
}) {
  const [dragEnabled, setDragEnabled] = useState(false);
  const dragWasActiveRef = useRef(false);

  // Dropdown (single click) vs drag (double click)
  const [menuOpen, setMenuOpen] = useState(false);
  const clickTimeoutRef = useRef<number | null>(null);
  const suppressMenuOpenRef = useRef(false);
  const lastPointerDownAtRef = useRef(0);
  const activatedFromPointerDownRef = useRef(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `apt-${apt.id}`,
    data: { appointment: apt },
    disabled: apt._source === 'citas_agendadas' || !dragEnabled,
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

  // Cleanup click timeout
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) window.clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  const activateDragMode = (e?: { stopPropagation?: () => void; preventDefault?: () => void }) => {
    if (apt._source === 'citas_agendadas' || rescheduleMode) return;

    e?.stopPropagation?.();
    e?.preventDefault?.();

    if (clickTimeoutRef.current) window.clearTimeout(clickTimeoutRef.current);
    setMenuOpen(false);

    setDragEnabled(true);
    toast.info("Modo arrastre activado", {
      description: "Arrastra la cita a su nueva ubicación",
      duration: 2000,
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (dragEnabled || rescheduleMode) return;
    if (apt._source === 'citas_agendadas') return;

    const now = Date.now();
    const isDouble = now - lastPointerDownAtRef.current <= 450;
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

  const handleCardClick = (e: React.MouseEvent) => {
    if (dragEnabled || rescheduleMode) return;

    if (suppressMenuOpenRef.current) {
      suppressMenuOpenRef.current = false;
      return;
    }

    // si es el 2do click (doble click), no abrimos el menú
    if ((e as any).detail && (e as any).detail > 1) return;

    // Espera ventana de doble-click antes de abrir
    if (clickTimeoutRef.current) window.clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = window.setTimeout(() => {
      setMenuOpen(true);
    }, 450);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Si ya activamos desde pointerdown (más confiable), evitamos doble toast
    if (activatedFromPointerDownRef.current) {
      activatedFromPointerDownRef.current = false;
      return;
    }

    activateDragMode(e);
  };

  const [isResizing, setIsResizing] = useState(false);
  const [resizePreview, setResizePreview] = useState<{ horaFin: string; duration: number } | null>(null);

  const resizeStartY = useRef<number>(0);
  const originalEndMinutesRef = useRef<number>(0);
  const liveEndMinutesRef = useRef<number | null>(null);

  const horaInicio = apt.hora_inicio?.substring(0, 5) || "";
  const horaFin = apt.hora_fin?.substring(0, 5) || "";
  const precio = apt.servicios?.precio ? `$${apt.servicios.precio}` : "";
  const employeeDisplayName = `${apt.empleados?.nombre || ""} ${apt.empleados?.apellidos || ""}`.trim() || professionalName;

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

      // Solo nos limita la siguiente cita (la que empieza después de nuestra hora inicio)
      if (otherStart > startMinutes) {
        maxEnd = Math.min(maxEnd, otherStart);
      }
    }

    return maxEnd;
  }, [allAppointments, apt.id, apt.fecha, isSameProfessional, parseTimeToMinutes, startMinutes]);

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  const handleResizeStart = (e: React.PointerEvent) => {
    if (apt._source === "citas_agendadas") return;
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

    const MIN_END_MINUTES = startMinutes + 15; // mínimo 15 min
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

  // When dragging, show a placeholder with fixed height
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

  const borderColor = getEstadoBorderColor(apt.estado);
  const bgColor = getEstadoBgColor(apt.estado);
  
  const displayHoraFin = resizePreview?.horaFin ?? horaFin;
  const displayDuration = resizePreview?.duration ?? currentDuration;

  // Highlight if this is the appointment being rescheduled
  const highlightClass = isBeingRescheduled 
    ? 'ring-2 ring-primary ring-offset-2 animate-pulse' 
    : '';

  return (
    <TooltipProvider>
      <div className="relative">
        <DropdownMenu
          open={menuOpen}
          onOpenChange={(next) => {
            // No permitimos que Radix abra el menú en el primer click (para soportar doble-click)
            // Solo aceptamos cierres automáticos.
            if (!next) setMenuOpen(false);
          }}
        >
          <DropdownMenuTrigger asChild disabled={rescheduleMode || dragEnabled}>
              <div
                ref={setNodeRef}
                data-apt-id={apt.id}
                {...(dragEnabled ? { ...attributes, ...listeners } : {})}
                onPointerDown={handleAppointmentPointerDown}
                onClick={handleCardClick}
                onDoubleClick={handleDoubleClick}
                className={`relative mb-1 w-full p-1.5 rounded border-l-4 cursor-pointer hover:opacity-80 transition-colors group overflow-visible ${borderColor} ${bgColor} ${isResizing ? 'ring-2 ring-primary z-30' : ''} ${highlightClass} ${dragEnabled ? 'ring-2 ring-primary cursor-grab active:cursor-grabbing' : ''}`}
                style={{ minHeight: '44px', maxWidth: '100%' }}
              >
              <div className="flex items-center justify-between gap-1">
                <p 
                  className="text-xs font-semibold text-foreground truncate flex-1 hover:text-primary hover:underline cursor-pointer"
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
              {apt._source !== 'citas_agendadas' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      onPointerDown={handleResizeStart}
                      className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-muted/50 to-transparent rounded-b"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ChevronsUpDown className="h-3 w-3 text-muted-foreground rotate-0" />
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
            <DropdownMenuItem onClick={onAddAppointment}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar cita
            </DropdownMenuItem>
            {apt._source !== 'citas_agendadas' && (
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
            {apt._source !== 'citas_agendadas' && onStartReschedule && (
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

        {apt._source !== 'citas_agendadas' && (
          <div className="absolute right-1 top-1 z-40">
            <StatusBadgeSelector
              appointmentId={apt.id}
              currentState={apt.estado as 'agendada' | 'confirmada' | 'en_atencion' | 'finalizada' | 'cancelada' | 'no_asiste'}
              horaInicio={apt.hora_inicio}
              fecha={apt.fecha}
              idEmpleado={apt.id_empleado}
              isImported={apt._source === 'citas_agendadas'}
              size="sm"
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Droppable sub-interval option (15-minute) used as both click target and drop target
function DroppableIntervalOption({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: (args: {
    setNodeRef: (node: HTMLElement | null) => void;
    isOver: boolean;
  }) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  return <>{children({ setNodeRef, isOver })}</>;
}

// Sub-interval selector for 15-minute slots
function TimeSubIntervals({
  professionalId,
  hour,
  onSelectInterval,
  appointments,
  bloqueos,
}: {
  professionalId: number;
  hour: number;
  onSelectInterval: (minute: number) => void;
  appointments: Appointment[];
  bloqueos: Bloqueo[];
}) {
  const intervals = [0, 15, 30, 45];

  const isIntervalOccupied = (minute: number) => {
    const slotTime = `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;

    // Check if any appointment overlaps with this interval
    const hasAppointment = appointments.some((apt) => {
      const aptStart = apt.hora_inicio.substring(0, 5);
      const aptEnd = apt.hora_fin.substring(0, 5);
      return slotTime >= aptStart && slotTime < aptEnd;
    });

    // Check if any bloqueo overlaps with this interval
    const hasBloqueo = bloqueos.some((bloqueo) => {
      const bloqStart = bloqueo.hora_inicio.substring(0, 5);
      const bloqEnd = bloqueo.hora_fin.substring(0, 5);
      return slotTime >= bloqStart && slotTime < bloqEnd;
    });

    return hasAppointment || hasBloqueo;
  };

  return (
    <div className="absolute inset-0 bg-background z-30 flex flex-col p-1 rounded-md border-2 border-primary shadow-xl min-h-[100px]">
      {intervals.map((minute) => {
        const nextMinute = minute + 15;
        const endTime =
          nextMinute === 60
            ? `${(hour + 1).toString().padStart(2, "0")}:00`
            : `${hour.toString().padStart(2, "0")}:${nextMinute
                .toString()
                .padStart(2, "0")}`;
        const startTime = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        const isOccupied = isIntervalOccupied(minute);

        // Droppable id: "slot-{profId}-{hour}-{minute}"
        const intervalDropId = `slot-${professionalId}-${hour}-${minute}`;

        return (
          <DroppableIntervalOption
            key={minute}
            id={intervalDropId}
            disabled={isOccupied}
          >
            {({ setNodeRef, isOver }) => (
              <button
                ref={setNodeRef}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isOccupied) {
                    onSelectInterval(minute);
                  }
                }}
                disabled={isOccupied}
                className={`flex-1 min-h-[22px] text-xs font-semibold rounded-md px-2 py-1.5 text-center transition-all border ${
                  isOccupied
                    ? "bg-muted/60 text-muted-foreground cursor-not-allowed line-through border-transparent"
                    : isOver
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/50 border-primary shadow-md scale-[1.02]"
                      : "bg-primary/10 hover:bg-primary/20 text-foreground cursor-pointer border-primary/30 hover:border-primary"
                }`}
              >
                {startTime} – {endTime}
              </button>
            )}
          </DroppableIntervalOption>
        );
      })}
    </div>
  );
}

// Droppable Time Slot - Clean style matching weekly view
function DroppableSlot({
  id,
  professionalId,
  hour,
  isDraggingAppointment,
  children,
  hasBloqueos,
  colorConfig,
  onSelectInterval,
  onBlockTime,
  appointments,
  bloqueos,
}: {
  id: string;
  professionalId: number;
  hour: number;
  isDraggingAppointment: boolean;
  children: React.ReactNode;
  hasBloqueos: boolean;
  colorConfig: { bg: string; border: string };
  onSelectInterval?: (minute: number) => void;
  onBlockTime?: (minute: number) => void;
  appointments: Appointment[];
  bloqueos: Bloqueo[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [showIntervals, setShowIntervals] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  // Check if there are any appointments in this slot
  const hasAppointments = appointments.length > 0;
  const isEmpty = !hasAppointments && !hasBloqueos;
  const canShowIntervals = isEmpty && !hasBloqueos && !!onSelectInterval;

  // While dragging, make it easier to "land" on a 15-min option: open the selector
  // automatically when the dragged item enters this empty slot.
  useEffect(() => {
    if (!isDraggingAppointment) {
      setShowIntervals(false);
      return;
    }

    if (isOver && canShowIntervals) {
      setShowIntervals(true);
    }
  }, [isDraggingAppointment, isOver, canShowIntervals]);

  const handleMouseEnter = () => {
    if (isDraggingAppointment && canShowIntervals) {
      setShowIntervals(true);
    }
  };

  const handleMouseLeave = () => {
    setShowIntervals(false);
  };

  const handleIntervalSelect = (minute: number) => {
    onSelectInterval?.(minute);
    setShowIntervals(false);
    setShowQuickMenu(false);
  };

  const handleSlotClick = (e: React.MouseEvent) => {
    if (!canShowIntervals) return;
    const target = e.target as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;

    if (target === currentTarget || target.closest('[data-empty-overlay]')) {
      e.stopPropagation();
      setShowQuickMenu((prev) => !prev);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleSlotClick}
      className={`relative min-h-[110px] border border-border rounded-md p-1 transition-colors border-l-4 ${colorConfig.border} ${
        hasBloqueos
          ? "bg-muted/40 cursor-not-allowed"
          : isOver
            ? "bg-primary/10 border-primary/50"
            : "bg-background hover:bg-muted/30"
      }`}
    >
      {/* Empty state with plus icon */}
      {isEmpty && !showIntervals && !showQuickMenu && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Plus className="h-4 w-4 text-muted-foreground/30" />
        </div>
      )}

      <div className="relative z-10 w-full">{children}</div>

      {/* Show sub-intervals on hover only when the slot is empty */}
      {showIntervals && canShowIntervals && (
        <div className="absolute inset-0 z-30">
          <TimeSubIntervals
            professionalId={professionalId}
            hour={hour}
            onSelectInterval={handleIntervalSelect}
            appointments={appointments}
            bloqueos={bloqueos}
          />
        </div>
      )}

      {showQuickMenu && canShowIntervals && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-[1px] rounded-md">
          <div className="w-[170px] rounded-md border bg-popover p-2 shadow-lg space-y-1">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start h-8"
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickMenu(false);
                onSelectInterval?.(0);
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
                onBlockTime?.(0);
              }}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Bloquear tiempo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DailyCalendar({
  appointments,
  bloqueos,
  selectedDate,
  professionals,
  rescheduleMode,
  appointmentToReschedule,
  onAppointmentClick,
  onBloqueoClick,
  onAddAppointment,
  onBlockTime,
  onExtendAppointment,
  onStartReschedule,
}: DailyCalendarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getAppointmentsForProfessionalAndHour = (professional: Professional, hour: number) => {
    return appointments.filter((apt) => {
      // Parse date without timezone issues - use date string directly
      const [year, month, day] = apt.fecha.split('-').map(Number);
      const aptDate = new Date(year, month - 1, day, 12, 0, 0); // Use noon to avoid timezone issues
      const aptHour = parseInt(apt.hora_inicio.split(":")[0]);
      const aptProfessionalName = `${apt.empleados?.nombre || ""} ${apt.empleados?.apellidos || ""}`.trim();
      const professionalName = `${professional.nombre} ${professional.apellidos}`.trim();
      return isSameDay(aptDate, selectedDate) && aptHour === hour && aptProfessionalName === professionalName;
    });
  };

  const getBloqueosForProfessionalAndHour = (professional: Professional, hour: number) => {
    return bloqueos.filter((bloqueo) => {
      const bloqueoDate = parseDateOnlyToLocal(bloqueo.fecha);
      const horaInicio = parseInt(bloqueo.hora_inicio.split(":")[0]);
      const horaFin = parseInt(bloqueo.hora_fin.split(":")[0]);
      const bloqueoName = bloqueo.empleados
        ? `${bloqueo.empleados.nombre} ${bloqueo.empleados.apellidos}`.trim()
        : null;
      const professionalName = `${professional.nombre} ${professional.apellidos}`.trim();
      const matchesProfessional = bloqueoName === null || bloqueoName === professionalName;
      return isSameDay(bloqueoDate, selectedDate) && hour >= horaInicio && hour < horaFin && matchesProfessional;
    });
  };

  const handleGoToPOS = (e: React.MouseEvent, apt: Appointment) => {
    e.stopPropagation();
    if (apt._source === "citas_agendadas" || !apt.clientes || !apt.servicios) return;

    navigate("/pos", {
      state: {
        citaId: apt.id,
        clienteId: apt.id_cliente,
        sucursalId: apt.id_sucursal,
        servicioId: apt.id_servicio,
        empleadoId: apt.id_empleado,
        precioServicio: apt.servicios?.precio || 0,
        nombreCliente: `${apt.clientes?.nombre || ""} ${apt.clientes?.apellidos || ""}`,
        nombreEmpleado: `${apt.empleados?.nombre || ""} ${apt.empleados?.apellidos || ""}`,
        nombreServicio: apt.servicios?.nombre || "",
        nombreSucursal: apt.sucursales?.nombre || "",
      },
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const apt = active.data.current?.appointment as Appointment;
    setActiveAppointment(apt);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAppointment(null);

    if (!over) return;

    const apt = active.data.current?.appointment as Appointment;
    if (!apt || apt._source === "citas_agendadas") return;

    // Parse drop target: format is "slot-{profId}-{hour}" OR "slot-{profId}-{hour}-{minute}"
    const parts = over.id.toString().split("-");
    if (parts[0] !== "slot") return;

    const newProfId = parseInt(parts[1] || "", 10);
    const newHour = parseInt(parts[2] || "", 10);
    const newMinute = parts.length >= 4 ? parseInt(parts[3] || "", 10) : null;

    if (Number.isNaN(newProfId) || Number.isNaN(newHour)) return;

    const newProfessional = professionals.find((p) => p.id === newProfId);
    if (!newProfessional) return;

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

    // If user drops onto a 15-min option (e.g. 09:15–09:30), respect that option (start minute + 15 min duration)
    const useIntervalDuration = newMinute != null && !Number.isNaN(newMinute);

    const preservedMinute = currentStartMinutes % 60;
    const newStartMinutes = newHour * 60 + (useIntervalDuration ? newMinute! : preservedMinute);
    const newEndMinutes = newStartMinutes + (useIntervalDuration ? 15 : currentDuration);

    const newHoraInicio = formatMinutesToTime(newStartMinutes);
    const newHoraFin = formatMinutesToTime(newEndMinutes);

    // Find the actual empleado ID from the database
    const { data: empleadoData } = await supabase
      .from("empleados")
      .select("id")
      .ilike("nombre", newProfessional.nombre)
      .ilike("apellidos", newProfessional.apellidos)
      .single();

    const newEmpleadoId = empleadoData?.id;

    // Check if anything changed (include minutes)
    const currentProfName = `${apt.empleados?.nombre || ""} ${apt.empleados?.apellidos || ""}`.trim();
    const newProfName = `${newProfessional.nombre} ${newProfessional.apellidos}`.trim();

    if (currentStartMinutes === newStartMinutes && currentProfName === newProfName) {
      return; // No change
    }

    try {
      // Only update if it's a real agenda (not imported)
      const aptId = typeof apt.id === "number" ? apt.id : parseInt(String(apt.id).replace("ca-", ""));

      const { error } = await supabase
        .from("agendas")
        .update({
          hora_inicio: newHoraInicio,
          hora_fin: newHoraFin,
          id_empleado: newEmpleadoId || apt.id_empleado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", aptId);

      if (error) throw error;

      toast.success("Cita actualizada", {
        description: `Movida a ${newHoraInicio.substring(0, 5)} con ${newProfessional.nombre}`,
      });

      // Refresh appointments
      queryClient.invalidateQueries({ queryKey: ["appointments-range"] });
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("Error al mover la cita");
    }
  };

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

  const numProfessionals = professionals.length;
  const WORK_START_HOUR = 8;
  const SLOT_ROW_HEIGHT_PX = 114;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const workStartMinutes = WORK_START_HOUR * 60;
  const isTodayView = isToday(selectedDate);
  const showCurrentTimeLine = isTodayView && nowMinutes >= workStartMinutes && nowMinutes <= 21 * 60;
  const currentLineTop = ((nowMinutes - workStartMinutes) / 60) * SLOT_ROW_HEIGHT_PX;

  if (professionals.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No hay profesionales con citas para este día
      </div>
    );
  }

  // Custom collision detection: prefer 15-min interval droppables over the main slot
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    // First check pointerWithin (more precise for nested droppables)
    const pointerCollisions = pointerWithin(args);
    
    if (pointerCollisions.length > 0) {
      // Prefer droppables with 4 parts (slot-{prof}-{hour}-{minute}) over 3 parts (slot-{prof}-{hour})
      const sorted = [...pointerCollisions].sort((a, b) => {
        const aParts = String(a.id).split('-').length;
        const bParts = String(b.id).split('-').length;
        return bParts - aParts; // More parts = more specific = higher priority
      });
      return sorted;
    }
    
    // Fallback to closestCenter
    return closestCenter(args);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header with date and professionals */}
          <div className="text-center mb-4">
            <div className="text-lg font-semibold capitalize">
              {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {rescheduleMode 
                ? "Selecciona un bloque disponible para reagendar la cita"
                : "Arrastra las citas para cambiar horario o profesional"
              }
            </p>
          </div>
          
          <div 
            className="grid gap-2 mb-2 sticky top-0 bg-background z-10 pb-2"
            style={{ gridTemplateColumns: `80px repeat(${numProfessionals}, 1fr)` }}
          >
            <div className="text-sm font-medium text-muted-foreground">Hora</div>
            {professionals.map((prof, index) => {
              const colorConfig = getProfessionalColor(index);
              return (
                <div key={prof.id} className={`text-center py-2 px-1 rounded-t-md ${colorConfig.header} ${colorConfig.text}`}>
                  <div className="text-sm font-semibold">
                    {prof.nombre} {prof.apellidos}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time slots grid */}
          <div className="relative">
            {showCurrentTimeLine && (
              <div
                className="absolute left-[80px] right-0 z-20 pointer-events-none"
                style={{ top: `${currentLineTop}px` }}
              >
                <div className="relative h-0">
                  <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                  <div className="h-[2px] bg-red-500 w-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                </div>
              </div>
            )}

            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid gap-1 mb-1"
                style={{ gridTemplateColumns: `80px repeat(${numProfessionals}, 1fr)` }}
              >
                <div className="text-sm text-muted-foreground font-medium pt-2">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                {professionals.map((prof, profIndex) => {
                  const profAppointments = getAppointmentsForProfessionalAndHour(prof, hour);
                  const profBloqueos = getBloqueosForProfessionalAndHour(prof, hour);
                  const hasBloqueos = profBloqueos.length > 0;
                  const slotId = `slot-${prof.id}-${hour}`;
                  const colorConfig = getProfessionalColor(profIndex);

                  return (
                    <DroppableSlot
                      key={slotId}
                      id={slotId}
                      professionalId={prof.id}
                      hour={hour}
                      isDraggingAppointment={!!activeAppointment}
                      hasBloqueos={hasBloqueos}
                      colorConfig={colorConfig}
                      onSelectInterval={(minute) => onAddAppointment?.(prof.id, hour, minute)}
                      onBlockTime={(minute) => onBlockTime?.(prof.id, hour, minute)}
                      appointments={profAppointments}
                      bloqueos={profBloqueos}
                    >
                      {hasBloqueos && profBloqueos.map((bloqueo) => (
                        <div
                          key={`bloqueo-${bloqueo.id}`}
                          className="mb-1 p-1.5 rounded bg-destructive/10 border-l-4 border-l-destructive cursor-pointer hover:opacity-80 transition-colors"
                          onClick={() => onBloqueoClick(bloqueo.id)}
                        >
                          <p className="text-xs font-medium text-destructive truncate">
                            Bloqueado
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {bloqueo.motivo || `${bloqueo.hora_inicio.substring(0,5)} - ${bloqueo.hora_fin.substring(0,5)}`}
                          </p>
                        </div>
                      ))}

                      {profAppointments.map((apt) => {
                        const professionalName = `${prof.nombre} ${prof.apellidos}`.trim();
                        return (
                          <ResizableAppointment
                            key={apt.id}
                            apt={apt}
                            onAppointmentClick={onAppointmentClick}
                            onGoToPOS={handleGoToPOS}
                            onAddAppointment={() => onAddAppointment?.(prof.id, hour, 0)}
                            onExtendAppointment={(minutes) => onExtendAppointment?.(apt, minutes)}
                            onClientClick={(clientId) => navigate(`/clientes/${clientId}`)}
                            onResizeEnd={handleResizeEnd}
                            onStartReschedule={() => onStartReschedule?.(apt)}
                            allAppointments={appointments}
                            professionalName={professionalName}
                            rescheduleMode={rescheduleMode}
                            isBeingRescheduled={appointmentToReschedule?.id === apt.id}
                          />
                        );
                      })}
                    </DroppableSlot>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drag overlay for visual feedback */}
      <DragOverlay dropAnimation={null}>
        {activeAppointment && (
          <div className={`w-[180px] h-[44px] p-1.5 rounded border-l-4 shadow-lg ring-2 ring-primary overflow-hidden ${getEstadoBorderColor(activeAppointment.estado)} ${getEstadoBgColor(activeAppointment.estado)}`}>
            <p className="text-xs font-semibold text-foreground truncate">
              {activeAppointment.clientes?.nombre} {activeAppointment.clientes?.apellidos}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {activeAppointment.servicios?.nombre}, {activeAppointment.hora_inicio?.substring(0, 5)}
            </p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
