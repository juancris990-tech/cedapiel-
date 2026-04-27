import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AnticipoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: number;
  clienteNombre: string;
}

export const AnticipoDialog = ({ open, onOpenChange, clienteId, clienteNombre }: AnticipoDialogProps) => {
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [sucursalId, setSucursalId] = useState("");
  const [referencia, setReferencia] = useState("");
  const [observacion, setObservacion] = useState("");

  const { data: sucursales } = useQuery({
    queryKey: ["sucursales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sucursales")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");
      
      if (error) throw error;
      return data;
    },
  });

  const registrarAnticipo = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("No hay sesión activa");

      const response = await supabase.functions.invoke('anticipos', {
        body: {
          id_cliente: clienteId,
          id_sucursal: parseInt(sucursalId),
          monto_mxn: parseFloat(monto),
          metodo_pago: metodoPago,
          referencia_pago: referencia || null,
          observacion: observacion || null
        }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Anticipo registrado por $${parseFloat(monto).toFixed(2)}`);
      queryClient.invalidateQueries({ queryKey: ["anticipos"] });
      queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al registrar anticipo");
    }
  });

  const resetForm = () => {
    setMonto("");
    setMetodoPago("efectivo");
    setSucursalId("");
    setReferencia("");
    setObservacion("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!monto || parseFloat(monto) <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    if (!sucursalId) {
      toast.error("Selecciona una sucursal");
      return;
    }

    registrarAnticipo.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Anticipo</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cliente: <span className="font-medium">{clienteNombre}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monto">Monto (MXN) *</Label>
            <Input
              id="monto"
              type="number"
              step="0.01"
              min="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sucursal">Sucursal *</Label>
            <Select value={sucursalId} onValueChange={setSucursalId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sucursal" />
              </SelectTrigger>
              <SelectContent>
                {sucursales?.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metodoPago">Método de Pago *</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
              <SelectTrigger>
                <SelectValue />
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
            <Label htmlFor="referencia">Referencia</Label>
            <Input
              id="referencia"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Número de transacción, folio, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacion">Observaciones</Label>
            <Textarea
              id="observacion"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={registrarAnticipo.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={registrarAnticipo.isPending}
            >
              {registrarAnticipo.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Registrar Anticipo"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};