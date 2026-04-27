import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function CalculoComisiones() {
  const [fechaDesde, setFechaDesde] = useState(
    format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd')
  );
  const [fechaHasta, setFechaHasta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filtroEmpleado, setFiltroEmpleado] = useState("ALL");

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

  // Consultar comisiones registradas en la tabla
  const { data: comisionesRegistradas, isLoading: loadingRegistradas, refetch: refetchRegistradas } = useQuery({
    queryKey: ['comisiones-registradas', fechaDesde, fechaHasta, filtroEmpleado],
    queryFn: async () => {
      let query = supabase
        .from('comisiones')
        .select(`
          *,
          empleado:empleados!comisiones_id_empleado_fkey(id, nombre, apellidos),
          sucursal:sucursales(id, nombre)
        `)
        .gte('periodo_inicio', fechaDesde)
        .lte('periodo_inicio', fechaHasta)
        .order('periodo_inicio', { ascending: false });

      if (filtroEmpleado && filtroEmpleado !== "ALL") {
        query = query.eq('id_empleado', parseInt(filtroEmpleado));
      }

      const { data, error} = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!fechaDesde && !!fechaHasta,
  });

  // Totales de comisiones registradas
  const totalComisionesRegistradas = comisionesRegistradas?.reduce((sum: number, c: any) => sum + Number(c.monto_comision || 0), 0) || 0;
  const totalBaseRegistradas = comisionesRegistradas?.reduce((sum: number, c: any) => sum + Number(c.monto_base || 0), 0) || 0;
  const porcentajePromedioRegistradas = totalBaseRegistradas > 0 ? (totalComisionesRegistradas / totalBaseRegistradas * 100) : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Comisiones</h1>
            <p className="text-muted-foreground">
              Comisiones registradas automáticamente por ventas
            </p>
          </div>
          <Button onClick={() => refetchRegistradas()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card rounded-lg border">
          <div className="space-y-2">
            <Label>Fecha Desde</Label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha Hasta</Label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Empleado</Label>
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
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Comisión Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalComisionesRegistradas)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Base Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalBaseRegistradas)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                % Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {porcentajePromedioRegistradas.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de Comisiones Registradas */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Comisión</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead>Venta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingRegistradas ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Cargando comisiones...
                  </TableCell>
                </TableRow>
              ) : !comisionesRegistradas || comisionesRegistradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay comisiones registradas en el periodo seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                comisionesRegistradas.map((comision: any) => (
                  <TableRow key={comision.id}>
                    <TableCell>
                      {comision.periodo_inicio ? 
                        format(new Date(comision.periodo_inicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: es }) 
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {comision.empleado?.nombre} {comision.empleado?.apellidos}
                    </TableCell>
                    <TableCell>{comision.sucursal?.nombre || '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(comision.monto_base))}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(comision.porcentaje_comision).toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(Number(comision.monto_comision))}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={comision.estado === 'pendiente' ? 'secondary' : 'default'}>
                        {comision.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>#{comision.id_venta}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
