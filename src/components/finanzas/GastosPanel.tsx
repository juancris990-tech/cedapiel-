import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import GastoDialog from "./GastoDialog";

const CATEGORIAS_COLORES: Record<string, string> = {
  "Renta": "hsl(var(--chart-1))",
  "Mantenimiento": "hsl(var(--chart-2))",
  "Servicios": "hsl(var(--chart-3))",
  "Seguros": "hsl(var(--chart-4))",
  "Marketing": "hsl(var(--chart-5))",
  "Sueldos": "hsl(var(--primary))",
  "Asesorías": "hsl(var(--secondary))",
  "Equipos": "hsl(var(--accent))",
};

const GastosPanel = () => {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });
  const [selectedSucursal, setSelectedSucursal] = useState<string>("todas");
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const { data: gastos, isLoading } = useQuery({
    queryKey: ["gastos", dateRange, selectedSucursal],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];
      
      const inicio = format(dateRange.from, "yyyy-MM-dd");
      const fin = format(dateRange.to, "yyyy-MM-dd");

      let query = supabase
        .from("gastos_sucursal")
        .select(`
          *,
          sucursales(nombre)
        `)
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha", { ascending: false });

      if (selectedSucursal !== "todas") {
        query = query.eq("id_sucursal", parseInt(selectedSucursal));
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const gastosPorCategoria = gastos?.reduce((acc, gasto) => {
    const categoria = gasto.categoria;
    if (!acc[categoria]) {
      acc[categoria] = 0;
    }
    acc[categoria] += Number(gasto.monto);
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(gastosPorCategoria || {}).map(([categoria, monto]) => ({
    categoria,
    monto,
    color: CATEGORIAS_COLORES[categoria] || "hsl(var(--muted))",
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const totalGastos = gastos?.reduce((acc, g) => acc + Number(g.monto), 0) || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Selecciona el mes y sucursal</CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Gasto
            </Button>
          </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoría</CardTitle>
          <CardDescription>
            Distribución de gastos del mes - Total: {formatCurrency(totalGastos)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="monto" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos para mostrar
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Gastos</CardTitle>
          <CardDescription>
            Listado de gastos del mes seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : gastos && gastos.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Referencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gastos.map((gasto) => (
                    <TableRow key={gasto.id}>
                      <TableCell>
                        {format(new Date(gasto.fecha), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{(gasto as any).sucursales?.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{gasto.categoria}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {gasto.descripcion || "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-destructive">
                        {formatCurrency(Number(gasto.monto))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {gasto.referencia || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay gastos registrados para este período</p>
            </div>
          )}
        </CardContent>
      </Card>

      <GastoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default GastosPanel;
