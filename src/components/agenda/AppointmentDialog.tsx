import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const appointmentSchema = z.object({
  cliente_nombre: z.string().min(1, "Ingresa el nombre del cliente"),
  cliente_telefono: z.string().optional(),
  cliente_email: z.string().email("Email inválido").optional().or(z.literal("")),
  cliente_direccion: z.string().optional(),
  servicio_nombre: z.string().min(1, "Ingresa el servicio"),
  sucursal_nombre: z.string().min(1, "Ingresa la sucursal"),
  profesional_nombre: z.string().min(1, "Ingresa el profesional"),
  fecha: z.string().min(1, "Ingresa la fecha"),
  hora_inicio: z.string().min(1, "Ingresa la hora de inicio"),
  hora_fin: z.string().min(1, "Ingresa la hora de término"),
  estado: z.string().min(1, "Selecciona el estado"),
  observaciones: z.string().optional(),
  motivo_cancelacion: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentDialogProps {
  initialValues?: {
    profesional_nombre?: string;
    fecha?: string;
    hora_inicio?: string;
    hora_fin?: string;
    sucursal_nombre?: string;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function AppointmentDialog({ 
  initialValues, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  showTrigger = true
}: AppointmentDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      estado: "agendada",
      observaciones: "",
      motivo_cancelacion: "",
      cliente_nombre: "",
      cliente_telefono: "",
      cliente_email: "",
      cliente_direccion: "",
      servicio_nombre: "",
      sucursal_nombre: "",
      profesional_nombre: initialValues?.profesional_nombre || "",
      fecha: initialValues?.fecha || "",
      hora_inicio: initialValues?.hora_inicio || "",
      hora_fin: "",
    },
  });

  // Reset form when dialog opens with new initial values
  useEffect(() => {
    if (open && initialValues) {
      form.reset({
        estado: "agendada",
        observaciones: "",
        motivo_cancelacion: "",
        cliente_nombre: "",
        cliente_telefono: "",
        cliente_email: "",
        cliente_direccion: "",
        servicio_nombre: "",
        sucursal_nombre: initialValues.sucursal_nombre || "",
        profesional_nombre: initialValues.profesional_nombre || "",
        fecha: initialValues.fecha || "",
        hora_inicio: initialValues.hora_inicio || "",
        hora_fin: initialValues.hora_fin || "",
      });
    }
  }, [open, initialValues, form]);

  const estadoSeleccionado = form.watch("estado");

  const createAppointment = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const response = await supabase.functions.invoke('crear-cita-manual', {
        body: {
          cliente_nombre: data.cliente_nombre,
          cliente_telefono: data.cliente_telefono || null,
          cliente_email: data.cliente_email || null,
          cliente_direccion: data.cliente_direccion || null,
          servicio_nombre: data.servicio_nombre,
          sucursal_nombre: data.sucursal_nombre,
          profesional_nombre: data.profesional_nombre,
          fecha: data.fecha,
          hora_inicio: data.hora_inicio,
          hora_fin: data.hora_fin,
          estado: data.estado,
          observaciones: data.observaciones || null,
          motivo_cancelacion: data.motivo_cancelacion || null,
        },
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'Error al crear cita');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments-range"] });
      queryClient.invalidateQueries({ queryKey: ["citas-agendadas-range"] });
      toast.success("Cita creada exitosamente");
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error("Error al crear la cita: " + error.message);
    },
  });

  const onSubmit = (data: AppointmentFormData) => {
    createAppointment.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Cita
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Nueva Cita</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cliente_nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre completo del cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cliente_telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº de celular</FormLabel>
                    <FormControl>
                      <Input placeholder="+52 123 456 7890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cliente_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="cliente@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cliente_direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Calle, número, colonia, ciudad" {...field} />
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
                  <FormLabel>Servicio reservado</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del servicio" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hora_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de inicio</FormLabel>
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
                    <FormLabel>Hora de término</FormLabel>
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
              name="estado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="agendada">Agendada</SelectItem>
                      <SelectItem value="confirmada">Confirmada</SelectItem>
                      <SelectItem value="en_atencion">En atención</SelectItem>
                      <SelectItem value="finalizada">Finalizada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                      <SelectItem value="no_asiste">No asiste</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(estadoSeleccionado === "cancelada") && (
              <FormField
                control={form.control}
                name="motivo_cancelacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de cancelación</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Especifica el motivo de la cancelación..."
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
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createAppointment.isPending}>
                {createAppointment.isPending ? "Guardando..." : "Crear Cita"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
