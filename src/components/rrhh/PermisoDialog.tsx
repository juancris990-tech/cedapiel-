import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const permisoSchema = z.object({
  id_empleado: z.number().min(1, "Debe seleccionar un empleado"),
  tipo: z.string().min(1, "El tipo de permiso es requerido"),
  fecha_inicio: z.date(),
  fecha_fin: z.date(),
  motivo: z.string().optional(),
});

type PermisoFormData = z.infer<typeof permisoSchema>;

interface PermisoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PermisoDialog = ({ open, onOpenChange }: PermisoDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: empleados } = useQuery({
    queryKey: ["empleados-activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleados")
        .select("id, nombre, apellidos")
        .eq("activo", true)
        .order("nombre");
      
      if (error) throw error;
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PermisoFormData>({
    resolver: zodResolver(permisoSchema),
    defaultValues: {
      tipo: "",
      fecha_inicio: new Date(),
      fecha_fin: new Date(),
      motivo: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PermisoFormData) => {
      const { error } = await supabase
        .from("permisos")
        .insert({
          id_empleado: data.id_empleado,
          tipo: data.tipo,
          fecha_inicio: format(data.fecha_inicio, "yyyy-MM-dd"),
          fecha_fin: format(data.fecha_fin, "yyyy-MM-dd"),
          motivo: data.motivo,
          estado: "En proceso",
          id_sucursal: 1, // TODO: Obtener de contexto
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permisos"] });
      toast({
        title: "Permiso creado",
        description: "La solicitud se ha registrado correctamente",
      });
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PermisoFormData) => {
    if (data.fecha_fin < data.fecha_inicio) {
      toast({
        title: "Error",
        description: "La fecha de fin debe ser posterior a la fecha de inicio",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud de Permiso</DialogTitle>
          <DialogDescription>
            Registra una nueva solicitud de permiso o ausencia
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="id_empleado">Empleado</Label>
            <Select
              value={watch("id_empleado")?.toString()}
              onValueChange={(value) => setValue("id_empleado", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un empleado" />
              </SelectTrigger>
              <SelectContent>
                {empleados?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.nombre} {emp.apellidos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.id_empleado && (
              <p className="text-sm text-destructive">{errors.id_empleado.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Permiso</Label>
            <Select
              value={watch("tipo")}
              onValueChange={(value) => setValue("tipo", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vacaciones">Vacaciones</SelectItem>
                <SelectItem value="Enfermedad">Enfermedad</SelectItem>
                <SelectItem value="Personal">Personal</SelectItem>
                <SelectItem value="Capacitación">Capacitación</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && (
              <p className="text-sm text-destructive">{errors.tipo.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watch("fecha_inicio") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch("fecha_inicio")
                      ? format(watch("fecha_inicio"), "PPP", { locale: es })
                      : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={watch("fecha_inicio")}
                    onSelect={(date) => date && setValue("fecha_inicio", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watch("fecha_fin") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch("fecha_fin")
                      ? format(watch("fecha_fin"), "PPP", { locale: es })
                      : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={watch("fecha_fin")}
                    onSelect={(date) => date && setValue("fecha_fin", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              {...register("motivo")}
              placeholder="Describe el motivo del permiso..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Crear Permiso"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PermisoDialog;
