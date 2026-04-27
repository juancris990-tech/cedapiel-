import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Package, Calendar, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const categorias = [
  "toxina", "relleno", "anestesia", "guantes", "mascarillas",
  "jeringas", "suturas", "vendas", "antisepticos", "cremas", "otros"
];

const InventarioProductos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("todos");
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<any>(null);

  // Nuevo producto form state
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    sku: "",
    descripcion: "",
    categoria: "",
    proveedor: "",
    unidad_medida: "unidades",
    cantidad_inicial: "",
    precio_unitario: "",
  });

  // Editar producto form state
  const [editProducto, setEditProducto] = useState({
    nombre: "",
    sku: "",
    descripcion: "",
    categoria: "",
    proveedor: "",
    unidad_medida: "",
    cantidad_ajuste: "",
    precio_unitario: "",
  });

  // Fetch productos
  const { data: productos, isLoading } = useQuery({
    queryKey: ["productos", searchTerm, selectedCategoria],
    queryFn: async () => {
      let query = (supabase as any)
        .from("productos")
        .select("*")
        .eq("esta_activo", true)
        .order("nombre", { ascending: true });

      if (searchTerm) {
        query = query.ilike("nombre", `%${searchTerm}%`);
      }

      if (selectedCategoria !== "todos") {
        query = query.eq("categoria", selectedCategoria as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Obtener stock total para cada producto
      if (!data || data.length === 0) return [];
      
      const productosConStock = await Promise.all(
        data.map(async (producto: any) => {
          const { data: stockData } = await (supabase as any)
            .from("stock_actual")
            .select("cantidad_actual")
            .eq("id_producto", producto.id);
          
          const stockTotal = stockData?.reduce(
            (sum: number, stock: any) => sum + (parseFloat(stock.cantidad_actual) || 0),
            0
          ) || 0;
          
          return {
            ...producto,
            stock_total: stockTotal,
          };
        })
      );
      
      return productosConStock;
    },
  });

  // Fetch lotes del producto seleccionado
  const { data: lotes } = useQuery({
    queryKey: ["lotes-producto", selectedProducto?.id],
    queryFn: async () => {
      if (!selectedProducto) return [];
      const { data, error } = await (supabase as any)
        .from("lotes_producto")
        .select(`
          *,
          stock_actual(
            id_ubicacion,
            cantidad_actual,
            stock_minimo_configurado,
            stock_maximo_configurado,
            ubicaciones(nombre_ubicacion)
          )
        `)
        .eq("id_producto", selectedProducto.id)
        .order("fecha_caducidad", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProducto,
  });

  // Fetch ubicaciones
  const { data: ubicaciones } = useQuery({
    queryKey: ["ubicaciones"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ubicaciones")
        .select("*")
        .order("nombre_ubicacion");
      if (error) throw error;
      return data;
    },
  });

  // Mutation para crear producto
  const createProductoMutation = useMutation({
    mutationFn: async (data: any) => {
      const { cantidad_inicial, precio_unitario, ...productoData } = data;
      
      // Crear el producto
      const { data: result, error } = await (supabase as any)
        .from("productos")
        .insert([productoData])
        .select()
        .single();
      if (error) throw error;

      // Si hay cantidad inicial, crear lote y stock
      if (cantidad_inicial && parseFloat(cantidad_inicial) > 0 && ubicaciones && ubicaciones.length > 0) {
        // Crear lote
        const { data: lote, error: loteError } = await (supabase as any)
          .from("lotes_producto")
          .insert([{
            id_producto: result.id,
            numero_lote: `LOTE-${Date.now()}`,
            fecha_caducidad: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
            costo_unitario_mxn: parseFloat(precio_unitario) || 0,
          }])
          .select()
          .single();
        
        if (loteError) throw loteError;

        // Crear stock en la primera ubicación
        const { error: stockError } = await (supabase as any)
          .from("stock_actual")
          .insert([{
            id_lote: lote.id,
            id_producto: result.id,
            id_ubicacion: ubicaciones[0].id,
            cantidad_actual: parseFloat(cantidad_inicial),
            stock_minimo_configurado: 0,
            stock_maximo_configurado: 1000,
          }]);
        
        if (stockError) throw stockError;
      }

      return result;
    },
    onSuccess: () => {
      toast({ title: "Producto creado exitosamente" });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["lotes-producto"] });
      setOpenDialog(false);
      setNuevoProducto({
        nombre: "",
        sku: "",
        descripcion: "",
        categoria: "",
        proveedor: "",
        unidad_medida: "unidades",
        cantidad_inicial: "",
        precio_unitario: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear producto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para actualizar producto
  const updateProductoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const { cantidad_ajuste, precio_unitario, ...productoData } = data;
      
      console.log("Actualizando producto:", id, "con cantidad:", cantidad_ajuste);
      
      // Actualizar el producto
      const { data: result, error } = await (supabase as any)
        .from("productos")
        .update(productoData)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error("Error actualizando producto:", error);
        throw error;
      }

      // Si hay cantidad de ajuste, crear/actualizar lote y stock
      if (cantidad_ajuste && parseFloat(cantidad_ajuste) > 0) {
        console.log("Creando lote con cantidad:", cantidad_ajuste);
        
        if (!ubicaciones || ubicaciones.length === 0) {
          throw new Error("No hay ubicaciones disponibles");
        }
        
        // Crear lote
        const { data: lote, error: loteError } = await (supabase as any)
          .from("lotes_producto")
          .insert([{
            id_producto: id,
            numero_lote: `AJUSTE-${Date.now()}`,
            fecha_caducidad: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
            costo_unitario_mxn: parseFloat(precio_unitario) || 0,
          }])
          .select()
          .single();
        
        if (loteError) {
          console.error("Error creando lote:", loteError);
          throw loteError;
        }

        console.log("Lote creado:", lote);

        // Crear stock en la primera ubicación
        const { data: stockCreated, error: stockError } = await (supabase as any)
          .from("stock_actual")
          .insert([{
            id_lote: lote.id,
            id_producto: id,
            id_ubicacion: ubicaciones[0].id,
            cantidad_actual: parseFloat(cantidad_ajuste),
            stock_minimo_configurado: 0,
            stock_maximo_configurado: 1000,
          }])
          .select();
        
        if (stockError) {
          console.error("Error creando stock:", stockError);
          throw stockError;
        }
        
        console.log("Stock creado:", stockCreated);
      }

      return result;
    },
    onSuccess: () => {
      toast({ title: "Producto actualizado exitosamente" });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["lotes-producto"] });
      setOpenEditDialog(false);
      setSelectedProducto(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar producto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCrearProducto = () => {
    if (!nuevoProducto.nombre || !nuevoProducto.categoria) {
      toast({
        title: "Campos requeridos",
        description: "Nombre y categoría son obligatorios",
        variant: "destructive",
      });
      return;
    }
    createProductoMutation.mutate(nuevoProducto);
  };

  const handleEditarProducto = () => {
    if (!editProducto.nombre || !editProducto.categoria) {
      toast({
        title: "Campos requeridos",
        description: "Nombre y categoría son obligatorios",
        variant: "destructive",
      });
      return;
    }
    updateProductoMutation.mutate({
      id: selectedProducto.id,
      data: editProducto,
    });
  };

  const openEditMode = (producto: any) => {
    setEditProducto({
      nombre: producto.nombre,
      sku: producto.sku || "",
      descripcion: producto.descripcion || "",
      categoria: producto.categoria,
      proveedor: producto.proveedor || "",
      unidad_medida: producto.unidad_medida,
      cantidad_ajuste: "",
      precio_unitario: "",
    });
    setOpenEditDialog(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Maestro de Productos</h1>
          <p className="text-muted-foreground">Gestión de productos e inventario</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Producto</DialogTitle>
              <DialogDescription>
                Ingrese la información del nuevo producto
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Producto *</Label>
                <Input
                  id="nombre"
                  value={nuevoProducto.nombre}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                  placeholder="Ej: Botox 100U"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Código del Producto</Label>
                <Input
                  id="sku"
                  value={nuevoProducto.sku}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, sku: e.target.value })}
                  placeholder="Ej: BOT-001234 (se genera automáticamente si se deja vacío)"
                />
                <p className="text-xs text-muted-foreground">
                  Deja vacío para generar automáticamente (formato: CAT-000001)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría *</Label>
                <Select
                  value={nuevoProducto.categoria}
                  onValueChange={(value) => setNuevoProducto({ ...nuevoProducto, categoria: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proveedor">Proveedor</Label>
                  <Input
                    id="proveedor"
                    value={nuevoProducto.proveedor}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, proveedor: e.target.value })}
                    placeholder="Nombre del proveedor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unidad">Unidad de Medida</Label>
                  <Input
                    id="unidad"
                    value={nuevoProducto.unidad_medida}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, unidad_medida: e.target.value })}
                    placeholder="Ej: ml, unidades, cajas"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={nuevoProducto.descripcion}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })}
                  placeholder="Descripción del producto..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cantidad">Cantidad Inicial (opcional)</Label>
                  <Input
                    id="cantidad"
                    type="number"
                    min="0"
                    step="1"
                    value={nuevoProducto.cantidad_inicial}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, cantidad_inicial: e.target.value })}
                    placeholder="Ej: 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Si ingresas una cantidad, se creará un lote automático
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio Unitario (MXN) *</Label>
                  <Input
                    id="precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={nuevoProducto.precio_unitario}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio_unitario: e.target.value })}
                    placeholder="Ej: 100.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Precio de venta del producto
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCrearProducto} disabled={createProductoMutation.isPending}>
                  {createProductoMutation.isPending ? "Creando..." : "Crear Producto"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Buscar por nombre</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las categorías</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de productos */}
      <Card>
        <CardHeader>
          <CardTitle>Productos Registrados</CardTitle>
          <CardDescription>
            {productos?.length || 0} productos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos?.map((producto) => (
                <TableRow key={producto.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {producto.sku || "-"}
                  </TableCell>
                  <TableCell className="font-medium">{producto.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {producto.categoria.charAt(0).toUpperCase() + producto.categoria.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{producto.proveedor || "-"}</TableCell>
                  <TableCell>{producto.unidad_medida}</TableCell>
                  <TableCell className="font-medium">
                    {producto.stock_total || 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant={producto.esta_activo ? "default" : "secondary"}>
                      {producto.esta_activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProducto(producto)}
                    >
                      Ver Detalle
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isLoading && <p className="text-center py-4">Cargando productos...</p>}
          {!isLoading && (!productos || productos.length === 0) && (
            <p className="text-center py-4 text-muted-foreground">
              No se encontraron productos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalle del producto */}
      <Dialog open={!!selectedProducto && !openEditDialog} onOpenChange={() => setSelectedProducto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle>{selectedProducto?.nombre}</DialogTitle>
                <DialogDescription>{selectedProducto?.descripcion}</DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditMode(selectedProducto)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">SKU:</span>
                <p className="font-mono font-medium">{selectedProducto?.sku || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Categoría:</span>
                <p className="font-medium">{selectedProducto?.categoria}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Proveedor:</span>
                <p className="font-medium">{selectedProducto?.proveedor || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Unidad:</span>
                <p className="font-medium">{selectedProducto?.unidad_medida}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Lotes y Stock Disponible
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Caducidad</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Mín/Máx</TableHead>
                    <TableHead>Costo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotes?.flatMap((lote: any) => 
                    lote.stock_actual?.map((stock: any) => (
                      <TableRow key={`${lote.id}-${stock.id_ubicacion}`}>
                        <TableCell className="font-mono text-xs">{lote.numero_lote}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(lote.fecha_caducidad), "dd/MM/yy", { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell>{stock.ubicaciones?.nombre_ubicacion}</TableCell>
                        <TableCell className="font-semibold">
                          {Number(stock.cantidad_actual).toFixed(0)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {Number(stock.stock_minimo_configurado).toFixed(0)} / {Number(stock.stock_maximo_configurado).toFixed(0)}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${Number(lote.costo_unitario_mxn).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {(!lotes || lotes.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay lotes registrados para este producto
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de editar producto */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
            <DialogDescription>
              Modifique la información del producto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nombre">Nombre del Producto *</Label>
              <Input
                id="edit-nombre"
                value={editProducto.nombre}
                onChange={(e) => setEditProducto({ ...editProducto, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU / Código del Producto</Label>
              <Input
                id="edit-sku"
                value={editProducto.sku}
                onChange={(e) => setEditProducto({ ...editProducto, sku: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-categoria">Categoría *</Label>
              <Select
                value={editProducto.categoria}
                onValueChange={(value) => setEditProducto({ ...editProducto, categoria: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-proveedor">Proveedor</Label>
                <Input
                  id="edit-proveedor"
                  value={editProducto.proveedor}
                  onChange={(e) => setEditProducto({ ...editProducto, proveedor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unidad">Unidad de Medida</Label>
                <Input
                  id="edit-unidad"
                  value={editProducto.unidad_medida}
                  onChange={(e) => setEditProducto({ ...editProducto, unidad_medida: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-descripcion">Descripción</Label>
              <Textarea
                id="edit-descripcion"
                value={editProducto.descripcion}
                onChange={(e) => setEditProducto({ ...editProducto, descripcion: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cantidad-ajuste">Agregar Cantidad (opcional)</Label>
                  <Input
                    id="cantidad-ajuste"
                    type="number"
                    min="0"
                    step="1"
                    value={editProducto.cantidad_ajuste}
                    onChange={(e) => setEditProducto({ ...editProducto, cantidad_ajuste: e.target.value })}
                    placeholder="Ej: 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Se agregará en un nuevo lote
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-precio">Precio Unitario (MXN) *</Label>
                  <Input
                    id="edit-precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editProducto.precio_unitario}
                    onChange={(e) => setEditProducto({ ...editProducto, precio_unitario: e.target.value })}
                    placeholder="Ej: 100.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Precio de venta del producto
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenEditDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEditarProducto} disabled={updateProductoMutation.isPending}>
                  {updateProductoMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default InventarioProductos;