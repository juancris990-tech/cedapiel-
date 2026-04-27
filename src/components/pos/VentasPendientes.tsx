import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RecalcularVentasButton } from "./RecalcularVentasButton";

interface VentasPendientesProps {
  onSeleccionarVenta: (ventaId: number, clienteId: number, sucursalId: number) => void;
}

export function VentasPendientes({ onSeleccionarVenta }: VentasPendientesProps) {
  const { data: ventas, isLoading } = useQuery({
    queryKey: ["ventas-pendientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ventas")
        .select(`
          id,
          fecha,
          id_cliente,
          id_sucursal,
          clientes!ventas_id_cliente_fkey(nombre, apellidos),
          sucursales!ventas_id_sucursal_fkey(nombre),
          venta_items(id, precio_final_mxn, cantidad)
        `)
        .eq("estado_venta", "borrador")
        .order("fecha", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Calcular totales desde los items
      return data?.map((venta: any) => ({
        ...venta,
        monto_calculado: venta.venta_items?.reduce((sum: number, item: any) => {
          return sum + (Number(item.precio_final_mxn || 0) * Number(item.cantidad || 1));
        }, 0) || 0
      }));
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  if (isLoading) {
    return null;
  }

  if (!ventas || ventas.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Ventas Pendientes
            </CardTitle>
            <CardDescription>
              Continúa con ventas en proceso
            </CardDescription>
          </div>
          <RecalcularVentasButton />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {ventas.map((venta: any) => {
          const itemsCount = venta.venta_items?.length || 0;
          const cliente = venta.clientes;
          const sucursal = venta.sucursales;
          
          return (
            <div
              key={venta.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {cliente?.nombre} {cliente?.apellidos}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{sucursal?.nombre}</span>
                  <Badge variant="secondary">
                    {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(venta.fecha), "dd MMM HH:mm", { locale: es })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-semibold text-primary">
                    {formatCurrency(venta.monto_calculado)}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onSeleccionarVenta(venta.id, venta.id_cliente, venta.id_sucursal)}
                >
                  Continuar
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
