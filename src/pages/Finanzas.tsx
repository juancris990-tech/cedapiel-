import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Percent, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type MovimientoTipo = "Ingreso" | "Gasto";
type TipoFiltro = "todos" | "ingresos" | "gastos";

type Movimiento = {
  id: string;
  fecha: string;
  descripcion: string;
  tipo: MovimientoTipo;
  monto: number;
};

type VentaResumen = Pick<Database["public"]["Tables"]["ventas"]["Row"], "id" | "fecha" | "total">;
type GastoResumen = Pick<
  Database["public"]["Tables"]["gastos_sucursal"]["Row"],
  "id" | "fecha" | "descripcion" | "categoria" | "monto"
>;

const Finanzas = () => {
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos");
  const hoy = new Date();

  const { data, isLoading } = useQuery({
    queryKey: ["finanzas-resumen", format(hoy, "yyyy-MM")],
    queryFn: async () => {
      const inicioMes = format(startOfMonth(hoy), "yyyy-MM-dd");
      const finMes = format(endOfMonth(hoy), "yyyy-MM-dd");
      const inicio6Meses = format(startOfMonth(subMonths(hoy, 5)), "yyyy-MM-dd");
      const fin6Meses = format(endOfMonth(hoy), "yyyy-MM-dd");

      const { data: ventasMes, error: errorVentasMes } = await supabase
        .from("ventas")
        .select("id, fecha, total")
        .in("estado_venta", ["cerrada", "Completada"])
        .gte("fecha", inicioMes)
        .lte("fecha", finMes);
      if (errorVentasMes) throw errorVentasMes;

      const { data: gastosMes, error: errorGastosMes } = await supabase
        .from("gastos_sucursal")
        .select("id, fecha, descripcion, categoria, monto")
        .gte("fecha", inicioMes)
        .lte("fecha", finMes);
      if (errorGastosMes) throw errorGastosMes;

      const { data: ventas6Meses, error: errorVentas6Meses } = await supabase
        .from("ventas")
        .select("id, fecha, total")
        .in("estado_venta", ["cerrada", "Completada"])
        .gte("fecha", inicio6Meses)
        .lte("fecha", fin6Meses);
      if (errorVentas6Meses) throw errorVentas6Meses;

      const { data: gastos6Meses, error: errorGastos6Meses } = await supabase
        .from("gastos_sucursal")
        .select("id, fecha, descripcion, categoria, monto")
        .gte("fecha", inicio6Meses)
        .lte("fecha", fin6Meses);
      if (errorGastos6Meses) throw errorGastos6Meses;

      const ventasMesData = (ventasMes || []) as VentaResumen[];
      const gastosMesData = (gastosMes || []) as GastoResumen[];
      const ventas6MesesData = (ventas6Meses || []) as VentaResumen[];
      const gastos6MesesData = (gastos6Meses || []) as GastoResumen[];

      const ingresosMes = ventasMesData.reduce((acc, item) => acc + Number(item.total || 0), 0);
      const gastosMesTotal = gastosMesData.reduce((acc, item) => acc + Number(item.monto || 0), 0);

      const meses = Array.from({ length: 6 }, (_, idx) => startOfMonth(subMonths(hoy, 5 - idx)));
      const mapMes = new Map<string, { mes: string; ingresos: number; gastos: number }>();

      meses.forEach((mesDate) => {
        const key = format(mesDate, "yyyy-MM");
        mapMes.set(key, {
          mes: format(mesDate, "MMM yy", { locale: es }),
          ingresos: 0,
          gastos: 0,
        });
      });

      ventas6MesesData.forEach((venta) => {
        if (!venta.fecha) return;
        const key = format(new Date(venta.fecha), "yyyy-MM");
        const current = mapMes.get(key);
        if (!current) return;
        current.ingresos += Number(venta.total || 0);
      });

      gastos6MesesData.forEach((gasto) => {
        const key = format(new Date(gasto.fecha), "yyyy-MM");
        const current = mapMes.get(key);
        if (!current) return;
        current.gastos += Number(gasto.monto || 0);
      });

      const chartData = Array.from(mapMes.values());

      const movimientosIngresos: Movimiento[] = ventas6MesesData.map((venta, index) => ({
        id: `ingreso-${venta.id ?? index}`,
        fecha: venta.fecha,
        descripcion: `Venta #${venta.id ?? "N/A"}`,
        tipo: "Ingreso",
        monto: Number(venta.total || 0),
      }));

      const movimientosGastos: Movimiento[] = gastos6MesesData.map((gasto) => ({
        id: `gasto-${gasto.id}`,
        fecha: gasto.fecha,
        descripcion: gasto.descripcion?.trim() || `Gasto: ${gasto.categoria}`,
        tipo: "Gasto",
        monto: Number(gasto.monto || 0),
      }));

      const movimientos = [...movimientosIngresos, ...movimientosGastos]
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 25);

      return {
        ingresosMes,
        gastosMes: gastosMesTotal,
        chartData,
        movimientos,
      };
    },
  });

  const ingresosMes = data?.ingresosMes || 0;
  const gastosMes = data?.gastosMes || 0;
  const utilidadNeta = ingresosMes - gastosMes;
  const margenUtilidad = ingresosMes > 0 ? (utilidadNeta / ingresosMes) * 100 : 0;

  const movimientosFiltrados = useMemo(() => {
    const movimientos = data?.movimientos || [];
    if (tipoFiltro === "ingresos") {
      return movimientos.filter((movimiento) => movimiento.tipo === "Ingreso");
    }
    if (tipoFiltro === "gastos") {
      return movimientos.filter((movimiento) => movimiento.tipo === "Gasto");
    }
    return movimientos;
  }, [data?.movimientos, tipoFiltro]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Finanzas</h1>
          <p className="text-muted-foreground mt-2">Resumen financiero con ingresos, gastos y movimientos recientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(ingresosMes)}</div>
            <p className="text-xs text-muted-foreground mt-1">Ventas cerradas/completadas del mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(gastosMes)}</div>
            <p className="text-xs text-muted-foreground mt-1">Egresos registrados en gastos_sucursal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad neta</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${utilidadNeta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(utilidadNeta)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ingresos - gastos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen de utilidad</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${margenUtilidad >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {margenUtilidad.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">% de utilidad sobre ingresos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingresos vs gastos (últimos 6 meses)</CardTitle>
          <CardDescription>Comparativo mensual de entradas y salidas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[320px] flex items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data?.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="ingresos" name="Ingresos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Movimientos recientes</CardTitle>
              <CardDescription>Últimos ingresos y gastos registrados</CardDescription>
            </div>

            <div className="w-full md:w-52">
              <Select value={tipoFiltro} onValueChange={(value: TipoFiltro) => setTipoFiltro(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ingresos">Ingresos</SelectItem>
                  <SelectItem value="gastos">Gastos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : movimientosFiltrados.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No hay movimientos para el filtro seleccionado</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientosFiltrados.map((movimiento: Movimiento) => (
                    <TableRow key={movimiento.id}>
                      <TableCell>{format(new Date(movimiento.fecha), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{movimiento.descripcion}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            movimiento.tipo === "Ingreso"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }
                        >
                          {movimiento.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          movimiento.tipo === "Ingreso" ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {formatCurrency(movimiento.monto)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Finanzas;
