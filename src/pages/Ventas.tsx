import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, DollarSign, Percent, TrendingUp, Loader2, X, Download, Receipt, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SalesCharts } from "@/components/ventas/SalesCharts";
import { StackedDailyChart } from "@/components/ventas/StackedDailyChart";
import { DetalleVentaItems } from "@/components/ventas/DetalleVentaItems";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const Ventas = () => {
  const queryClient = useQueryClient();
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const [metodoPago, setMetodoPago] = useState<string>("todos");
  const [sucursalFiltro, setSucursalFiltro] = useState<string>("todas");
  const [ventaExpandida, setVentaExpandida] = useState<number | null>(null);
  const [ventaAEliminar, setVentaAEliminar] = useState<{ id: number; cliente: string } | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const handleEliminarVenta = async () => {
    if (!ventaAEliminar) return;
    
    setEliminando(true);
    try {
      const { data, error } = await supabase.functions.invoke('eliminar-venta', {
        body: { id_venta: ventaAEliminar.id }
      });

      if (error) throw error;

      toast.success(`Venta eliminada correctamente`);
      queryClient.invalidateQueries({ queryKey: ['ventas-desglose'] });
      queryClient.invalidateQueries({ queryKey: ['anticipos-pendientes'] });
    } catch (error: any) {
      console.error('Error eliminando venta:', error);
      toast.error(`Error al eliminar: ${error.message}`);
    } finally {
      setEliminando(false);
      setVentaAEliminar(null);
    }
  };

  // Escuchar cambios en tiempo real en todas las tablas relacionadas
  useEffect(() => {
    const channel = supabase
      .channel('ventas-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ventas'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ventas-desglose'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venta_items'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ventas-desglose'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pagos'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ventas-desglose'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aplicacion_anticipo'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ventas-desglose'] });
          queryClient.invalidateQueries({ queryKey: ['anticipos-pendientes'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

  const { data: ventas, isLoading } = useQuery({
    queryKey: ["ventas-desglose", fechaInicio, fechaFin, metodoPago, sucursalFiltro],
    queryFn: async () => {
      let query = (supabase as any)
        .from("vw_ventas_desglose")
        .select("*")
        .order("fecha", { ascending: false });

      if (fechaInicio) {
        query = query.gte("fecha", format(fechaInicio, "yyyy-MM-dd"));
      }
      if (fechaFin) {
        query = query.lte("fecha", format(fechaFin, "yyyy-MM-dd"));
      }
      if (sucursalFiltro !== "todas") {
        query = query.eq("id_sucursal", parseInt(sucursalFiltro));
      }
      if (metodoPago !== "todos") {
        query = query.ilike("metodos_pago", `%${metodoPago}%`);
      }

      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: anticiposPendientes } = useQuery({
    queryKey: ["anticipos-pendientes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vw_anticipos_pendientes")
        .select("*");
      
      if (error) throw error;
      return data;
    },
  });

  // KPIs calculados
  const promedioDescuento = ventas?.reduce((acc: number, v: any) => acc + (Number(v.promedio_descuento_porcentaje) || 0), 0) / (ventas?.length || 1);
  const totalAnticipos = anticiposPendientes?.reduce((acc: number, a: any) => acc + (Number(a.monto) || 0), 0) || 0;
  const totalVentas = ventas?.reduce((acc: number, v: any) => acc + (Number(v.total) || 0), 0) || 0;
  const totalDescuentos = ventas?.reduce((acc: number, v: any) => acc + (Number(v.descuento) || 0), 0) || 0;
  const ventasNetas = totalVentas - totalDescuentos;
  const ticketPromedio = ventas?.length ? totalVentas / ventas.length : 0;
  const numeroVentas = ventas?.length || 0;

  // Datos para gráficos
  const chartData = useMemo(() => {
    if (!ventas) return { dailyData: [], servicesVsProducts: [], paymentMethods: [], comparativeData: [], stackedDailyData: [] };

    // Facturación diaria
    const dailyMap = new Map<string, number>();
    ventas.forEach((v: any) => {
      const fecha = format(new Date(v.fecha), "dd/MM");
      dailyMap.set(fecha, (dailyMap.get(fecha) || 0) + Number(v.total));
    });
    const dailyData = Array.from(dailyMap.entries()).map(([fecha, monto]) => ({ fecha, monto }));

    // Datos para gráfico de barras apiladas (Servicios vs Productos por día)
    const stackedMap = new Map<string, { servicios: number; productos: number }>();
    ventas.forEach((v: any) => {
      const fecha = format(new Date(v.fecha), "dd/MM");
      const current = stackedMap.get(fecha) || { servicios: 0, productos: 0 };
      stackedMap.set(fecha, {
        servicios: current.servicios + Number(v.servicios || 0),
        productos: current.productos + Number(v.productos || 0),
      });
    });
    const stackedDailyData = Array.from(stackedMap.entries())
      .map(([fecha, values]) => ({ fecha, ...values }))
      .sort((a, b) => {
        const [dayA, monthA] = a.fecha.split('/').map(Number);
        const [dayB, monthB] = b.fecha.split('/').map(Number);
        if (monthA !== monthB) return monthA - monthB;
        return dayA - dayB;
      });

    // Servicios vs Productos - calculado desde los datos reales
    const serviciosTotal = ventas.reduce((acc: number, v: any) => acc + Number(v.servicios || 0), 0);
    const productosTotal = ventas.reduce((acc: number, v: any) => acc + Number(v.productos || 0), 0);
    
    const servicesVsProducts = [];
    if (serviciosTotal > 0) {
      servicesVsProducts.push({ nombre: "Servicios", monto: serviciosTotal });
    }
    if (productosTotal > 0) {
      servicesVsProducts.push({ nombre: "Productos", monto: productosTotal });
    }

    // Métodos de pago
    const paymentMap = new Map<string, { cantidad: number; monto: number }>();
    ventas.forEach((v: any) => {
      const metodos = v.metodos_pago?.split(",") || ["Sin especificar"];
      metodos.forEach((metodo: string) => {
        const m = metodo.trim();
        const current = paymentMap.get(m) || { cantidad: 0, monto: 0 };
        paymentMap.set(m, {
          cantidad: current.cantidad + 1,
          monto: current.monto + Number(v.total),
        });
      });
    });
    const paymentMethods = Array.from(paymentMap.entries()).map(([metodo, data]) => ({
      metodo,
      ...data,
    }));

    // Comparativo (mes actual, anterior, año pasado)
    const now = new Date();
    const comparativeData = [
      { periodo: "Mes anterior", citas: 0, facturacion: 0 },
      { periodo: "Mes actual", citas: numeroVentas, facturacion: totalVentas },
      { periodo: "Año pasado", citas: 0, facturacion: 0 },
    ];

    return { dailyData, servicesVsProducts, paymentMethods, comparativeData, stackedDailyData };
  }, [ventas, totalVentas, numeroVentas]);

  // Totales para el gráfico apilado
  const totalServicios = ventas?.reduce((acc: number, v: any) => acc + Number(v.servicios || 0), 0) || 0;
  const totalProductos = ventas?.reduce((acc: number, v: any) => acc + Number(v.productos || 0), 0) || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const limpiarFiltros = () => {
    setFechaInicio(undefined);
    setFechaFin(undefined);
    setMetodoPago("todos");
    setSucursalFiltro("todas");
  };

  const handleExportExcel = async () => {
    // TODO: Implementar exportación a Excel
    console.log("Exportar a Excel");
  };

  const handleExportPDF = async () => {
    // TODO: Implementar exportación a PDF
    console.log("Exportar a PDF");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes de Ventas</h1>
          <p className="text-muted-foreground mt-2">
            Análisis interactivo de ventas con descuentos y métricas clave
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={handleExportPDF} variant="outline">
            <Receipt className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalVentas)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {numeroVentas} ventas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Netas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(ventasNetas)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Después de descuentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Descuento</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {promedioDescuento.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Promedio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">
              {formatCurrency(ticketPromedio)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Por venta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nº Ventas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              {numeroVentas}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              En el período
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Filtra las ventas por fecha, método de pago o sucursal</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={limpiarFiltros}>
              <X className="h-4 w-4 mr-2" />
              Limpiar Filtros
            </Button>
          </div>
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
                    onSelect={setFechaInicio}
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
                    onSelect={setFechaFin}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
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
          </div>
        </CardContent>
      </Card>

      <StackedDailyChart 
        data={chartData.stackedDailyData} 
        totalServicios={totalServicios}
        totalProductos={totalProductos}
        totalGeneral={totalVentas}
      />

      <SalesCharts {...chartData} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ventas Registradas</CardTitle>
            <CardDescription>
              Haz clic en una venta para ver el desglose detallado de items, precios y descuentos
            </CardDescription>
          </div>
          <Button variant="outline" asChild>
            <a href="/reportes/descuentos">
              Ver Reporte de Descuentos
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : ventas && ventas.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-right">Precio Original</TableHead>
                    <TableHead className="text-right">Descuento %</TableHead>
                    <TableHead className="text-right">Descuento $</TableHead>
                    <TableHead className="text-right">Total Final</TableHead>
                    <TableHead>Método Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-12">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas.map((venta: any) => (
                    <React.Fragment key={venta.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setVentaExpandida(ventaExpandida === venta.id ? null : venta.id)}>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {ventaExpandida === venta.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {format(new Date(venta.fecha), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">{venta.cliente}</TableCell>
                        <TableCell>{venta.sucursal}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(venta.total_precio_original) || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {Number(venta.promedio_descuento_porcentaje || 0).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          -{formatCurrency(Number(venta.descuento) || 0)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(Number(venta.total) || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{venta.metodos_pago}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              venta.estado_venta === "Completada"
                                ? "default"
                                : venta.estado_venta === "Pendiente"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {venta.estado_venta}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVentaAEliminar({ id: venta.id, cliente: venta.cliente });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {ventaExpandida === venta.id && (
                        <TableRow>
                          <TableCell colSpan={11} className="p-0">
                            <DetalleVentaItems idVenta={venta.id} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay ventas registradas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {anticiposPendientes && anticiposPendientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anticipos Pendientes de Aplicación</CardTitle>
            <CardDescription>
              Anticipos que aún no han sido aplicados a ventas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Método Pago</TableHead>
                    <TableHead className="text-right">Días</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anticiposPendientes.map((anticipo) => (
                    <TableRow key={anticipo.id}>
                      <TableCell>
                        {format(new Date(anticipo.fecha_pago), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">{anticipo.cliente}</TableCell>
                      <TableCell>{anticipo.sucursal}</TableCell>
                      <TableCell className="text-right font-bold text-info">
                        {formatCurrency(Number(anticipo.monto))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{anticipo.metodo_pago}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {anticipo.dias_desde_anticipo} días
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!ventaAEliminar} onOpenChange={(open) => !open && setVentaAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la venta de <strong>{ventaAEliminar?.cliente}</strong> y todos sus registros relacionados (items, pagos, comisiones, ingresos). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminarVenta}
              disabled={eliminando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {eliminando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Ventas;
