import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { DollarSign, Clock, TrendingUp, Users } from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { es } from "date-fns/locale";

export default function ProductividadPanel() {
  const [selectedWeek, setSelectedWeek] = useState("0");

  const getWeekRange = (weeksAgo: number) => {
    const now = new Date();
    const targetDate = subWeeks(now, weeksAgo);
    const start = startOfWeek(targetDate, { weekStartsOn: 1 });
    const end = endOfWeek(targetDate, { weekStartsOn: 1 });
    return { start, end };
  };

  const { start, end } = getWeekRange(parseInt(selectedWeek));

  const { data: productividad, isLoading } = useQuery({
    queryKey: ['productividad', selectedWeek],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vw_productividad_empleado')
        .select('*')
        .gte('semana_inicio', start.toISOString().split('T')[0])
        .lte('semana_inicio', end.toISOString().split('T')[0])
        .order('ingresos_reconocidos_mxn', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const totals = productividad?.reduce(
    (acc, emp) => ({
      horas: acc.horas + (emp.horas_trabajadas || 0),
      ventas: acc.ventas + (emp.ingresos_reconocidos_mxn || 0),
      comisiones: acc.comisiones + (emp.comision_mxn || 0),
      empleados: acc.empleados + 1,
    }),
    { horas: 0, ventas: 0, comisiones: 0, empleados: 0 }
  );

  const chartData = productividad?.map(emp => ({
    nombre: emp.empleado_nombre,
    ventas: emp.ingresos_reconocidos_mxn || 0,
    horas: emp.horas_trabajadas || 0,
    productividad: (emp.ingresos_reconocidos_mxn || 0) / (emp.horas_trabajadas || 1),
  })) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Productividad del Personal</h3>
          <p className="text-sm text-muted-foreground">
            Semana del {format(start, "d 'de' MMMM", { locale: es })} al {format(end, "d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <Select value={selectedWeek} onValueChange={setSelectedWeek}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Seleccionar semana" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Semana actual</SelectItem>
            <SelectItem value="1">Hace 1 semana</SelectItem>
            <SelectItem value="2">Hace 2 semanas</SelectItem>
            <SelectItem value="3">Hace 3 semanas</SelectItem>
            <SelectItem value="4">Hace 4 semanas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totals?.empleados || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Trabajadas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totals?.horas.toFixed(1) || 0}h</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totals?.ventas || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comisiones</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totals?.comisiones || 0)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Empleado</CardTitle>
            <CardDescription>Comparativa de ventas generadas</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ChartContainer
                config={{
                  ventas: {
                    label: "Ventas",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="ventas" fill="var(--color-ventas)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productividad por Hora</CardTitle>
            <CardDescription>Ventas generadas por hora trabajada</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ChartContainer
                config={{
                  productividad: {
                    label: "Productividad",
                    color: "hsl(var(--secondary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="productividad" fill="var(--color-productividad)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Productividad y Sueldos</CardTitle>
          <CardDescription>Detalle completo por empleado</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Ticket Prom.</TableHead>
                  <TableHead className="text-right">Productividad/h</TableHead>
                  <TableHead className="text-right">Comisiones</TableHead>
                  <TableHead className="text-right">Sueldo Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productividad?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No hay datos de productividad para esta semana
                    </TableCell>
                  </TableRow>
                ) : (
                  productividad?.map((emp: any) => {
                    const sueldoBase = emp.salario_base_mxn || 0;
                    const sueldoTotal = sueldoBase + (emp.comision_mxn || 0);
                    const ticketPromedio = (emp.ingresos_reconocidos_mxn || 0) / (emp.citas_completadas_mes || 1);
                    const productividadHora = (emp.ingresos_reconocidos_mxn || 0) / (emp.horas_trabajadas || 1);
                    
                    return (
                      <TableRow key={emp.id_empleado}>
                        <TableCell className="font-medium">
                          {emp.empleado_nombre}
                        </TableCell>
                        <TableCell>{emp.sucursal_nombre}</TableCell>
                        <TableCell className="text-right">{emp.horas_trabajadas?.toFixed(1)}h</TableCell>
                        <TableCell className="text-right">{emp.citas_completadas_mes}</TableCell>
                        <TableCell className="text-right">{formatCurrency(emp.ingresos_reconocidos_mxn || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(ticketPromedio)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(productividadHora)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(emp.comision_mxn || 0)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(sueldoTotal)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
