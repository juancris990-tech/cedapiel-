import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { format } from "date-fns";

interface BloqueoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sucursales: Array<{ id: number; nombre: string }>;
  empleados: Array<{ id: number; nombre: string; apellidos: string }>;
  defaultDate?: Date;
}

export function BloqueoDialog({
  open,
  onOpenChange,
  sucursales,
  empleados,
  defaultDate,
}: BloqueoDialogProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id_sucursal: "",
    id_empleado: "all",
    fecha: defaultDate ? format(defaultDate, "yyyy-MM-dd") : "",
    hora_inicio: "",
    hora_fin: "",
    motivo: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await (supabase as any).from("bloqueos_agenda").insert({
        id_sucursal: parseInt(formData.id_sucursal),
        id_empleado: formData.id_empleado !== "all" ? parseInt(formData.id_empleado) : null,
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        motivo: formData.motivo || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Bloqueo creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["bloqueos-agenda"] });
      onOpenChange(false);
      setFormData({
        id_sucursal: "",
        id_empleado: "all",
        fecha: "",
        hora_inicio: "",
        hora_fin: "",
        motivo: "",
      });
    } catch (error: any) {
      console.error("Error creating bloqueo:", error);
      toast.error(error.message || "Error al crear el bloqueo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Bloquear Horario</DialogTitle>
            <DialogDescription>
              Define un período de tiempo que no estará disponible para agendar citas
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sucursal">Sucursal *</Label>
              <Select
                value={formData.id_sucursal}
                onValueChange={(value) =>
                  setFormData({ ...formData, id_sucursal: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((sucursal) => (
                    <SelectItem key={sucursal.id} value={sucursal.id.toString()}>
                      {sucursal.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="empleado">Profesional (Opcional)</Label>
              <Select
                value={formData.id_empleado}
                onValueChange={(value) =>
                  setFormData({ ...formData, id_empleado: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los profesionales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {empleados.map((empleado) => (
                    <SelectItem key={empleado.id} value={empleado.id.toString()}>
                      {empleado.nombre} {empleado.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Si no seleccionas un profesional, se bloqueará para todos
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) =>
                  setFormData({ ...formData, fecha: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="hora_inicio">Hora Inicio *</Label>
                <Input
                  id="hora_inicio"
                  type="time"
                  value={formData.hora_inicio}
                  onChange={(e) =>
                    setFormData({ ...formData, hora_inicio: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="hora_fin">Hora Fin *</Label>
                <Input
                  id="hora_fin"
                  type="time"
                  value={formData.hora_fin}
                  onChange={(e) =>
                    setFormData({ ...formData, hora_fin: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Textarea
                id="motivo"
                value={formData.motivo}
                onChange={(e) =>
                  setFormData({ ...formData, motivo: e.target.value })
                }
                placeholder="Ej: Reunión de equipo, mantenimiento, etc."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Crear Bloqueo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
