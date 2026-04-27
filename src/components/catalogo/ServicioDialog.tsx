import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion_minutos: number | null;
  id_categoria: number | null;
  activo: boolean | null;
}

interface ServicioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio?: Servicio | null;
}

export const ServicioDialog = ({
  open,
  onOpenChange,
  servicio,
}: ServicioDialogProps) => {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState("");
  const [idCategoria, setIdCategoria] = useState<string>("");
  const [activo, setActivo] = useState(true);
  const queryClient = useQueryClient();

  const isEditing = !!servicio;

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

  useEffect(() => {
    if (servicio) {
      setNombre(servicio.nombre);
      setPrecio(servicio.precio.toString());
      setDescripcion(servicio.descripcion || "");
      setDuracionMinutos(servicio.duracion_minutos?.toString() || "");
      setIdCategoria(servicio.id_categoria?.toString() || "");
      setActivo(servicio.activo ?? true);
    } else {
      setNombre("");
      setPrecio("");
      setDescripcion("");
      setDuracionMinutos("");
      setIdCategoria("");
      setActivo(true);
    }
  }, [servicio, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const precioNum = parseFloat(precio);
      if (isNaN(precioNum) || precioNum < 0) {
        throw new Error("El precio debe ser un número válido");
      }

      const duracionNum = duracionMinutos ? parseInt(duracionMinutos) : null;
      if (duracionMinutos && (isNaN(duracionNum!) || duracionNum! <= 0)) {
        throw new Error("La duración debe ser un número positivo");
      }

      const payload = {
        nombre: nombre.trim(),
        precio: precioNum,
        descripcion: descripcion.trim() || null,
        duracion_minutos: duracionNum,
        id_categoria: idCategoria ? parseInt(idCategoria) : null,
        activo,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("servicios")
          .update(payload)
          .eq("id", servicio.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("servicios").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(
        isEditing
          ? "Servicio actualizado exitosamente"
          : "Servicio creado exitosamente"
      );
      queryClient.invalidateQueries({ queryKey: ["servicios-catalogo"] });
      queryClient.invalidateQueries({ queryKey: ["pos-buscar"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al guardar servicio");
    },
  });

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
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Servicio" : "Nuevo Servicio"}
          </DialogTitle>
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

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Select value={idCategoria || "none"} onValueChange={(val) => setIdCategoria(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categorias.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="flex items-center justify-between">
              <Label htmlFor="activo">Activo</Label>
              <Switch
                id="activo"
                checked={activo}
                onCheckedChange={setActivo}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Guardar Cambios" : "Crear Servicio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
