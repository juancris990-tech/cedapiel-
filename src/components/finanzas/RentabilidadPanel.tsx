import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const RentabilidadPanel = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });
  const [selectedSucursal, setSelectedSucursal] = useState<string>("todas");

  const { data: sucursales } = useQuery({
    queryKey: ["sucursales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sucursales")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: rentabilidadData, isLoading } = useQuery({
    queryKey: ["rentabilidad", dateRange, selectedSucursal],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];
      
      const inicio = format(dateRange.from, "yyyy-MM-dd");
      const fin = format(dateRange.to, "yyyy-MM-dd");

      // Obtener ventas desde la vista que solo incluye ventas cerradas/completadas
      let ventasQuery = (supabase as any)
        .from("vw_ventas_desglose")
        .select("total, id_sucursal, sucursal")
        .gte("fecha", inicio)
        .lte("fecha", fin);

      if (selectedSucursal !== "todas") {
        ventasQuery = ventasQuery.eq("id_sucursal", parseInt(selectedSucursal));
      }

      const { data: ventas, error: ventasError } = await ventasQuery;
      if (ventasError) throw ventasError;

      // Obtener gastos
      let gastosQuery = supabase
        .from("gastos_sucursal")
        .select("monto, categoria, id_sucursal")
        .gte("fecha", inicio)
        .lte("fecha", fin);

      if (selectedSucursal !== "todas") {
        gastosQuery = gastosQuery.eq("id_sucursal", parseInt(selectedSucursal));
      }

      const { data: gastos, error: gastosError } = await gastosQuery;
      if (gastosError) throw gastosError;

      // Obtener comisiones
      let comisionesQuery = supabase
        .from("comisiones")
        .select("monto_comision, id_sucursal")
        .gte("periodo_inicio", inicio)
        .lte("periodo_fin", fin);

      if (selectedSucursal !== "todas") {
        comisionesQuery = comisionesQuery.eq("id_sucursal", parseInt(selectedSucursal));
      }

      const { data: comisiones, error: comisionesError } = await comisionesQuery;
      if (comisionesError) throw comisionesError;

      // Agrupar por sucursal
      const rentabilidadPorSucursal: Record<number, {
        nombre: string;
        ventas: number;
        gastos: number;
        comisiones: number;
        rentabilidad: number;
        margen: number;
        gastosPorCategoria: Record<string, number>;
      }> = {};

      // Procesar ventas
      ventas?.forEach((venta: any) => {
        const idSucursal = venta.id_sucursal;
        if (!rentabilidadPorSucursal[idSucursal]) {
          rentabilidadPorSucursal[idSucursal] = {
            nombre: venta.sucursal || "Sin sucursal",
            ventas: 0,
            gastos: 0,
            comisiones: 0,
            rentabilidad: 0,
            margen: 0,
            gastosPorCategoria: {},
          };
        }
        rentabilidadPorSucursal[idSucursal].ventas += Number(venta.total);
      });

      // Procesar gastos
      gastos?.forEach((gasto) => {
        const idSucursal = gasto.id_sucursal;
        if (rentabilidadPorSucursal[idSucursal]) {
          rentabilidadPorSucursal[idSucursal].gastos += Number(gasto.monto);
          const cat = gasto.categoria;
          rentabilidadPorSucursal[idSucursal].gastosPorCategoria[cat] = 
            (rentabilidadPorSucursal[idSucursal].gastosPorCategoria[cat] || 0) + Number(gasto.monto);
        }
      });

      // Procesar comisiones
      comisiones?.forEach((comision) => {
        const idSucursal = comision.id_sucursal;
        if (rentabilidadPorSucursal[idSucursal]) {
          rentabilidadPorSucursal[idSucursal].comisiones += Number(comision.monto_comision);
        }
      });

      // Calcular rentabilidad y margen
      Object.values(rentabilidadPorSucursal).forEach((sucursal) => {
        sucursal.rentabilidad = sucursal.ventas - sucursal.gastos - sucursal.comisiones;
        sucursal.margen = sucursal.ventas > 0 ? (sucursal.rentabilidad / sucursal.ventas) * 100 : 0;
      });

      return Object.values(rentabilidadPorSucursal);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const totalVentas = rentabilidadData?.reduce((acc, s) => acc + s.ventas, 0) || 0;
  const totalGastos = rentabilidadData?.reduce((acc, s) => acc + s.gastos, 0) || 0;
  const totalComisiones = rentabilidadData?.reduce((acc, s) => acc + s.comisiones, 0) || 0;
  const rentabilidadTotal = totalVentas - totalGastos - totalComisiones;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecciona el mes y sucursal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rango de Fechas</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy")
                      )
                    ) : (
                      "Seleccionar rango"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {sucursales?.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalVentas)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalGastos)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comisiones</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(totalComisiones)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rentabilidad Neta</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${rentabilidadTotal >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(rentabilidadTotal)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rentabilidad por Sucursal</CardTitle>
          <CardDescription>
            Análisis financiero detallado de cada sucursal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rentabilidadData && rentabilidadData.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Gastos</TableHead>
                    <TableHead className="text-right">Comisiones</TableHead>
                    <TableHead className="text-right">Rentabilidad</TableHead>
                    <TableHead className="text-right">Margen %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rentabilidadData.map((sucursal, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {sucursal.nombre}
                      </TableCell>
                      <TableCell className="text-right text-primary font-bold">
                        {formatCurrency(sucursal.ventas)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(sucursal.gastos)}
                      </TableCell>
                      <TableCell className="text-right text-warning">
                        {formatCurrency(sucursal.comisiones)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${sucursal.rentabilidad >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(sucursal.rentabilidad)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={sucursal.margen >= 20 ? "default" : sucursal.margen >= 10 ? "secondary" : "destructive"}>
                          {sucursal.margen.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay datos de rentabilidad para este período</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RentabilidadPanel;
