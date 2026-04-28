import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ShoppingCart, Trash2, CreditCard, CheckCircle, XCircle, Gift, Pencil, Plus, Minus } from "lucide-react";
import { POSAnticipos } from "./POSAnticipos";
import { POSPagos } from "./POSPagos";
import { POSEditarItemDialog } from "./POSEditarItemDialog";

interface POSCarritoProps {
  idVenta: number;
  idCliente: number;
  refreshTrigger: number;
  onVentaCerrada: () => void;
}

export const POSCarrito = ({ idVenta, idCliente, refreshTrigger, onVentaCerrada }: POSCarritoProps) => {
  const queryClient = useQueryClient();
  const [anticipoAplicado, setAnticipoAplicado] = useState(0);
  const [aplicacionesAnticipo, setAplicacionesAnticipo] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ['venta-items', idVenta],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venta_items')
        .select('*')
        .eq('id_venta', idVenta)
        .order('id');
      
      if (error) throw error;
      
      // Fetch related services and products manually
      const itemsWithNames = await Promise.all((data || []).map(async (item: any) => {
        let nombre = 'Sin nombre';
        
        if (item.id_servicio) {
          const { data: servicio } = await supabase
            .from('servicios')
            .select('nombre')
            .eq('id', item.id_servicio)
            .maybeSingle();
          if (servicio) nombre = servicio.nombre;
        } else if (item.id_producto) {
          const { data: producto } = await supabase
            .from('productos')
            .select('nombre, precio_venta_mxn')
            .eq('id', item.id_producto)
            .maybeSingle();
          if (producto) nombre = producto.nombre;
        }
        
        return {
          ...item,
          servicios: item.id_servicio ? { nombre } : null,
          productos: item.id_producto ? { nombre } : null,
        };
      }));
      
      return itemsWithNames;
    },
  });

  const { data: resumen, refetch: refetchResumen } = useQuery({
    queryKey: ['pos-venta-resumen', idVenta],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/pos-venta/${idVenta}/resumen`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener resumen');
      }

      return await response.json();
    },
  });

  useEffect(() => {
    refetchItems();
    refetchResumen();
  }, [refreshTrigger, refetchItems, refetchResumen]);

  const eliminarItemMutation = useMutation({
    mutationFn: async (idItem: number) => {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/pos-item/${idItem}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar item');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Item eliminado");
      refetchItems();
      refetchResumen();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar item");
    },
  });

  const actualizarCantidadMutation = useMutation({
    mutationFn: async ({ idItem, cantidad }: { idItem: number; cantidad: number }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/pos-item/${idItem}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cantidad }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar cantidad');
      }

      return await response.json();
    },
    onSuccess: () => {
      refetchItems();
      refetchResumen();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar cantidad");
    },
  });

  const cerrarVentaMutation = useMutation({
    mutationFn: async () => {
      // Verificar estado actual de la venta antes de cerrar
      const { data: ventaActual, error: ventaError } = await supabase
        .from('ventas')
        .select('estado_venta')
        .eq('id', idVenta)
        .single();
      
      if (ventaError) throw ventaError;
      
      // Si ya está cerrada, no intentar cerrar de nuevo
      if (ventaActual.estado_venta === 'cerrada') {
        return { 
          success: true, 
          venta_id: idVenta, 
          message: 'La venta ya estaba cerrada',
          already_closed: true
        };
      }
      
      // Cerrar venta
      const { data, error } = await supabase.functions.invoke('pos-cerrar', {
        body: { id_venta: idVenta }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      let mensaje = "¡Venta cerrada exitosamente!";
      
      if (data.already_closed) {
        mensaje = "La venta ya estaba cerrada";
      } else if (data.saldo_a_favor) {
        mensaje = `¡Venta cerrada! Saldo a favor: ${formatCurrency(data.saldo_a_favor)}`;
      }
      
      toast.success(mensaje);
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      onVentaCerrada();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al cerrar venta");
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  const totalOriginal = resumen?.monto_original_mxn || 0;
  const totalDescuento = resumen?.monto_descuento_mxn || 0;
  const totalFinal = resumen?.monto_final_mxn || 0;
  const anticipoAplicadoServidor = resumen?.anticipo_aplicado_mxn || 0;
  const totalPagado = resumen?.total_pagado_mxn || 0;
  const aPagar = resumen?.a_pagar_mxn || 0;
  
  // Validar que todos los servicios tengan empleado asignado
  const serviciosSinEmpleado = items.filter((item: any) => 
    item.id_servicio && !item.id_empleado
  );
  
  const puedenCerrar = aPagar === 0 && items.length > 0 && serviciosSinEmpleado.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Carrito - Venta #{idVenta}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabla de Items */}
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            El carrito está vacío
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto / Servicio</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-right">Precio unitario</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => {
                  const nombre = item.servicios?.nombre || item.productos?.nombre || 'Sin nombre';
                  const tipo = item.id_servicio ? 'Servicio' : 'Producto';
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-semibold">{nombre}</div>
                          <Badge variant="outline" className="text-xs mt-1">{tipo}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={Number(item.cantidad) <= 1 || actualizarCantidadMutation.isPending}
                            onClick={() =>
                              actualizarCantidadMutation.mutate({
                                idItem: item.id,
                                cantidad: Math.max(1, Number(item.cantidad) - 1),
                              })
                            }
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="min-w-7 text-center font-semibold">{item.cantidad}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={actualizarCantidadMutation.isPending}
                            onClick={() =>
                              actualizarCantidadMutation.mutate({
                                idItem: item.id,
                                cantidad: Number(item.cantidad) + 1,
                              })
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.precio_final_mxn)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.subtotal || (item.precio_final_mxn * item.cantidad))}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingItem(item);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => eliminarItemMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Separator />

        {/* Totales */}
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal:</span>
            <span>{formatCurrency(totalOriginal)}</span>
          </div>
          {totalDescuento > 0 && (
            <div className="flex justify-between text-sm text-destructive">
              <span>Descuentos:</span>
              <span>-{formatCurrency(totalDescuento)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between items-end">
            <span className="font-semibold text-base">Total:</span>
            <span className="text-3xl font-extrabold leading-none text-success">{formatCurrency(totalFinal)}</span>
          </div>
        </div>

        <Separator />

        {/* Anticipos */}
        {items.length > 0 && totalFinal > 0 && (
          <POSAnticipos
            idVenta={idVenta}
            clienteId={idCliente}
            totalVenta={totalFinal}
            onAplicado={() => {
              refetchResumen();
            }}
          />
        )}

        {/* Pagos */}
        {items.length > 0 && totalFinal > 0 && (
          <POSPagos 
            idVenta={idVenta}
            saldoPendiente={aPagar}
            onPagoRegistrado={() => {
              refetchResumen();
            }}
            onCerrarVenta={() => {
              cerrarVentaMutation.mutate();
            }}
          />
        )}

        <Separator />

        {/* Resumen de Pago */}
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          {anticipoAplicadoServidor > 0 && (
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Anticipo Aplicado:
              </span>
              <span className="font-medium text-success">-{formatCurrency(anticipoAplicadoServidor)}</span>
            </div>
          )}
          {totalPagado > 0 && (
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Pagado:
              </span>
              <span className="font-medium">-{formatCurrency(totalPagado)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between items-center">
            <span className="font-semibold">Por Pagar:</span>
            <span className={`text-2xl font-bold ${puedenCerrar ? 'text-success' : 'text-foreground'}`}>
              {formatCurrency(Math.max(0, aPagar))}
            </span>
          </div>
        </div>

        {/* Mensaje de validación */}
        {items.length === 0 && (
          <Alert>
            <AlertDescription>
              Agrega items al carrito para poder cerrar la venta
            </AlertDescription>
          </Alert>
        )}
        
        {serviciosSinEmpleado.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              Todos los servicios deben tener un empleado asignado. 
              Hay {serviciosSinEmpleado.length} servicio(s) sin empleado. 
              Edita los items para asignar el empleado que realizó el tratamiento.
            </AlertDescription>
          </Alert>
        )}
        
        {items.length > 0 && aPagar > 0 && serviciosSinEmpleado.length === 0 && (
          <Alert>
            <AlertDescription>
              La venta debe estar completamente pagada (saldo pendiente $0.00) para poder cerrarla. 
              Registra pagos o aplica anticipos para cubrir el saldo de {formatCurrency(aPagar)}
            </AlertDescription>
          </Alert>
        )}

        {/* Acciones */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => {
              if (confirm("¿Deseas cancelar esta venta?")) {
                onVentaCerrada();
              }
            }}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            className="flex-1 h-12 text-base font-bold bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => cerrarVentaMutation.mutate()}
            disabled={!puedenCerrar || cerrarVentaMutation.isPending || items.length === 0}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            {cerrarVentaMutation.isPending ? "Cobrando..." : "Cobrar"}
          </Button>
        </div>

        {/* Diálogo de edición */}
        {editingItem && (
          <POSEditarItemDialog
            item={editingItem}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onItemActualizado={() => {
              refetchItems();
              refetchResumen();
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};
