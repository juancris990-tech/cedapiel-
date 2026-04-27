import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Pencil, XCircle, Info } from "lucide-react";
import { ReglaComisionDialog } from "@/components/rrhh/ReglaComisionDialog";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const prioridadLabels: Record<number, string> = {
  1: "Empleado + Servicio",
  2: "Empleado + Categoría",
  3: "Empleado Genérica",
  4: "Genérica por Servicio",
  5: "Genérica por Categoría",
};

const prioridadColors: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-yellow-500",
  4: "bg-blue-500",
  5: "bg-green-500",
};

export default function ReglasComision() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRegla, setSelectedRegla] = useState<any>(null);
  const [filtroEmpleado, setFiltroEmpleado] = useState("ALL");
  const [filtroCategoria, setFiltroCategoria] = useState("ALL");
  const [filtroServicio, setFiltroServicio] = useState("ALL");
  const [filtroActiva, setFiltroActiva] = useState("true");
  const [desactivarDialogOpen, setDesactivarDialogOpen] = useState(false);
  const [reglaADesactivar, setReglaADesactivar] = useState<any>(null);

  const { data: reglas, isLoading, refetch } = useQuery({
    queryKey: ['reglas-comision', filtroEmpleado, filtroCategoria, filtroServicio, filtroActiva],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtroEmpleado && filtroEmpleado !== "ALL") params.append('empleado', filtroEmpleado);
      if (filtroCategoria && filtroCategoria !== "ALL") params.append('categoria', filtroCategoria);
      if (filtroServicio && filtroServicio !== "ALL") params.append('servicio', filtroServicio);
      if (filtroActiva && filtroActiva !== "ALL") params.append('activa', filtroActiva);

      const queryString = params.toString();
      const url = queryString ? `reglas-comision?${queryString}` : 'reglas-comision';
      
      const { data, error } = await supabase.functions.invoke(url, { method: 'GET' });
      if (error) throw error;
      return data;
    },
  });

  const { data: empleados } = useQuery({
    queryKey: ['empleados-activos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellidos')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ['categorias-servicio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categoria_servicio')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: servicios } = useQuery({
    queryKey: ['servicios-activos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicios')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (regla: any) => {
    setSelectedRegla(regla);
    setDialogOpen(true);
  };

  const handleNueva = () => {
    setSelectedRegla(null);
    setDialogOpen(true);
  };

  const handleDesactivar = async () => {
    if (!reglaADesactivar) return;

    try {
      const { error } = await supabase.functions.invoke(
        `reglas-comision/${reglaADesactivar.id}/desactivar`,
        { method: 'PATCH' }
      );

      if (error) throw error;

      toast.success("Regla desactivada correctamente");
      refetch();
    } catch (error: any) {
      console.error('Error desactivando regla:', error);
      toast.error(error.message || "Error al desactivar la regla");
    } finally {
      setDesactivarDialogOpen(false);
      setReglaADesactivar(null);
    }
  };

  const confirmarDesactivar = (regla: any) => {
    setReglaADesactivar(regla);
    setDesactivarDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Reglas de Comisión</h1>
            <p className="text-muted-foreground">
              Administra los porcentajes de comisión por empleado, categoría y servicio
            </p>
          </div>
          <Button onClick={handleNueva}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Regla
          </Button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-card rounded-lg border">
          <div className="space-y-2">
            <label className="text-sm font-medium">Empleado</label>
            <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {empleados?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.nombre} {emp.apellidos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Categoría</label>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {categorias?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Servicio</label>
            <Select value={filtroServicio} onValueChange={setFiltroServicio}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {servicios?.map((serv) => (
                  <SelectItem key={serv.id} value={serv.id.toString()}>
                    {serv.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select value={filtroActiva} onValueChange={setFiltroActiva}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="true">Activas</SelectItem>
                <SelectItem value="false">Inactivas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabla */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>% Comisión</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : reglas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No hay reglas registradas
                  </TableCell>
                </TableRow>
              ) : (
                reglas?.map((regla: any) => (
                  <TableRow key={regla.id}>
                    <TableCell>
                      {regla.empleado
                        ? `${regla.empleado.nombre} ${regla.empleado.apellidos || ''}`
                        : <span className="text-muted-foreground">Genérica</span>}
                    </TableCell>
                    <TableCell>
                      {regla.categoria?.nombre || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {regla.servicio?.nombre || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="font-semibold">{regla.porcentaje}%</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{regla.fecha_inicio}</div>
                        <div className="text-muted-foreground">
                          → {regla.fecha_fin || 'Sin fin'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={regla.activo ? "default" : "secondary"}>
                        {regla.activo ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge className={prioridadColors[regla.prioridad]}>
                              {regla.prioridad}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{prioridadLabels[regla.prioridad]}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(regla)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {regla.activo && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => confirmarDesactivar(regla)}
                          >
                            <XCircle className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Leyenda de prioridades */}
        <div className="p-4 bg-card rounded-lg border space-y-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span className="font-medium">Prioridades (más específica gana):</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
            {Object.entries(prioridadLabels).map(([prioridad, label]) => (
              <div key={prioridad} className="flex items-center gap-2">
                <Badge className={prioridadColors[parseInt(prioridad)]}>{prioridad}</Badge>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ReglaComisionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refetch}
        regla={selectedRegla}
      />

      <AlertDialog open={desactivarDialogOpen} onOpenChange={setDesactivarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar regla de comisión?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la regla pero se mantendrá el historial. Puedes reactivarla editándola.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDesactivar}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
