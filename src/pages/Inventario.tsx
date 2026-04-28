import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, DollarSign, Package, Plus, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Inventario = () => {
  const [quickFilter, setQuickFilter] = useState<"todos" | "stock_bajo" | "sin_stock">("todos");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: productos, isLoading } = useQuery({
    queryKey: ["inventario-productos-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id, nombre, categoria")
        .eq("esta_activo", true)
        .order("nombre", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stockRows } = useQuery({
    queryKey: ["inventario-stock-rows-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_actual")
        .select(`
          id_producto,
          cantidad_actual,
          stock_minimo_configurado,
          stock_maximo_configurado,
          lotes_producto(costo_unitario_mxn)
        `);
      if (error) throw error;
      return data || [];
    },
  });

  const productosConMetricas = useMemo(() => {
    const agrupadoPorProducto = (stockRows || []).reduce((acc: Record<number, any>, row: any) => {
      const idProducto = Number(row.id_producto);
      if (!acc[idProducto]) {
        acc[idProducto] = {
          stockActual: 0,
          stockMinimo: 0,
          stockMaximo: 0,
          precios: [] as number[],
        };
      }

      const cantidad = Number(row.cantidad_actual || 0);
      const minimo = Number(row.stock_minimo_configurado || 0);
      const maximo = Number(row.stock_maximo_configurado || 0);
      const costo = Number(row.lotes_producto?.costo_unitario_mxn || 0);

      acc[idProducto].stockActual += cantidad;
      acc[idProducto].stockMinimo += minimo;
      acc[idProducto].stockMaximo += maximo;

      if (costo > 0) {
        acc[idProducto].precios.push(costo);
      }

      return acc;
    }, {});

    return (productos || []).map((producto: any) => {
      const metrica = agrupadoPorProducto[producto.id] || {
        stockActual: 0,
        stockMinimo: 0,
        stockMaximo: 0,
        precios: [],
      };

      const precioUnitario = metrica.precios.length
        ? metrica.precios.reduce((sum: number, p: number) => sum + p, 0) / metrica.precios.length
        : 0;

      const referenciaProgreso = Math.max(metrica.stockMaximo, metrica.stockMinimo * 2, 1);
      const progreso = Math.min(100, Math.max(0, (metrica.stockActual / referenciaProgreso) * 100));
      const stockBajo = metrica.stockActual < metrica.stockMinimo;
      const sinStock = metrica.stockActual <= 0;

      return {
        ...producto,
        stockActual: metrica.stockActual,
        stockMinimo: metrica.stockMinimo,
        stockMaximo: metrica.stockMaximo,
        precioUnitario,
        valorInventario: precioUnitario * metrica.stockActual,
        stockBajo,
        sinStock,
        progreso,
      };
    });
  }, [productos, stockRows]);

  const productosFiltrados = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return productosConMetricas.filter((producto) => {
      const matchNombre =
        !search || String(producto.nombre || "").toLowerCase().includes(search);

      const matchFiltroRapido =
        quickFilter === "todos"
          ? true
          : quickFilter === "stock_bajo"
            ? producto.stockBajo
            : producto.sinStock;

      return matchNombre && matchFiltroRapido;
    });
  }, [productosConMetricas, quickFilter, searchTerm]);

  const totalProductos = productosConMetricas.length;
  const productosStockBajo = productosConMetricas.filter((p) => p.stockBajo).length;
  const valorInventarioTotal = productosConMetricas.reduce((sum, p) => sum + p.valorInventario, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventario</h1>
          <p className="text-muted-foreground">Resumen de stock y valor del inventario en tiempo real</p>
        </div>
        <Button asChild size="lg" className="md:min-w-[220px]">
          <a href="/inventario/productos">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Producto
          </a>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total productos</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProductos}</div>
            <p className="text-xs text-muted-foreground">Productos activos en inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos con stock bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productosStockBajo}</div>
            <p className="text-xs text-muted-foreground">Con stock actual menor al mínimo configurado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor total del inventario</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${valorInventarioTotal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Suma de precio unitario × stock actual</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Productos</CardTitle>
              <CardDescription>Visualiza stock, precio y nivel de inventario por producto</CardDescription>
            </div>
            <div className="relative w-full md:w-[320px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={quickFilter === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickFilter("todos")}
            >
              Todos
            </Button>
            <Button
              variant={quickFilter === "stock_bajo" ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickFilter("stock_bajo")}
            >
              Stock bajo
            </Button>
            <Button
              variant={quickFilter === "sin_stock" ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickFilter("sin_stock")}
            >
              Sin stock
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Stock actual</TableHead>
                <TableHead>Precio unitario</TableHead>
                <TableHead>Nivel de stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productosFiltrados.map((producto) => (
                <TableRow key={producto.id}>
                  <TableCell className="font-medium">{producto.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {producto.categoria
                        ? `${producto.categoria}`.charAt(0).toUpperCase() + `${producto.categoria}`.slice(1)
                        : "Sin categoría"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={producto.stockBajo ? "font-semibold text-destructive" : "font-semibold"}>
                      {Number(producto.stockActual).toFixed(0)}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      min. {Number(producto.stockMinimo).toFixed(0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    ${Number(producto.precioUnitario || 0).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="w-[240px]">
                    <div className="space-y-1">
                      <Progress value={producto.progreso} className="h-2" />
                      <p className="text-xs text-muted-foreground">{producto.progreso.toFixed(0)}%</p>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {isLoading && <p className="py-4 text-center text-sm text-muted-foreground">Cargando inventario...</p>}

          {!isLoading && productosFiltrados.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No se encontraron productos para el filtro actual.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventario;
