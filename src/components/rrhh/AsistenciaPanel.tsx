import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const AsistenciaPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmpleado, setSelectedEmpleado] = useState<string>("todos");

  const { data: empleados } = useQuery({
    queryKey: ["empleados-activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleados")
        .select("id, nombre, apellidos")
        .eq("activo", true)
        .order("nombre");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: asistencias, isLoading } = useQuery({
    queryKey: ["asistencias", selectedDate, selectedEmpleado],
    queryFn: async () => {
      let query = supabase
        .from("asistencias")
        .select(`
          *,
          empleados(nombre, apellidos, especialidad)
        `)
        .eq("fecha", format(selectedDate, "yyyy-MM-dd"))
        .order("hora_checkin", { ascending: false });

      if (selectedEmpleado !== "todos") {
        query = query.eq("id_empleado", parseInt(selectedEmpleado));
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async (idEmpleado: number) => {
      const now = new Date();
      const { data: session } = await supabase.auth.getSession();
      
      // Verificar si ya tiene check-in hoy
      const { data: existing } = await supabase
        .from("asistencias")
        .select("id")
        .eq("id_empleado", idEmpleado)
        .eq("fecha", format(now, "yyyy-MM-dd"))
        .single();

      if (existing) {
        throw new Error("El empleado ya tiene check-in registrado hoy");
      }

      const { error } = await supabase
        .from("asistencias")
        .insert({
          id_empleado: idEmpleado,
          fecha: format(now, "yyyy-MM-dd"),
          hora_checkin: format(now, "HH:mm:ss"),
          id_sucursal: 1, // TODO: Obtener de contexto
          tipo_turno: "regular",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asistencias"] });
      toast({
        title: "Check-in registrado",
        description: "La entrada se ha registrado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (idAsistencia: number) => {
      const now = new Date();
      const { error } = await supabase
        .from("asistencias")
        .update({
          hora_checkout: format(now, "HH:mm:ss"),
          updated_at: now.toISOString(),
        })
        .eq("id", idAsistencia);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asistencias"] });
      toast({
        title: "Check-out registrado",
        description: "La salida se ha registrado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTime = (time: string | null) => {
    if (!time) return "-";
    return time.substring(0, 5);
  };

  const calcularHoras = (checkin: string | null, checkout: string | null) => {
    if (!checkin || !checkout) return "-";
    
    const [h1, m1] = checkin.split(":").map(Number);
    const [h2, m2] = checkout.split(":").map(Number);
    
    const minutes1 = h1 * 60 + m1;
    const minutes2 = h2 * 60 + m2;
    const diff = minutes2 - minutes1;
    
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    
    return `${hours}h ${mins}m`;
  };

  const empleadosSinCheckin = empleados?.filter((emp) => 
    !asistencias?.some((a) => a.id_empleado === emp.id)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-ins Hoy</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {asistencias?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Asistencias registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-outs Hoy</CardTitle>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">
              {asistencias?.filter((a) => a.hora_checkout).length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Salidas registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {asistencias?.filter((a) => !a.hora_checkout).length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sin check-out
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Selecciona la fecha y empleado</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select value={selectedEmpleado} onValueChange={setSelectedEmpleado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {empleados?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.nombre} {emp.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {empleadosSinCheckin && empleadosSinCheckin.length > 0 && 
       format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && (
        <Card>
          <CardHeader>
            <CardTitle>Empleados sin Check-in</CardTitle>
            <CardDescription>Registra la entrada de empleados que aún no han marcado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {empleadosSinCheckin.map((emp) => (
                <Button
                  key={emp.id}
                  variant="outline"
                  size="sm"
                  onClick={() => checkinMutation.mutate(emp.id)}
                  disabled={checkinMutation.isPending}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {emp.nombre} {emp.apellidos}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Asistencias del Día</CardTitle>
          <CardDescription>
            Registro de entradas y salidas - {format(selectedDate, "PPP", { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : asistencias && asistencias.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Especialidad</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asistencias.map((asistencia) => (
                    <TableRow key={asistencia.id}>
                      <TableCell className="font-medium">
                        {asistencia.empleados?.nombre} {asistencia.empleados?.apellidos}
                      </TableCell>
                      <TableCell>
                        {asistencia.empleados?.especialidad || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatTime(asistencia.hora_checkin)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatTime(asistencia.hora_checkout)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {calcularHoras(asistencia.hora_checkin, asistencia.hora_checkout)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{asistencia.tipo_turno || "Regular"}</Badge>
                      </TableCell>
                      <TableCell>
                        {!asistencia.hora_checkout && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => checkoutMutation.mutate(asistencia.id)}
                            disabled={checkoutMutation.isPending}
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Check-out
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay asistencias registradas para esta fecha</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AsistenciaPanel;
