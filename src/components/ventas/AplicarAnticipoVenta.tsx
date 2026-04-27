import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { DollarSign, Gift, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AplicarAnticipoVentaProps {
  clienteId: number;
  totalVenta: number;
  onAplicacionChange: (montoAplicado: number, aplicaciones: any[]) => void;
}

export const AplicarAnticipoVenta = ({ 
  clienteId, 
  totalVenta,
  onAplicacionChange 
}: AplicarAnticipoVentaProps) => {
  const queryClient = useQueryClient();
  const [aplicarAutomatico, setAplicarAutomatico] = useState(true);
  const [anticiposSeleccionados, setAnticiposSeleccionados] = useState<number[]>([]);
  const [montoTotal, setMontoTotal] = useState(0);

  const { data: cliente } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("nombre, apellidos, saldo_favor")
        .eq("id", clienteId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });

  const { data: anticipos, isLoading } = useQuery({
    queryKey: ["anticipos-disponibles", clienteId],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("No hay sesión activa");

      const response = await supabase.functions.invoke('anticipos', {
        body: null,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.error) throw response.error;
      
      // Filtrar por cliente y solo los que tienen saldo disponible
      const allAnticipos = response.data || [];
      return allAnticipos.filter((a: any) => 
        a.id_cliente === clienteId && 
        Number(a.saldo_disponible_mxn) > 0
      );
    },
    enabled: !!clienteId,
  });

  useEffect(() => {
    if (aplicarAutomatico && anticipos && anticipos.length > 0) {
      // Aplicar automáticamente hasta cubrir el total
      let restante = totalVenta;
      const seleccionados: number[] = [];
      let total = 0;

      for (const anticipo of anticipos) {
        if (restante <= 0) break;
        
        const disponible = Number(anticipo.saldo_disponible_mxn);
        const aAplicar = Math.min(disponible, restante);
        
        seleccionados.push(anticipo.id);
        total += aAplicar;
        restante -= aAplicar;
      }

      setAnticiposSeleccionados(seleccionados);
      setMontoTotal(total);
    } else if (!aplicarAutomatico) {
      setAnticiposSeleccionados([]);
      setMontoTotal(0);
    }
  }, [aplicarAutomatico, anticipos, totalVenta]);

  useEffect(() => {
    // Calcular las aplicaciones para enviar al componente padre
    if (anticipos) {
      const aplicaciones = anticiposSeleccionados.map(id => {
        const anticipo = anticipos.find(a => a.id === id);
        if (!anticipo) return null;

        const disponible = Number(anticipo.saldo_disponible_mxn);
        let restante = totalVenta - montoTotal;
        
        // Recalcular cuánto se aplicará de este anticipo
        let total = 0;
        for (const selId of anticiposSeleccionados) {
          if (selId === id) break;
          const ant = anticipos.find(a => a.id === selId);
          if (ant) {
            const disp = Number(ant.saldo_disponible_mxn);
            const aplicado = Math.min(disp, totalVenta - total);
            total += aplicado;
          }
        }
        restante = totalVenta - total;
        const aAplicar = Math.min(disponible, restante);

        return {
          id_anticipo: id,
          monto_aplicado: aAplicar
        };
      }).filter(Boolean);

      const totalAplicado = aplicaciones.reduce((sum, a: any) => sum + a.monto_aplicado, 0);
      onAplicacionChange(totalAplicado, aplicaciones);
    }
  }, [anticiposSeleccionados, anticipos, totalVenta, montoTotal, onAplicacionChange]);

  const handleToggleAnticipo = (anticipoId: number) => {
    setAplicarAutomatico(false);
    setAnticiposSeleccionados(prev => {
      if (prev.includes(anticipoId)) {
        return prev.filter(id => id !== anticipoId);
      } else {
        return [...prev, anticipoId];
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const saldoDisponible = Number(cliente?.saldo_favor || 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!anticipos || anticipos.length === 0) {
    return null;
  }

  return (
    <Card className="border-success/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-success" />
            <div>
              <CardTitle>Saldo a Favor Disponible</CardTitle>
              <CardDescription>
                Cliente tiene {formatCurrency(saldoDisponible)} en anticipos
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-success">
              {formatCurrency(saldoDisponible)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2 p-4 bg-success/10 rounded-lg">
          <Checkbox
            id="aplicar-automatico"
            checked={aplicarAutomatico}
            onCheckedChange={(checked) => setAplicarAutomatico(checked as boolean)}
          />
          <Label
            htmlFor="aplicar-automatico"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Aplicar anticipo automáticamente
          </Label>
        </div>

        {anticipos.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Anticipos Disponibles</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {anticipos.map((anticipo: any) => {
                const disponible = Number(anticipo.saldo_disponible_mxn);
                const estaSeleccionado = anticiposSeleccionados.includes(anticipo.id);
                
                return (
                  <div
                    key={anticipo.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      estaSeleccionado 
                        ? 'bg-success/10 border-success' 
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <Checkbox
                        id={`anticipo-${anticipo.id}`}
                        checked={estaSeleccionado}
                        onCheckedChange={() => handleToggleAnticipo(anticipo.id)}
                        disabled={aplicarAutomatico}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Anticipo #{anticipo.id}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(anticipo.fecha_pago), "dd/MM/yyyy", { locale: es })}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {anticipo.sucursal} · {anticipo.metodo_pago}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-success">
                        {formatCurrency(disponible)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        de {formatCurrency(Number(anticipo.monto_mxn))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {montoTotal > 0 && (
          <Alert className="bg-success/10 border-success">
            <AlertCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-sm">
              Se aplicarán <strong>{formatCurrency(montoTotal)}</strong> de anticipos.
              {montoTotal < totalVenta && (
                <span className="block mt-1">
                  Restante a pagar: <strong>{formatCurrency(totalVenta - montoTotal)}</strong>
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};