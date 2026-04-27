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

const CATEGORIAS = [
  "Renta",
  "Mantenimiento",
  "Servicios",
  "Seguros",
  "Marketing",
  "Sueldos",
  "Asesorías",
  "Equipos",
];

const gastoSchema = z.object({
  id_sucursal: z.number().min(1, "Debe seleccionar una sucursal"),
  categoria: z.string().min(1, "La categoría es requerida"),
  monto: z.number().min(0, "El monto debe ser positivo"),
  fecha: z.date(),
  descripcion: z.string().optional(),
  referencia: z.string().optional(),
});

type GastoFormData = z.infer<typeof gastoSchema>;

interface GastoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GastoDialog = ({ open, onOpenChange }: GastoDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<GastoFormData>({
    resolver: zodResolver(gastoSchema),
    defaultValues: {
      categoria: "",
      fecha: new Date(),
      monto: 0,
      descripcion: "",
      referencia: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GastoFormData) => {
      const { error } = await supabase
        .from("gastos_sucursal")
        .insert({
          id_sucursal: data.id_sucursal,
          categoria: data.categoria,
          monto: data.monto,
          fecha: format(data.fecha, "yyyy-MM-dd"),
          descripcion: data.descripcion,
          referencia: data.referencia,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
      queryClient.invalidateQueries({ queryKey: ["stats-gastos"] });
      toast({
        title: "Gasto registrado",
        description: "El gasto se ha registrado correctamente",
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

  const onSubmit = (data: GastoFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
          <DialogDescription>
            Ingresa los detalles del gasto operativo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id_sucursal">Sucursal</Label>
              <Select
                value={watch("id_sucursal")?.toString()}
                onValueChange={(value) => setValue("id_sucursal", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales?.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.id_sucursal && (
                <p className="text-sm text-destructive">{errors.id_sucursal.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Select
                value={watch("categoria")}
                onValueChange={(value) => setValue("categoria", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoria && (
                <p className="text-sm text-destructive">{errors.categoria.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto">Monto ($)</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                {...register("monto", { valueAsNumber: true })}
              />
              {errors.monto && (
                <p className="text-sm text-destructive">{errors.monto.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watch("fecha") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch("fecha")
                      ? format(watch("fecha"), "PPP", { locale: es })
                      : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={watch("fecha")}
                    onSelect={(date) => date && setValue("fecha", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referencia">Referencia / Factura (opcional)</Label>
            <Input
              id="referencia"
              {...register("referencia")}
              placeholder="Número de factura o referencia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Textarea
              id="descripcion"
              {...register("descripcion")}
              placeholder="Describe el gasto..."
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
                "Registrar Gasto"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GastoDialog;
