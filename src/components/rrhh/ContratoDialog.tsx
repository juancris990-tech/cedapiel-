import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const contratoSchema = z.object({
  tipo_jornada: z.string().min(1, "El tipo de jornada es requerido"),
  horas_semana: z.number().min(1, "Las horas por semana son requeridas").max(60),
  salario_hora: z.number().min(0, "El salario debe ser positivo"),
  vigencia_salario: z.date().optional(),
  vacaciones_disponibles: z.number().min(0, "Las vacaciones deben ser positivas"),
  fecha_contratacion: z.date().optional(),
  fecha_termino: z.date().optional(),
});

type ContratoFormData = z.infer<typeof contratoSchema>;

interface ContratoDialogProps {
  empleado: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContratoDialog = ({ empleado, open, onOpenChange }: ContratoDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContratoFormData>({
    resolver: zodResolver(contratoSchema),
    defaultValues: {
      tipo_jornada: empleado.tipo_jornada || "",
      horas_semana: empleado.horas_semana || 0,
      salario_hora: empleado.salario_hora || 0,
      vigencia_salario: empleado.vigencia_salario ? new Date(empleado.vigencia_salario) : undefined,
      vacaciones_disponibles: empleado.vacaciones_disponibles || 0,
      fecha_contratacion: empleado.fecha_contratacion ? new Date(empleado.fecha_contratacion) : undefined,
      fecha_termino: empleado.fecha_termino ? new Date(empleado.fecha_termino) : undefined,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ContratoFormData) => {
      const { error } = await supabase
        .from("empleados")
        .update({
          tipo_jornada: data.tipo_jornada,
          horas_semana: data.horas_semana,
          salario_hora: data.salario_hora,
          vigencia_salario: data.vigencia_salario?.toISOString(),
          vacaciones_disponibles: data.vacaciones_disponibles,
          fecha_contratacion: data.fecha_contratacion?.toISOString(),
          fecha_termino: data.fecha_termino?.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", empleado.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empleados-contratos"] });
      toast({
        title: "Contrato actualizado",
        description: "Los cambios se han guardado correctamente",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el contrato",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContratoFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Actualizar Parámetros Laborales</DialogTitle>
          <DialogDescription>
            {empleado.nombre} {empleado.apellidos}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_jornada">Tipo de Jornada</Label>
              <Select
                value={watch("tipo_jornada")}
                onValueChange={(value) => setValue("tipo_jornada", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completa">Completa</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="por_hora">Por Hora</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo_jornada && (
                <p className="text-sm text-destructive">{errors.tipo_jornada.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="horas_semana">Horas por Semana</Label>
              <Input
                id="horas_semana"
                type="number"
                step="0.5"
                {...register("horas_semana", { valueAsNumber: true })}
              />
              {errors.horas_semana && (
                <p className="text-sm text-destructive">{errors.horas_semana.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="salario_hora">Salario por Hora ($)</Label>
              <Input
                id="salario_hora"
                type="number"
                step="0.01"
                {...register("salario_hora", { valueAsNumber: true })}
              />
              {errors.salario_hora && (
                <p className="text-sm text-destructive">{errors.salario_hora.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vacaciones_disponibles">Vacaciones Disponibles (días)</Label>
              <Input
                id="vacaciones_disponibles"
                type="number"
                step="0.5"
                {...register("vacaciones_disponibles", { valueAsNumber: true })}
              />
              {errors.vacaciones_disponibles && (
                <p className="text-sm text-destructive">{errors.vacaciones_disponibles.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Fecha de Contratación</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watch("fecha_contratacion") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch("fecha_contratacion")
                      ? format(watch("fecha_contratacion"), "PPP", { locale: es })
                      : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={watch("fecha_contratacion")}
                    onSelect={(date) => setValue("fecha_contratacion", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Vigencia de Salario</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watch("vigencia_salario") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch("vigencia_salario")
                      ? format(watch("vigencia_salario"), "PPP", { locale: es })
                      : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={watch("vigencia_salario")}
                    onSelect={(date) => setValue("vigencia_salario", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Fecha de Término (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watch("fecha_termino") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch("fecha_termino")
                      ? format(watch("fecha_termino"), "PPP", { locale: es })
                      : "Seleccionar fecha de término"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={watch("fecha_termino")}
                    onSelect={(date) => setValue("fecha_termino", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContratoDialog;
