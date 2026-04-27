import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface POSCrearServicioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServicioCreado?: () => void;
}

export const POSCrearServicioDialog = ({
  open,
  onOpenChange,
  onServicioCreado,
}: POSCrearServicioDialogProps) => {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState("");
  const [idCategoria, setIdCategoria] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias-servicio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categoria_servicio")
        .select("*")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      return data || [];
    },
  });

  const crearServicioMutation = useMutation({
    mutationFn: async () => {
      const precioNum = parseFloat(precio);
      if (isNaN(precioNum) || precioNum <= 0) {
        throw new Error("El precio debe ser un número positivo");
      }

      const duracionNum = duracionMinutos ? parseInt(duracionMinutos) : null;
      if (duracionMinutos && (isNaN(duracionNum!) || duracionNum! <= 0)) {
        throw new Error("La duración debe ser un número positivo");
      }

      const { data, error } = await supabase
        .from("servicios")
        .insert({
          nombre: nombre.trim(),
          precio: precioNum,
          descripcion: descripcion.trim() || null,
          duracion_minutos: duracionNum,
          id_categoria: idCategoria ? parseInt(idCategoria) : null,
          activo: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Servicio creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["pos-buscar"] });
      onServicioCreado?.();
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al crear servicio");
    },
  });

  const handleClose = () => {
    setNombre("");
    setPrecio("");
    setDescripcion("");
    setDuracionMinutos("");
    setIdCategoria("");
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

    crearServicioMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Servicio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del servicio"
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
              <Label htmlFor="categoria">Categoría</Label>
              <Select value={idCategoria} onValueChange={setIdCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duracion">Duración (minutos)</Label>
              <Input
                id="duracion"
                type="number"
                min="0"
                value={duracionMinutos}
                onChange={(e) => setDuracionMinutos(e.target.value)}
                placeholder="60"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción del servicio"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={crearServicioMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={crearServicioMutation.isPending}>
              {crearServicioMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crear Servicio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
