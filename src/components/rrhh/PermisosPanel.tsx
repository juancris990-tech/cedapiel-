import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Check, X, Clock, Loader2 } from "lucide-react";
import PermisoDialog from "./PermisoDialog";

const PermisosPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEstado, setSelectedEstado] = useState<string>("todos");

  const { data: permisos, isLoading } = useQuery({
    queryKey: ["permisos", selectedEstado],
    queryFn: async () => {
      let query = supabase
        .from("permisos")
        .select(`
          *,
          empleados!permisos_id_empleado_fkey(nombre, apellidos, especialidad)
        `)
        .order("created_at", { ascending: false });

      if (selectedEstado !== "todos") {
        query = query.eq("estado", selectedEstado as any);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as any;
    },
  });

  const aprobarMutation = useMutation({
    mutationFn: async (idPermiso: number) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Usuario no autenticado");

      const { error } = await supabase
        .from("permisos")
        .update({
          estado: "Aprobado",
          aprobado_por: null, // TODO: Obtener ID del empleado asociado al usuario
          updated_at: new Date().toISOString(),
        })
        .eq("id", idPermiso);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permisos"] });
      toast({
        title: "Permiso aprobado",
        description: "El permiso ha sido aprobado correctamente",
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

  const rechazarMutation = useMutation({
    mutationFn: async (idPermiso: number) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Usuario no autenticado");

      const { error } = await supabase
        .from("permisos")
        .update({
          estado: "Denegado",
          aprobado_por: null, // TODO: Obtener ID del empleado asociado al usuario
          updated_at: new Date().toISOString(),
        })
        .eq("id", idPermiso);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permisos"] });
      toast({
        title: "Permiso rechazado",
        description: "El permiso ha sido rechazado",
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

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "Aprobado":
        return <Badge variant="default">Aprobado</Badge>;
      case "Denegado":
        return <Badge variant="destructive">Denegado</Badge>;
      case "En proceso":
        return <Badge variant="secondary">En proceso</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const calcularDias = (fechaInicio: string, fechaFin: string) => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diff = fin.getTime() - inicio.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const permisosEnProceso = permisos?.filter((p) => p.estado === "En proceso").length || 0;
  const permisosAprobados = permisos?.filter((p) => p.estado === "Aprobado").length || 0;
  const permisosDenegados = permisos?.filter((p) => p.estado === "Denegado").length || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {permisosEnProceso}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pendientes de revisión
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {permisosAprobados}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Permisos autorizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denegados</CardTitle>
            <X className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {permisosDenegados}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Permisos rechazados
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestión de Permisos</CardTitle>
              <CardDescription>Solicitudes de permisos y ausencias del personal</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="En proceso">En proceso</SelectItem>
                  <SelectItem value="Aprobado">Aprobados</SelectItem>
                  <SelectItem value="Denegado">Denegados</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Permiso
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : permisos && permisos.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Fecha Fin</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permisos.map((permiso) => (
                    <TableRow key={permiso.id}>
                      <TableCell className="font-medium">
                        {(permiso as any).empleados?.nombre} {(permiso as any).empleados?.apellidos}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{permiso.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(permiso.fecha_inicio), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(permiso.fecha_fin), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {calcularDias(permiso.fecha_inicio, permiso.fecha_fin)} días
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {permiso.motivo || "-"}
                      </TableCell>
                      <TableCell>
                        {getEstadoBadge(permiso.estado)}
                      </TableCell>
                      <TableCell>
                        {permiso.estado === "En proceso" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => aprobarMutation.mutate(permiso.id)}
                              disabled={aprobarMutation.isPending || rechazarMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rechazarMutation.mutate(permiso.id)}
                              disabled={aprobarMutation.isPending || rechazarMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
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
              <p>No hay permisos registrados</p>
            </div>
          )}
        </CardContent>
      </Card>

      <PermisoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default PermisosPanel;
