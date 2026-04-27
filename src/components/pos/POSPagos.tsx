import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2 } from "lucide-react";

interface POSPagosProps {
  idVenta: number;
  saldoPendiente: number;
  onPagoRegistrado: () => void;
  onCerrarVenta?: () => void;
}

export const POSPagos = ({ idVenta, saldoPendiente, onPagoRegistrado, onCerrarVenta }: POSPagosProps) => {
  const queryClient = useQueryClient();
  const [metodo, setMetodo] = useState("");
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");

  const { data: pagos = [] } = useQuery({
    queryKey: ['pagos-venta', idVenta],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .eq('id_venta', idVenta)
        .eq('aplicado_a_venta', true)
        .order('fecha_pago', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const registrarPagoMutation = useMutation({
    mutationFn: async () => {
      if (!metodo || !monto || Number(monto) <= 0) {
        throw new Error("Método y monto válido requeridos");
      }

      const { data, error } = await supabase.functions.invoke('pos-pago', {
        body: {
          id_venta: idVenta,
          metodo,
          monto_mxn: Number(monto),
          referencia: referencia || null
        },
        method: 'POST'
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      toast.success("Pago registrado");
      setMetodo("");
      setMonto("");
      setReferencia("");
      queryClient.invalidateQueries({ queryKey: ['pagos-venta'] });
      queryClient.invalidateQueries({ queryKey: ['pos-venta-resumen'] });
      onPagoRegistrado();
      
      // Esperar a que se actualice el resumen para verificar si está completamente pagado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar si el nuevo saldo es 0 después del pago
      const montoPago = Number(monto);
      const nuevoSaldo = saldoPendiente - montoPago;
      
      if (Math.abs(nuevoSaldo) < 0.01 && onCerrarVenta) {
        toast.success("Venta completamente pagada, cerrando automáticamente...");
        setTimeout(() => {
          onCerrarVenta();
        }, 1000);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al registrar pago");
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pagos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulario de Pago */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Método de Pago</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Monto</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Referencia (Opcional)</Label>
            <Input
              placeholder="Número de referencia..."
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonto(Math.max(0, saldoPendiente).toFixed(2))}
          >
            Pago Total
          </Button>
          <Button
            className="flex-1"
            onClick={() => registrarPagoMutation.mutate()}
            disabled={!metodo || !monto || registrarPagoMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            {registrarPagoMutation.isPending ? "Registrando..." : "Agregar Pago"}
          </Button>
        </div>

        {/* Lista de Pagos */}
        {pagos.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Pagos Registrados</Label>
            <div className="space-y-2">
              {pagos.map((pago: any) => (
                <div
                  key={pago.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {pago.metodo_pago}
                    </Badge>
                    {pago.referencia && (
                      <span className="text-xs text-muted-foreground">
                        Ref: {pago.referencia}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-success">
                    {formatCurrency(pago.monto)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
