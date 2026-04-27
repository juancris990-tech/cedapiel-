import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const campaniaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(200),
  descripcion: z.string().max(500).optional(),
  segmento: z.string().max(200).optional(),
  objetivo: z.string().max(500).optional(),
  estado: z.string().min(1, "El estado es requerido"),
  id_sucursal: z.string().min(1, "La sucursal es requerida"),
  fecha_inicio: z.string().min(1, "La fecha de inicio es requerida"),
  fecha_fin: z.string().optional(),
  presupuesto: z.string().min(1, "El presupuesto es requerido"),
});

type CampaniaFormData = z.infer<typeof campaniaSchema>;

interface CampaniaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campania?: any;
}

export default function CampaniaDialog({ open, onOpenChange, campania }: CampaniaDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CampaniaFormData>({
    resolver: zodResolver(campaniaSchema),
    defaultValues: {
      nombre: campania?.nombre || "",
      descripcion: campania?.descripcion || "",
      segmento: campania?.segmento || "",
      objetivo: campania?.objetivo || "",
      estado: campania?.estado || "Planificada",
      id_sucursal: campania?.id_sucursal?.toString() || "",
      fecha_inicio: campania?.fecha_inicio || "",
      fecha_fin: campania?.fecha_fin || "",
      presupuesto: campania?.presupuesto?.toString() || "",
    },
  });

  const { data: sucursales } = useQuery({
    queryKey: ['sucursales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('activo', true);
      
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CampaniaFormData) => {
      const campaniaData = {
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        segmento: data.segmento || null,
        objetivo: data.objetivo || null,
        estado: data.estado,
        id_sucursal: parseInt(data.id_sucursal),
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin || null,
        presupuesto: parseFloat(data.presupuesto),
        gasto_real: 0,
      };

      const { error } = await supabase
        .from('campanias_marketing')
        .insert(campaniaData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campanias-marketing'] });
      queryClient.invalidateQueries({ queryKey: ['campanias-stats'] });
      toast({
        title: "Campaña creada",
        description: "La campaña se ha creado correctamente",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la campaña",
      });
    },
  });

  const onSubmit = (data: CampaniaFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Campaña de Marketing</DialogTitle>
          <DialogDescription>
            Crea una nueva campaña y define su segmento objetivo
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Campaña</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Promoción Verano 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe los detalles de la campaña..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="segmento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segmento Objetivo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Clientes frecuentes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Planificada">Planificada</SelectItem>
                        <SelectItem value="Activa">Activa</SelectItem>
                        <SelectItem value="Completada">Completada</SelectItem>
                        <SelectItem value="Cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="objetivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivo de la Campaña</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Define los objetivos y KPIs esperados..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="id_sucursal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sucursal</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona sucursal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sucursales?.map((sucursal) => (
                          <SelectItem key={sucursal.id} value={sucursal.id.toString()}>
                            {sucursal.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="presupuesto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Presupuesto</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fecha_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Inicio</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fecha_fin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Fin (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Campaña
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
