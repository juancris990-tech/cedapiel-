import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

const InventarioReportes = () => {
  const [filtroUbicacion, setFiltroUbicacion] = useState<string>("todos");
  const [filtroProducto, setFiltroProducto] = useState<string>("todos");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Fetch ubicaciones
  const { data: ubicaciones } = useQuery({
    queryKey: ["ubicaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ubicaciones")
        .select("*")
        .order("nombre_ubicacion");
      if (error) throw error;
      return data;
    },
  });

  // Fetch productos
  const { data: productos } = useQuery({
    queryKey: ["productos-activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("esta_activo", true)
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  // Fetch movimientos para calcular rotación
  const { data: movimientos } = useQuery({
    queryKey: ["movimientos-rotacion", filtroUbicacion, filtroProducto, filtroFechaDesde, filtroFechaHasta],
    queryFn: async () => {
      let query = supabase
        .from("movimientos_inventario")
        .select(`
          *,
          productos!inner(nombre, id),
          lotes_producto!inner(costo_unitario_mxn)
        `)
        .in("tipo_movimiento", ["salida_consumo", "salida_venta"])
        .gte("timestamp_movimiento", new Date(filtroFechaDesde).toISOString())
        .lte("timestamp_movimiento", new Date(filtroFechaHasta + "T23:59:59").toISOString());

      if (filtroUbicacion !== "todos") {
        query = query.eq("id_origen", parseInt(filtroUbicacion));
      }

      if (filtroProducto !== "todos") {
        query = query.eq("id_producto", parseInt(filtroProducto));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch stock actual
  const { data: stockActual } = useQuery({
    queryKey: ["stock-actual-rotacion", filtroUbicacion, filtroProducto],
    queryFn: async () => {
      let query = supabase
        .from("stock_actual")
        .select(`
          *,
          productos!inner(nombre, id),
          lotes_producto!inner(costo_unitario_mxn),
          ubicaciones!inner(nombre_ubicacion)
        `);

      if (filtroUbicacion !== "todos") {
        query = query.eq("id_ubicacion", parseInt(filtroUbicacion));
      }

      if (filtroProducto !== "todos") {
        query = query.eq("id_producto", parseInt(filtroProducto));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Calcular métricas de rotación por producto
  const calcularRotacion = () => {
    if (!movimientos || !stockActual) return [];

    // Agrupar movimientos por producto
    const movimientosPorProducto = movimientos.reduce((acc: any, mov: any) => {
      const idProducto = mov.id_producto;
      if (!acc[idProducto]) {
        acc[idProducto] = {
          id_producto: idProducto,
          nombre_producto: mov.productos?.nombre,
          cantidad_consumida: 0,
          costo_promedio: 0,
          registros_costo: [],
        };
      }
      acc[idProducto].cantidad_consumida += Number(mov.cantidad);
      acc[idProducto].registros_costo.push(Number(mov.lotes_producto?.costo_unitario_mxn || 0));
      return acc;
    }, {});

    // Calcular stock actual y costo promedio por producto
    const stockPorProducto = stockActual.reduce((acc: any, stock: any) => {
      const idProducto = stock.id_producto;
      if (!acc[idProducto]) {
        acc[idProducto] = {
          stock_actual: 0,
          costo_promedio: 0,
          registros_costo: [],
        };
      }
      acc[idProducto].stock_actual += Number(stock.cantidad_actual);
      acc[idProducto].registros_costo.push(Number(stock.lotes_producto?.costo_unitario_mxn || 0));
      return acc;
    }, {});

    // Combinar datos
    const productosUnicos = Object.keys({ ...movimientosPorProducto, ...stockPorProducto });
    
    return productosUnicos.map((idProducto) => {
      const movData = movimientosPorProducto[idProducto] || {};
      const stockData = stockPorProducto[idProducto] || {};
      
      const cantidadConsumida = movData.cantidad_consumida || 0;
      const stockActual = stockData.stock_actual || 0;
      
      // Calcular días del período
      const dias = Math.ceil(
        (new Date(filtroFechaHasta).getTime() - new Date(filtroFechaDesde).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Rotación mensual (normalizada a 30 días)
      const rotacionMensual = dias > 0 ? (cantidadConsumida / dias) * 30 : 0;
      
      // Días de inventario restante
      const consumoDiario = dias > 0 ? cantidadConsumida / dias : 0;
      const diasInventarioRestante = consumoDiario > 0 ? stockActual / consumoDiario : 9999;
      
      // Costo promedio ponderado
      const todosLosCostos = [...(movData.registros_costo || []), ...(stockData.registros_costo || [])];
      const costoPromedio = todosLosCostos.length > 0
        ? todosLosCostos.reduce((a, b) => a + b, 0) / todosLosCostos.length
        : 0;
      
      // Alerta de rotación
      let alertaRotacion = "NORMAL";
      if (rotacionMensual > 100) {
        alertaRotacion = "ALTA";
      } else if (rotacionMensual < 10) {
        alertaRotacion = "LENTA";
      }
      
      return {
        id_producto: idProducto,
        nombre_producto: movData.nombre_producto || productos?.find((p: any) => p.id.toString() === idProducto)?.nombre || `Producto ${idProducto}`,
        rotacion_mensual_unidades: rotacionMensual,
        dias_inventario_restante: diasInventarioRestante,
        costo_promedio_unitario_mxn: costoPromedio,
        alerta_rotacion: alertaRotacion,
        stock_actual: stockActual,
        cantidad_consumida: cantidadConsumida,
      };
    }).sort((a, b) => b.rotacion_mensual_unidades - a.rotacion_mensual_unidades);
  };

  const datosRotacion = calcularRotacion();

  // Preparar datos para el gráfico
  const datosGrafico = datosRotacion.slice(0, 10).map((item) => ({
    nombre: item.nombre_producto.length > 20 ? item.nombre_producto.substring(0, 20) + "..." : item.nombre_producto,
    rotacion: Number(item.rotacion_mensual_unidades.toFixed(2)),
  }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Reporte de Rotación de Inventario</h1>
        <p className="text-muted-foreground">Análisis de consumo y días de inventario disponible</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros del Reporte</CardTitle>
          <CardDescription>Personalice el período y ubicación del análisis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Select value={filtroUbicacion} onValueChange={setFiltroUbicacion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las ubicaciones</SelectItem>
                  {ubicaciones?.map((ub) => (
                    <SelectItem key={ub.id} value={ub.id.toString()}>
                      {ub.nombre_ubicacion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select value={filtroProducto} onValueChange={setFiltroProducto}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los productos</SelectItem>
                  {productos?.map((prod) => (
                    <SelectItem key={prod.id} value={prod.id.toString()}>
                      {prod.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={filtroFechaDesde}
                onChange={(e) => setFiltroFechaDesde(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={filtroFechaHasta}
                onChange={(e) => setFiltroFechaHasta(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de rotación */}
      <Card>
        <CardHeader>
          <CardTitle>Rotación Mensual por Producto (Top 10)</CardTitle>
          <CardDescription>Unidades consumidas normalizadas a 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={datosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="rotacion" fill="hsl(var(--primary))" name="Rotación Mensual (unidades)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla de datos */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis Detallado de Rotación</CardTitle>
          <CardDescription>{datosRotacion.length} productos encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Rotación Mensual</TableHead>
                <TableHead>Stock Actual</TableHead>
                <TableHead>Días Inventario</TableHead>
                <TableHead>Costo Promedio</TableHead>
                <TableHead>Alerta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datosRotacion.map((item) => (
                <TableRow key={item.id_producto}>
                  <TableCell className="font-medium">{item.nombre_producto}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{item.rotacion_mensual_unidades.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">unidades</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.stock_actual.toFixed(0)}</TableCell>
                  <TableCell>
                    {item.dias_inventario_restante === 9999 ? (
                      <span className="text-muted-foreground">Sin consumo</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        {item.dias_inventario_restante < 30 ? (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-success" />
                        )}
                        <span className={item.dias_inventario_restante < 30 ? "text-destructive font-semibold" : ""}>
                          {item.dias_inventario_restante.toFixed(0)} días
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    ${item.costo_promedio_unitario_mxn.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.alerta_rotacion === "ALTA"
                          ? "default"
                          : item.alerta_rotacion === "LENTA"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {item.alerta_rotacion}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {datosRotacion.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">
              No hay datos para mostrar con los filtros seleccionados
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventarioReportes;