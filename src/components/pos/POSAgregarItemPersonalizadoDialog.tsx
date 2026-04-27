import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface POSAgregarItemPersonalizadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idVenta: number;
  onItemAgregado?: () => void;
}

export const POSAgregarItemPersonalizadoDialog = ({
  open,
  onOpenChange,
  idVenta,
  onItemAgregado,
}: POSAgregarItemPersonalizadoDialogProps) => {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const queryClient = useQueryClient();

  const agregarItemMutation = useMutation({
    mutationFn: async () => {
      const precioNum = parseFloat(precio);
      if (isNaN(precioNum) || precioNum < 0) {
        throw new Error("El precio debe ser un número válido");
      }

      const cantidadNum = parseFloat(cantidad);
      if (isNaN(cantidadNum) || cantidadNum <= 0) {
        throw new Error("La cantidad debe ser mayor a 0");
      }

      const { data, error } = await supabase.functions.invoke('pos-item', {
        body: {
          id_venta: idVenta,
          tipo: 'personalizado',
          nombre_personalizado: nombre.trim(),
          precio_personalizado: precioNum,
          cantidad: cantidadNum,
        },
        method: 'POST'
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Ítem agregado al carrito");
      queryClient.invalidateQueries({ queryKey: ['pos-venta-resumen'] });
      queryClient.invalidateQueries({ queryKey: ['venta-items'] });
      onItemAgregado?.();
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al agregar ítem");
    },
  });

  const handleClose = () => {
    setNombre("");
    setPrecio("");
    setCantidad("1");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    
    if (!precio) {
      toast.error("El precio es requerido");
      return;
    }

    agregarItemMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agregar Ítem Personalizado</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Ítem *</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Producto especial, Servicio adicional"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="precio">Precio (MXN) *</Label>
              <Input
                id="precio"
                type="number"
                step="0.01"
                min="0"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                step="1"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="1"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={agregarItemMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={agregarItemMutation.isPending}>
              {agregarItemMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Agregar al Carrito
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};