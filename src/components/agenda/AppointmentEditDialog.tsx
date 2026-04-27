import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const appointmentSchema = z.object({
  cliente_nombre: z.string().min(1, "El nombre del cliente es requerido"),
  servicio_nombre: z.string().optional(),
  sucursal_nombre: z.string().min(1, "La sucursal es requerida"),
  profesional_nombre: z.string().optional(),
  fecha: z.string().min(1, "La fecha es requerida"),
  hora_inicio: z.string().min(1, "La hora de inicio es requerida"),
  hora_fin: z.string().min(1, "La hora de fin es requerida"),
  estado: z.string().optional(),
  observaciones: z.string().optional(),
  motivo_cancelacion: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentEditDialogProps {
  appointmentId: number;
  appointment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentEditDialog({
  appointmentId,
  appointment,
  open,
  onOpenChange,
}: AppointmentEditDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      cliente_nombre: `${appointment?.clientes?.nombre || ''} ${appointment?.clientes?.apellidos || ''}`.trim(),
      servicio_nombre: appointment?.servicios?.nombre || '',
      sucursal_nombre: appointment?.sucursales?.nombre || '',
      profesional_nombre: `${appointment?.empleados?.nombre || ''} ${appointment?.empleados?.apellidos || ''}`.trim(),
      fecha: appointment?.fecha || '',
      hora_inicio: appointment?.hora_inicio || '',
      hora_fin: appointment?.hora_fin || '',
      estado: appointment?.estado || 'agendada',
      observaciones: appointment?.observaciones || '',
      motivo_cancelacion: appointment?.motivo_cancelacion || '',
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      const { data: result, error } = await supabase.functions.invoke(
        "editar-cita-manual",
        {
          body: {
            cita_id: appointmentId,
            ...data,
          },
        }
      );

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success("Cita actualizada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["appointments-week"] });
      queryClient.invalidateQueries({ queryKey: ["citas-agendadas-week"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-detail", appointmentId] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar la cita");
    },
  });

  const onSubmit = (data: AppointmentFormData) => {
    updateAppointment.mutate(data);
  };

  const watchEstado = form.watch("estado");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cita</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cliente_nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre completo del cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="servicio_nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servicio</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del servicio" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sucursal_nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sucursal</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la sucursal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profesional_nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profesional</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del profesional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="agendada">Agendada</SelectItem>
                        <SelectItem value="confirmada">Confirmada</SelectItem>
                        <SelectItem value="en_atencion">En Atención</SelectItem>
                        <SelectItem value="finalizada">Finalizada</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                        <SelectItem value="no_asiste">No Asiste</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hora_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Inicio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hora_fin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Fin</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales sobre la cita"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchEstado === "cancelada" && (
              <FormField
                control={form.control}
                name="motivo_cancelacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de Cancelación</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Razón de la cancelación"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateAppointment.isPending}>
                {updateAppointment.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
