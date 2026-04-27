import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Download, TrendingUp, DollarSign, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function IngresosReconocidos() {
  const [fechaInicio, setFechaInicio] = useState<Date>(startOfMonth(new Date()));
  const [fechaFin, setFechaFin] = useState<Date>(endOfMonth(new Date()));
  const [sucursalFiltro, setSucursalFiltro] = useState<string>("todas");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");

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

  const { data: categorias } = useQuery({
    queryKey: ["categorias-servicio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categoria_servicio")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: ingresos, isLoading } = useQuery({
    queryKey: ["libro-ingresos", fechaInicio, fechaFin, sucursalFiltro, categoriaFiltro],
    queryFn: async () => {
      let query = supabase
        .from("libro_ingresos")
        .select(`
          *,
          sucursales(nombre),
          clientes(nombre, apellidos),
          ventas(
            id,
            total,
            venta_items(
              id_servicio,
              servicios(nombre, id_categoria),
              categoria_servicio(nombre)
            )
          )
        `)
        .gte("fecha", format(fechaInicio, "yyyy-MM-dd"))
        .lte("fecha", format(fechaFin, "yyyy-MM-dd"))
        .order("fecha", { ascending: false });

      if (sucursalFiltro !== "todas") {
        query = query.eq("id_sucursal", parseInt(sucursalFiltro));
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filtrar por categoría si aplica
      if (categoriaFiltro !== "todas") {
        return data?.filter((ingreso: any) => {
          const items = ingreso.ventas?.venta_items || [];
          return items.some((item: any) => 
            item.servicios?.id_categoria === parseInt(categoriaFiltro)
          );
        });
      }
      
      return data;
    },
  });

  const stats = useMemo(() => {
    if (!ingresos) return { 
      totalIngresos: 0, 
      numeroVentas: 0, 
      ticketPromedio: 0,
      porCategoria: [] as any[],
      porSucursal: [] as any[]
    };

    const totalIngresos = ingresos.reduce((acc, i) => acc + Number(i.monto_mxn), 0);
    
    // Contar ventas únicas
    const ventasUnicas = new Set(ingresos.filter(i => i.id_venta).map(i => i.id_venta));
    const numeroVentas = ventasUnicas.size;
    
    const ticketPromedio = numeroVentas > 0 ? totalIngresos / numeroVentas : 0;

    // Agrupar por categoría
    const categoriaMap = new Map<string, number>();
    ingresos.forEach((ingreso: any) => {
      const items = ingreso.ventas?.venta_items || [];
      items.forEach((item: any) => {
        const catNombre = item.categoria_servicio?.nombre || "Sin categoría";
        categoriaMap.set(catNombre, (categoriaMap.get(catNombre) || 0) + Number(ingreso.monto_mxn) / items.length);
      });
    });
    const porCategoria = Array.from(categoriaMap.entries())
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto);

    // Agrupar por sucursal
    const sucursalMap = new Map<string, number>();
    ingresos.forEach((ingreso: any) => {
      const sucursal = ingreso.sucursales?.nombre || "Sin sucursal";
      sucursalMap.set(sucursal, (sucursalMap.get(sucursal) || 0) + Number(ingreso.monto_mxn));
    });
    const porSucursal = Array.from(sucursalMap.entries())
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto);

    return { totalIngresos, numeroVentas, ticketPromedio, porCategoria, porSucursal };
  }, [ingresos]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ingresos Reconocidos</h1>
            <p className="text-muted-foreground mt-2">
              Base para cálculo de comisiones y análisis de rentabilidad
            </p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reconocido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(stats.totalIngresos)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Base para comisiones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Número de Ventas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">
                {stats.numeroVentas}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                En el período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(stats.ticketPromedio)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Por venta
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtra los ingresos reconocidos por período, sucursal y categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fechaInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaInicio ? format(fechaInicio, "PPP", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fechaInicio}
                      onSelect={(date) => date && setFechaInicio(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fechaFin && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaFin ? format(fechaFin, "PPP", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fechaFin}
                      onSelect={(date) => date && setFechaFin(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Sucursal</Label>
                <Select value={sucursalFiltro} onValueChange={setSucursalFiltro}>
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

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {categorias?.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Por Categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Categoría</CardTitle>
            <CardDescription>Distribución de ingresos reconocidos por tipo de servicio</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.porCategoria.length > 0 ? (
              <div className="space-y-2">
                {stats.porCategoria.map((cat: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{cat.nombre}</span>
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(cat.monto)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay datos para mostrar</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Por Sucursal */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Sucursal</CardTitle>
            <CardDescription>Distribución de ingresos reconocidos por ubicación</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.porSucursal.length > 0 ? (
              <div className="space-y-2">
                {stats.porSucursal.map((suc: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{suc.nombre}</span>
                    </div>
                    <div className="text-lg font-bold text-success">
                      {formatCurrency(suc.monto)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay datos para mostrar</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalle de Ingresos */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Ingresos Reconocidos</CardTitle>
            <CardDescription>Registro de cada ingreso reconocido en el período</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : ingresos && ingresos.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Venta</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Nota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingresos.map((ingreso: any) => (
                      <TableRow key={ingreso.id}>
                        <TableCell>
                          {format(new Date(ingreso.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          {ingreso.clientes?.nombre} {ingreso.clientes?.apellidos}
                        </TableCell>
                        <TableCell>{ingreso.sucursales?.nombre}</TableCell>
                        <TableCell>
                          {ingreso.id_venta ? (
                            <a href={`/ventas?id=${ingreso.id_venta}`} className="text-primary hover:underline">
                              Venta #{ingreso.id_venta}
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(Number(ingreso.monto_mxn))}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-xs truncate">
                          {ingreso.nota || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay ingresos registrados en el período seleccionado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}