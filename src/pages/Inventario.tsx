import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, TrendingUp, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const Inventario = () => {
  // Fetch KPIs
  const { data: stockBajo } = useQuery({
    queryKey: ["stock-bajo"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vw_reporte_stock_minimo")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: caducidades } = useQuery({
    queryKey: ["caducidades-proximas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vw_reporte_caducidad")
        .select("*")
        .lte("dias_hasta_caducar", 60);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stockActual } = useQuery({
    queryKey: ["stock-actual"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_actual")
        .select(`
          *,
          productos!inner(nombre),
          lotes_producto!inner(costo_unitario_mxn)
        `);
      if (error) throw error;
      return data || [];
    },
  });

  const valorInventarioTotal = stockActual?.reduce(
    (acc, item) => acc + (Number(item.cantidad_actual) * Number(item.lotes_producto?.costo_unitario_mxn || 0)),
    0
  ) || 0;

  const diasInventarioPromedio = stockActual?.length || 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Inventario</h1>
        <p className="text-muted-foreground">Control y gestión de productos, lotes y stock</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo Mínimo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockBajo?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Productos requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos a Vencer</CardTitle>
            <Package className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{caducidades?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Lotes (&lt;60 días)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario Total</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${valorInventarioTotal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">MXN (IVA incluido)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Activos</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockActual?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Registros de stock</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tabla de Alertas de Stock Bajo */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas de Stock Bajo</CardTitle>
            <CardDescription>Productos que necesitan reposición urgente</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Alerta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockBajo?.slice(0, 5).map((item: any) => (
                  <TableRow key={`${item.id_producto}-${item.id_lote}-${item.id_ubicacion}`}>
                    <TableCell className="font-medium">{item.sucursal}</TableCell>
                    <TableCell>{item.producto}</TableCell>
                    <TableCell className="text-xs">{item.lote}</TableCell>
                    <TableCell>{Number(item.cantidad_actual).toFixed(0)}</TableCell>
                    <TableCell>{Number(item.stock_minimo_configurado).toFixed(0)}</TableCell>
                    <TableCell>
                      <Badge variant={item.prioridad_alerta === "ALTA" ? "destructive" : "default"}>
                        {item.prioridad_alerta}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(!stockBajo || stockBajo.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay productos bajo stock mínimo
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabla de Próximas Caducidades */}
        <Card>
          <CardHeader>
            <CardTitle>Próximas Caducidades</CardTitle>
            <CardDescription>Lotes que vencen en los próximos 60 días</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Caduca</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caducidades?.slice(0, 5).map((item: any) => (
                  <TableRow key={`${item.id_producto}-${item.numero_lote}`}>
                    <TableCell className="font-medium">{item.nombre_producto}</TableCell>
                    <TableCell className="text-xs">{item.numero_lote}</TableCell>
                    <TableCell>
                      {format(new Date(item.fecha_caducidad), "dd/MMM/yy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.dias_hasta_caducar < 30 ? "destructive" : "default"}>
                        {item.dias_hasta_caducar}d
                      </Badge>
                    </TableCell>
                    <TableCell>{Number(item.cantidad_en_riesgo).toFixed(0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(!caducidades || caducidades.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay lotes próximos a caducar
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <a href="/inventario/productos">Ver Productos</a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/inventario/movimientos">Historial de Movimientos</a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/inventario/reportes">Reportes de Rotación</a>
        </Button>
      </div>
    </div>
  );
};

export default Inventario;