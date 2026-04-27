import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean | null;
}

interface CategoriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoria?: Categoria | null;
}

export const CategoriaDialog = ({
  open,
  onOpenChange,
  categoria,
}: CategoriaDialogProps) => {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const queryClient = useQueryClient();

  const isEditing = !!categoria;

  useEffect(() => {
    if (categoria) {
      setNombre(categoria.nombre);
      setDescripcion(categoria.descripcion || "");
      setActivo(categoria.activo ?? true);
    } else {
      setNombre("");
      setDescripcion("");
      setActivo(true);
    }
  }, [categoria, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEditing) {
        const { error } = await supabase
          .from("categoria_servicio")
          .update({
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || null,
            activo,
          })
          .eq("id", categoria.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categoria_servicio").insert({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          activo,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(
        isEditing
          ? "Categoría actualizada exitosamente"
          : "Categoría creada exitosamente"
      );
      queryClient.invalidateQueries({ queryKey: ["categorias-servicio"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al guardar categoría");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Categoría" : "Nueva Categoría"}
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
                placeholder="Nombre de la categoría"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción de la categoría"
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
              {isEditing ? "Guardar Cambios" : "Crear Categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
