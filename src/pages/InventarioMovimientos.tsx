import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowDownToLine, ArrowUpFromLine, X, TrendingDown, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const tiposMovimiento = [
  { value: "entrada_compra", label: "Entrada por Compra", icon: ArrowDownToLine },
  { value: "salida_consumo", label: "Salida por Consumo", icon: ArrowUpFromLine },
  { value: "salida_venta", label: "Salida por Venta", icon: ArrowUpFromLine },
  { value: "merma_caducado", label: "Merma/Caducado", icon: X },
  { value: "transferencia", label: "Transferencia", icon: RefreshCw },
];

const InventarioMovimientos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  // Form state para nuevo movimiento
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    tipo_movimiento: "",
    id_producto: "",
    id_lote: "",
    id_origen: "",
    id_destino: "",
    cantidad: "",
    costo_unitario_mxn: "",
    nota: "",
    // Para crear lote nuevo en entrada_compra
    numero_lote_nuevo: "",
    fecha_caducidad_nuevo: "",
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

  // Fetch lotes del producto seleccionado
  const { data: lotes } = useQuery({
    queryKey: ["lotes-disponibles", nuevoMovimiento.id_producto],
    queryFn: async () => {
      if (!nuevoMovimiento.id_producto) return [];
      const { data, error } = await supabase
        .from("lotes_producto")
        .select("*")
        .eq("id_producto", parseInt(nuevoMovimiento.id_producto))
        .gte("fecha_caducidad", new Date().toISOString().split("T")[0])
        .order("fecha_caducidad");
      if (error) throw error;
      return data;
    },
    enabled: !!nuevoMovimiento.id_producto,
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

  // Fetch movimientos
  const { data: movimientos, isLoading } = useQuery({
    queryKey: ["movimientos", filtroTipo, filtroFechaDesde, filtroFechaHasta],
    queryFn: async () => {
      let query = supabase
        .from("movimientos_inventario")
        .select(`
          *,
          productos!inner(nombre),
          lotes_producto!inner(numero_lote),
          origen:ubicaciones!movimientos_inventario_id_origen_fkey(nombre_ubicacion),
          destino:ubicaciones!movimientos_inventario_id_destino_fkey(nombre_ubicacion)
        `)
        .order("timestamp_movimiento", { ascending: false });

      if (filtroTipo !== "todos") {
        query = query.eq("tipo_movimiento", filtroTipo as any);
      }

      if (filtroFechaDesde) {
        query = query.gte("timestamp_movimiento", filtroFechaDesde);
      }

      if (filtroFechaHasta) {
        query = query.lte("timestamp_movimiento", filtroFechaHasta + "T23:59:59");
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Mutation para crear movimiento
  const createMovimientoMutation = useMutation({
    mutationFn: async (data: any) => {
      let loteId = data.id_lote;

      // Si es entrada_compra y se creará lote nuevo
      if (data.tipo_movimiento === "entrada_compra" && data.numero_lote_nuevo) {
        const { data: nuevoLote, error: errorLote } = await supabase
          .from("lotes_producto")
          .insert([{
            id_producto: data.id_producto,
            numero_lote: data.numero_lote_nuevo,
            fecha_caducidad: data.fecha_caducidad_nuevo,
            costo_unitario_mxn: data.costo_unitario_mxn,
          }])
          .select()
          .single();

        if (errorLote) throw errorLote;
        loteId = nuevoLote.id;
      }

      const { data: result, error } = await supabase
        .from("movimientos_inventario")
        .insert([{
          tipo_movimiento: data.tipo_movimiento as any,
          id_producto: parseInt(data.id_producto),
          id_lote: loteId,
          id_origen: data.id_origen ? parseInt(data.id_origen) : null,
          id_destino: data.id_destino ? parseInt(data.id_destino) : null,
          cantidad: parseFloat(data.cantidad),
          costo_unitario_mxn: parseFloat(data.costo_unitario_mxn),
          nota: data.nota,
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({ title: "Movimiento registrado exitosamente" });
      queryClient.invalidateQueries({ queryKey: ["movimientos"] });
      queryClient.invalidateQueries({ queryKey: ["stock-actual"] });
      setOpenDialog(false);
      setNuevoMovimiento({
        tipo_movimiento: "",
        id_producto: "",
        id_lote: "",
        id_origen: "",
        id_destino: "",
        cantidad: "",
        costo_unitario_mxn: "",
        nota: "",
        numero_lote_nuevo: "",
        fecha_caducidad_nuevo: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al registrar movimiento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCrearMovimiento = () => {
    // Validaciones básicas
    if (!nuevoMovimiento.tipo_movimiento || !nuevoMovimiento.id_producto || !nuevoMovimiento.cantidad) {
      toast({
        title: "Campos requeridos",
        description: "Complete todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    // Validar lote
    const esEntradaCompra = nuevoMovimiento.tipo_movimiento === "entrada_compra";
    if (!esEntradaCompra && !nuevoMovimiento.id_lote) {
      toast({
        title: "Lote requerido",
        description: "Seleccione un lote existente",
        variant: "destructive",
      });
      return;
    }

    // Validar costo en entrada_compra
    if (esEntradaCompra && !nuevoMovimiento.costo_unitario_mxn) {
      toast({
        title: "Costo requerido",
        description: "Ingrese el costo unitario en MXN",
        variant: "destructive",
      });
      return;
    }

    // Validar origen/destino según tipo
    if (esEntradaCompra && !nuevoMovimiento.id_destino) {
      toast({
        title: "Destino requerido",
        description: "Seleccione la ubicación de destino",
        variant: "destructive",
      });
      return;
    }

    if (["salida_consumo", "salida_venta", "merma_caducado"].includes(nuevoMovimiento.tipo_movimiento) && !nuevoMovimiento.id_origen) {
      toast({
        title: "Origen requerido",
        description: "Seleccione la ubicación de origen",
        variant: "destructive",
      });
      return;
    }

    if (nuevoMovimiento.tipo_movimiento === "transferencia" && (!nuevoMovimiento.id_origen || !nuevoMovimiento.id_destino)) {
      toast({
        title: "Origen y destino requeridos",
        description: "Seleccione origen y destino para transferencia",
        variant: "destructive",
      });
      return;
    }

    createMovimientoMutation.mutate(nuevoMovimiento);
  };

  const getTipoMovimientoLabel = (tipo: string) => {
    return tiposMovimiento.find(t => t.value === tipo)?.label || tipo;
  };

  const getTipoMovimientoIcon = (tipo: string) => {
    const Icon = tiposMovimiento.find(t => t.value === tipo)?.icon || TrendingDown;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Movimientos de Inventario</h1>
          <p className="text-muted-foreground">Historial y registro de movimientos</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Movimiento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Movimiento</DialogTitle>
              <DialogDescription>
                Complete la información del movimiento de inventario
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Movimiento *</Label>
                <Select
                  value={nuevoMovimiento.tipo_movimiento}
                  onValueChange={(value) => setNuevoMovimiento({ ...nuevoMovimiento, tipo_movimiento: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione tipo de movimiento" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposMovimiento.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        <div className="flex items-center gap-2">
                          <tipo.icon className="h-4 w-4" />
                          {tipo.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Producto *</Label>
                  <Select
                    value={nuevoMovimiento.id_producto}
                    onValueChange={(value) => setNuevoMovimiento({ ...nuevoMovimiento, id_producto: value, id_lote: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {productos?.map((prod) => (
                        <SelectItem key={prod.id} value={prod.id.toString()}>
                          {prod.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {nuevoMovimiento.tipo_movimiento !== "entrada_compra" && (
                  <div className="space-y-2">
                    <Label>Lote *</Label>
                    <Select
                      value={nuevoMovimiento.id_lote}
                      onValueChange={(value) => setNuevoMovimiento({ ...nuevoMovimiento, id_lote: value })}
                      disabled={!nuevoMovimiento.id_producto}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione lote" />
                      </SelectTrigger>
                      <SelectContent>
                        {lotes?.map((lote) => (
                          <SelectItem key={lote.id} value={lote.id.toString()}>
                            {lote.numero_lote} (Cad: {format(new Date(lote.fecha_caducidad), "dd/MM/yy", { locale: es })})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Campos para crear lote nuevo en entrada_compra */}
              {nuevoMovimiento.tipo_movimiento === "entrada_compra" && (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <Label>Número de Lote Nuevo *</Label>
                    <Input
                      value={nuevoMovimiento.numero_lote_nuevo}
                      onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, numero_lote_nuevo: e.target.value })}
                      placeholder="Ej: LOT-2025-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Caducidad *</Label>
                    <Input
                      type="date"
                      value={nuevoMovimiento.fecha_caducidad_nuevo}
                      onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, fecha_caducidad_nuevo: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {["salida_consumo", "salida_venta", "merma_caducado", "transferencia"].includes(nuevoMovimiento.tipo_movimiento) && (
                  <div className="space-y-2">
                    <Label>Ubicación Origen *</Label>
                    <Select
                      value={nuevoMovimiento.id_origen}
                      onValueChange={(value) => setNuevoMovimiento({ ...nuevoMovimiento, id_origen: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione origen" />
                      </SelectTrigger>
                      <SelectContent>
                        {ubicaciones?.map((ub) => (
                          <SelectItem key={ub.id} value={ub.id.toString()}>
                            {ub.nombre_ubicacion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {["entrada_compra", "transferencia"].includes(nuevoMovimiento.tipo_movimiento) && (
                  <div className="space-y-2">
                    <Label>Ubicación Destino *</Label>
                    <Select
                      value={nuevoMovimiento.id_destino}
                      onValueChange={(value) => setNuevoMovimiento({ ...nuevoMovimiento, id_destino: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {ubicaciones?.map((ub) => (
                          <SelectItem key={ub.id} value={ub.id.toString()}>
                            {ub.nombre_ubicacion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cantidad *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={nuevoMovimiento.cantidad}
                    onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, cantidad: e.target.value })}
                    placeholder="Ej: 10"
                  />
                </div>
                {nuevoMovimiento.tipo_movimiento === "entrada_compra" && (
                  <div className="space-y-2">
                    <Label>Costo Unitario MXN *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={nuevoMovimiento.costo_unitario_mxn}
                      onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, costo_unitario_mxn: e.target.value })}
                      placeholder="Ej: 1500.00"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Nota / Comentario</Label>
                <Textarea
                  value={nuevoMovimiento.nota}
                  onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, nota: e.target.value })}
                  placeholder="Información adicional del movimiento..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCrearMovimiento} disabled={createMovimientoMutation.isPending}>
                  {createMovimientoMutation.isPending ? "Registrando..." : "Registrar Movimiento"}
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo de Movimiento</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  {tiposMovimiento.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
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

      {/* Tabla de movimientos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
          <CardDescription>
            Últimos 100 movimientos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos?.map((mov: any) => (
                <TableRow key={mov.id}>
                  <TableCell className="text-sm">
                    {format(new Date(mov.timestamp_movimiento), "dd/MM/yy HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      {getTipoMovimientoIcon(mov.tipo_movimiento)}
                      <span className="text-xs">{getTipoMovimientoLabel(mov.tipo_movimiento)}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{mov.productos?.nombre}</TableCell>
                  <TableCell className="font-mono text-xs">{mov.lotes_producto?.numero_lote}</TableCell>
                  <TableCell className="text-sm">{mov.origen?.nombre_ubicacion || "-"}</TableCell>
                  <TableCell className="text-sm">{mov.destino?.nombre_ubicacion || "-"}</TableCell>
                  <TableCell className="font-semibold">{Number(mov.cantidad).toFixed(0)}</TableCell>
                  <TableCell className="text-sm">
                    ${Number(mov.costo_unitario_mxn).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {mov.nota || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isLoading && <p className="text-center py-4">Cargando movimientos...</p>}
          {!isLoading && (!movimientos || movimientos.length === 0) && (
            <p className="text-center py-4 text-muted-foreground">
              No se encontraron movimientos
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventarioMovimientos;