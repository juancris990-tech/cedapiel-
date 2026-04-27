import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, TrendingDown, Percent, DollarSign } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ReporteDescuentos() {
  const [fechaDesde, setFechaDesde] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [fechaHasta, setFechaHasta] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [sucursalFiltro, setSucursalFiltro] = useState<string>("todas");
  const [codigoPromoFiltro, setCodigoPromoFiltro] = useState<string>("");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value || 0);
  };

  // Fetch sucursales
  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .order('nombre');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch detalle de descuentos
  const { data: detalleDescuentos = [], isLoading } = useQuery({
    queryKey: ['detalle-descuentos', fechaDesde, fechaHasta, sucursalFiltro, codigoPromoFiltro],
    queryFn: async () => {
      let query = supabase
        .from('vw_ventas_detalle_descuentos')
        .select('*')
        .gte('fecha_venta', fechaDesde)
        .lte('fecha_venta', fechaHasta)
        .neq('descuento_tipo', 'ninguno');

      if (sucursalFiltro !== 'todas') {
        query = query.eq('id_sucursal', parseInt(sucursalFiltro));
      }

      if (codigoPromoFiltro) {
        query = query.ilike('codigo_promocion', `%${codigoPromoFiltro}%`);
      }

      const { data, error } = await query.order('fecha_venta', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Calcular métricas
  const metricas = useMemo(() => {
    const totalOriginal = detalleDescuentos.reduce((sum, item) => sum + (item.subtotal_original_mxn || 0), 0);
    const totalDescuento = detalleDescuentos.reduce((sum, item) => sum + (item.descuento_total_mxn || 0), 0);
    const totalFinal = detalleDescuentos.reduce((sum, item) => sum + (item.subtotal_final_mxn || 0), 0);
    const descuentoPromedio = totalOriginal > 0 ? (totalDescuento / totalOriginal) * 100 : 0;

    return {
      totalOriginal,
      totalDescuento,
      totalFinal,
      descuentoPromedio,
      numItems: detalleDescuentos.length,
    };
  }, [detalleDescuentos]);

  // Top servicios con mayor descuento
  const topServicios = useMemo(() => {
    const serviciosMap = new Map<string, { nombre: string; descuento: number; count: number }>();
    
    detalleDescuentos.forEach(item => {
      const nombre = item.servicio_nombre || 'Sin nombre';
      const existing = serviciosMap.get(nombre) || { nombre, descuento: 0, count: 0 };
      serviciosMap.set(nombre, {
        nombre,
        descuento: existing.descuento + (item.descuento_total_mxn || 0),
        count: existing.count + 1,
      });
    });

    return Array.from(serviciosMap.values())
      .sort((a, b) => b.descuento - a.descuento)
      .slice(0, 10);
  }, [detalleDescuentos]);

  // Top profesionales por descuentos otorgados
  const topProfesionales = useMemo(() => {
    const profesionalesMap = new Map<string, { nombre: string; descuento: number; count: number }>();
    
    detalleDescuentos.forEach(item => {
      const nombre = item.profesional_nombre || 'Sin asignar';
      const existing = profesionalesMap.get(nombre) || { nombre, descuento: 0, count: 0 };
      profesionalesMap.set(nombre, {
        nombre,
        descuento: existing.descuento + (item.descuento_total_mxn || 0),
        count: existing.count + 1,
      });
    });

    return Array.from(profesionalesMap.values())
      .sort((a, b) => b.descuento - a.descuento)
      .slice(0, 10);
  }, [detalleDescuentos]);

  // Top códigos promocionales
  const topPromos = useMemo(() => {
    const promosMap = new Map<string, { codigo: string; descuento: number; usos: number }>();
    
    detalleDescuentos.forEach(item => {
      if (item.codigo_promocion) {
        const codigo = item.codigo_promocion;
        const existing = promosMap.get(codigo) || { codigo, descuento: 0, usos: 0 };
        promosMap.set(codigo, {
          codigo,
          descuento: existing.descuento + (item.descuento_total_mxn || 0),
          usos: existing.usos + 1,
        });
      }
    });

    return Array.from(promosMap.values())
      .sort((a, b) => b.descuento - a.descuento)
      .slice(0, 10);
  }, [detalleDescuentos]);

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reporte de Descuentos</h1>
          <p className="text-muted-foreground">Análisis detallado de descuentos aplicados</p>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha-desde">Desde</Label>
                <Input
                  id="fecha-desde"
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha-hasta">Hasta</Label>
                <Input
                  id="fecha-hasta"
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sucursal">Sucursal</Label>
                <Select value={sucursalFiltro} onValueChange={setSucursalFiltro}>
                  <SelectTrigger id="sucursal">
                    <SelectValue placeholder="Todas las sucursales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las sucursales</SelectItem>
                    {sucursales.map((sucursal) => (
                      <SelectItem key={sucursal.id} value={sucursal.id.toString()}>
                        {sucursal.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo-promo">Código Promocional</Label>
                <Input
                  id="codigo-promo"
                  placeholder="Buscar código..."
                  value={codigoPromoFiltro}
                  onChange={(e) => setCodigoPromoFiltro(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Descuento Total</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(metricas.totalDescuento)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                En {metricas.numItems} items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">% Descuento Promedio</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricas.descuentoPromedio.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sobre ventas con descuento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Venta Original</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(metricas.totalOriginal)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Precio sin descuentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Venta Final</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(metricas.totalFinal)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Después de descuentos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Servicios */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top 10 Servicios por Descuento</CardTitle>
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posición</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead className="text-right">Descuento Total</TableHead>
                  <TableHead className="text-right">Aplicaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topServicios.map((servicio, index) => (
                  <TableRow key={servicio.nombre}>
                    <TableCell>
                      <Badge variant={index < 3 ? "default" : "secondary"}>
                        {index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{servicio.nombre}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">
                      {formatCurrency(servicio.descuento)}
                    </TableCell>
                    <TableCell className="text-right">{servicio.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Profesionales */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Profesionales por Descuentos Otorgados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posición</TableHead>
                  <TableHead>Profesional</TableHead>
                  <TableHead className="text-right">Descuento Total</TableHead>
                  <TableHead className="text-right">Aplicaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProfesionales.map((prof, index) => (
                  <TableRow key={prof.nombre}>
                    <TableCell>
                      <Badge variant={index < 3 ? "default" : "secondary"}>
                        {index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{prof.nombre}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">
                      {formatCurrency(prof.descuento)}
                    </TableCell>
                    <TableCell className="text-right">{prof.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Promos */}
        {topPromos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Códigos Promocionales</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Descuento Total</TableHead>
                    <TableHead className="text-right">Usos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPromos.map((promo) => (
                    <TableRow key={promo.codigo}>
                      <TableCell>
                        <Badge variant="outline">{promo.codigo}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {formatCurrency(promo.descuento)}
                      </TableCell>
                      <TableCell className="text-right">{promo.usos}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}