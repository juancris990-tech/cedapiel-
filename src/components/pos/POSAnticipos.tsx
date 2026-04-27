import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Gift, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface POSAnticiposProps {
  idVenta: number;
  clienteId: number;
  totalVenta: number;
  onAplicado: () => void;
}

export const POSAnticipos = ({ idVenta, clienteId, totalVenta, onAplicado }: POSAnticiposProps) => {
  const queryClient = useQueryClient();
  const [modoAutomatico, setModoAutomatico] = useState(true);
  const [anticiposSeleccionados, setAnticiposSeleccionados] = useState<number[]>([]);
  const [showDialog, setShowDialog] = useState(false);

  const { data: anticipos = [] } = useQuery({
    queryKey: ['anticipos-disponibles', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anticipos')
        .select('*')
        .eq('id_cliente', clienteId)
        .gt('saldo_disponible_mxn', 0)
        .order('fecha_pago', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const saldoTotal = anticipos.reduce((sum, a) => sum + Number(a.saldo_disponible_mxn), 0);

  const aplicarAnticiposMutation = useMutation({
    mutationFn: async () => {
      let items = [];
      
      if (!modoAutomatico) {
        items = anticiposSeleccionados.map(id_anticipo => {
          const anticipo = anticipos.find(a => a.id === id_anticipo);
          return {
            id_anticipo,
            monto: Number(anticipo?.saldo_disponible_mxn || 0)
          };
        });
      }

      const { data, error } = await supabase.functions.invoke('pos-aplicar-anticipos', {
        body: {
          id_venta: idVenta,
          automatico: modoAutomatico,
          items
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Anticipos aplicados", {
        description: `${data.anticipos_aplicados.length} anticipo(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ['anticipos-disponibles'] });
      setShowDialog(false);
      onAplicado();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al aplicar anticipos");
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  if (anticipos.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4" />
            Saldo a Favor
          </CardTitle>
          <Badge variant="secondary">{formatCurrency(saldoTotal)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Aplicar Anticipos
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aplicar Anticipos</DialogTitle>
              <DialogDescription>
                {anticipos.length} anticipo(s) por {formatCurrency(saldoTotal)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <Label htmlFor="auto-mode">Automático</Label>
                <Switch
                  id="auto-mode"
                  checked={modoAutomatico}
                  onCheckedChange={setModoAutomatico}
                />
              </div>

              {!modoAutomatico && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {anticipos.map((anticipo) => (
                    <div key={anticipo.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Checkbox
                        checked={anticiposSeleccionados.includes(anticipo.id)}
                        onCheckedChange={() => {
                          setAnticiposSeleccionados(prev => 
                            prev.includes(anticipo.id) ? prev.filter(a => a !== anticipo.id) : [...prev, anticipo.id]
                          );
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium">Anticipo #{anticipo.id}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(anticipo.saldo_disponible_mxn)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={() => aplicarAnticiposMutation.mutate()}
                disabled={aplicarAnticiposMutation.isPending || (!modoAutomatico && anticiposSeleccionados.length === 0)}
                className="w-full"
              >
                {aplicarAnticiposMutation.isPending ? "Aplicando..." : "Aplicar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};