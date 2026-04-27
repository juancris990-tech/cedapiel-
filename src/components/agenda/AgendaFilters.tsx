import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AgendaFiltersProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedSucursal: string;
  onSucursalChange: (value: string) => void;
  selectedEmpleado: string;
  onEmpleadoChange: (value: string) => void;
  selectedEstado: string;
  onEstadoChange: (value: string) => void;
  selectedServicio: string;
  onServicioChange: (value: string) => void;
  sucursales: Array<{ id: number; nombre: string }>;
  empleados: Array<{ id: number; nombre: string; apellidos: string }>;
  servicios: Array<{ id: number; nombre: string }>;
  viewRange: "day" | "week";
  onViewRangeChange: (range: "day" | "week") => void;
}

const estados = [
  { value: "all", label: "Todos los estados" },
  { value: "agendada", label: "Agendada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "en_atencion", label: "En Atención" },
  { value: "finalizada", label: "Finalizada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "no_asiste", label: "No Asiste" },
];

export function AgendaFilters({
  selectedDate,
  onDateChange,
  selectedSucursal,
  onSucursalChange,
  selectedEmpleado,
  onEmpleadoChange,
  selectedEstado,
  onEstadoChange,
  selectedServicio,
  onServicioChange,
  sucursales,
  empleados,
  servicios,
  viewRange,
  onViewRangeChange,
}: AgendaFiltersProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  const handlePrevious = () => {
    if (viewRange === "day") {
      onDateChange(subDays(selectedDate, 1));
    } else {
      onDateChange(subWeeks(selectedDate, 1));
    }
  };

  const handleNext = () => {
    if (viewRange === "day") {
      onDateChange(addDays(selectedDate, 1));
    } else {
      onDateChange(addWeeks(selectedDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
    onViewRangeChange("day");
  };

  const getDateDisplayText = () => {
    if (viewRange === "day") {
      return format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es });
    }
    return `${format(weekStart, "d MMM", { locale: es })} - ${format(weekEnd, "d MMM yyyy", { locale: es })}`;
  };

  return (
    <div className="space-y-4 mb-6">
      {/* View range toggle and date navigation */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View range buttons */}
        <div className="flex rounded-md border border-input overflow-hidden">
          <Button 
            variant="ghost" 
            size="sm"
            className={cn(
              "rounded-none border-0",
              viewRange === "day" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            )}
            onClick={() => onViewRangeChange("day")}
          >
            Día
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className={cn(
              "rounded-none border-0 border-l border-input",
              viewRange === "week" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            )}
            onClick={() => onViewRangeChange("week")}
          >
            Semana
          </Button>
        </div>

        {/* Navigation */}
        <Button variant="outline" size="icon" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[200px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span className="capitalize">{getDateDisplayText()}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onDateChange(date)}
              locale={es}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button 
          variant={isToday(selectedDate) && viewRange === "day" ? "default" : "outline"}
          onClick={handleToday}
        >
          Hoy
        </Button>
      </div>

      {/* Filters grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Sucursal</Label>
          <Select value={selectedSucursal} onValueChange={onSucursalChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las sucursales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {sucursales.map((suc) => (
                <SelectItem key={suc.id} value={suc.id.toString()}>
                  {suc.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Empleado/Profesional</Label>
          <Select value={selectedEmpleado} onValueChange={onEmpleadoChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los empleados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los empleados</SelectItem>
              {empleados.map((emp) => (
                <SelectItem key={emp.id} value={emp.id.toString()}>
                  {emp.nombre} {emp.apellidos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Estado</Label>
          <Select value={selectedEstado} onValueChange={onEstadoChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              {estados.map((est) => (
                <SelectItem key={est.value} value={est.value}>
                  {est.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Servicio</Label>
          <Select value={selectedServicio} onValueChange={onServicioChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los servicios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los servicios</SelectItem>
              {servicios.map((serv) => (
                <SelectItem key={serv.id} value={serv.id.toString()}>
                  {serv.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
