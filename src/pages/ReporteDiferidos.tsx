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
import { CalendarIcon, Download, FileText, Loader2, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReporteDiferidos() {
  const [fechaInicio, setFechaInicio] = useState<Date>(startOfMonth(new Date()));
  const [fechaFin, setFechaFin] = useState<Date>(endOfMonth(new Date()));
  const [sucursalFiltro, setSucursalFiltro] = useState<string>("todas");

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

  const { data: movimientos, isLoading } = useQuery({
    queryKey: ["libro-diferidos", fechaInicio, fechaFin, sucursalFiltro],
    queryFn: async () => {
      let query = supabase
        .from("libro_diferidos")
        .select(`
          *,
          sucursales(nombre),
          clientes(nombre, apellidos)
        `)
        .gte("fecha", format(fechaInicio, "yyyy-MM-dd"))
        .lte("fecha", format(fechaFin, "yyyy-MM-dd"))
        .order("fecha", { ascending: false });

      if (sucursalFiltro !== "todas") {
        query = query.eq("id_sucursal", parseInt(sucursalFiltro));
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const { data: pasivoPorSucursal } = useQuery({
    queryKey: ["pasivo-diferidos-sucursal"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vw_pasivo_diferidos_sucursal")
        .select("*");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: anticiposPorAntiguedad } = useQuery({
    queryKey: ["anticipos-antiguedad"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vw_anticipos_detalle")
        .select("*")
        .neq("estado", "aplicado_total")
        .neq("estado", "reembolsado");
      
      if (error) throw error;
      
      // Agrupar por antigüedad
      const grupos = {
        "0-30": [] as any[],
        "31-60": [] as any[],
        "61-90": [] as any[],
        "90+": [] as any[]
      };

      data?.forEach((anticipo: any) => {
        const dias = anticipo.dias_desde_registro;
        if (dias <= 30) grupos["0-30"].push(anticipo);
        else if (dias <= 60) grupos["31-60"].push(anticipo);
        else if (dias <= 90) grupos["61-90"].push(anticipo);
        else grupos["90+"].push(anticipo);
      });

      return grupos;
    },
  });

  const stats = useMemo(() => {
    if (!movimientos) return { altasAnticipo: 0, aplicaciones: 0, reembolsos: 0, pasivoTotal: 0 };

    const altasAnticipo = movimientos
      .filter(m => m.tipo === 'alta_anticipo')
      .reduce((acc, m) => acc + Number(m.monto_mxn), 0);

    const aplicaciones = movimientos
      .filter(m => m.tipo === 'aplicacion')
      .reduce((acc, m) => acc + Math.abs(Number(m.monto_mxn)), 0);

    const reembolsos = movimientos
      .filter(m => m.tipo === 'reembolso')
      .reduce((acc, m) => acc + Math.abs(Number(m.monto_mxn)), 0);

    const pasivoTotal = pasivoPorSucursal?.reduce((acc: number, p: any) => acc + Number(p.pasivo_total_mxn), 0) || 0;

    return { altasAnticipo, aplicaciones, reembolsos, pasivoTotal };
  }, [movimientos, pasivoPorSucursal]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const getTipoBadge = (tipo: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      alta_anticipo: { variant: "default", label: "Alta Anticipo" },
      aplicacion: { variant: "secondary", label: "Aplicación" },
      reembolso: { variant: "destructive", label: "Reembolso" },
      ajuste: { variant: "secondary", label: "Ajuste" }
    };

    const info = config[tipo] || { variant: "default", label: tipo };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reporte de Ingresos Diferidos</h1>
            <p className="text-muted-foreground mt-2">
              Pasivo de anticipos y movimientos de ingresos diferidos
            </p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pasivo Total</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {formatCurrency(stats.pasivoTotal)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Obligación pendiente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anticipos Recibidos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(stats.altasAnticipo)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                En el período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aplicaciones</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(stats.aplicaciones)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ingresos reconocidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reembolsos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(stats.reembolsos)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Devueltos al cliente
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtra los movimientos por fecha y sucursal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Pasivo por Sucursal */}
        <Card>
          <CardHeader>
            <CardTitle>Pasivo por Sucursal</CardTitle>
            <CardDescription>Total de ingresos diferidos por ubicación</CardDescription>
          </CardHeader>
          <CardContent>
            {pasivoPorSucursal && pasivoPorSucursal.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sucursal</TableHead>
                      <TableHead className="text-right">Pasivo Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pasivoPorSucursal.map((p: any) => (
                      <TableRow key={p.id_sucursal}>
                        <TableCell className="font-medium">{p.sucursal}</TableCell>
                        <TableCell className="text-right font-bold text-warning">
                          {formatCurrency(Number(p.pasivo_total_mxn))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay pasivo registrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anticipos por Antigüedad */}
        <Card>
          <CardHeader>
            <CardTitle>Anticipos por Antigüedad</CardTitle>
            <CardDescription>Clasificación de anticipos pendientes por días transcurridos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {anticiposPorAntiguedad && Object.entries(anticiposPorAntiguedad).map(([rango, anticipos]) => {
                const total = (anticipos as any[]).reduce((acc, a) => acc + Number(a.saldo_disponible_mxn), 0);
                return (
                  <Card key={rango}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{rango} días</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(total)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(anticipos as any[]).length} anticipo{(anticipos as any[]).length !== 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Movimientos */}
        <Card>
          <CardHeader>
            <CardTitle>Movimientos de Ingresos Diferidos</CardTitle>
            <CardDescription>Detalle de altas, aplicaciones y reembolsos</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : movimientos && movimientos.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Nota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.map((mov: any) => (
                      <TableRow key={mov.id}>
                        <TableCell>
                          {format(new Date(mov.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                        <TableCell>
                          {mov.clientes?.nombre} {mov.clientes?.apellidos}
                        </TableCell>
                        <TableCell>{mov.sucursales?.nombre}</TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          Number(mov.monto_mxn) > 0 ? "text-primary" : "text-destructive"
                        )}>
                          {formatCurrency(Number(mov.monto_mxn))}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {mov.nota || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay movimientos en el período seleccionado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}