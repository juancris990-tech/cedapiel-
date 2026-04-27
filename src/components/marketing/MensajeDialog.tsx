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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const mensajeSchema = z.object({
  id_cliente: z.string().min(1, "El cliente es requerido"),
  id_campania: z.string().optional(),
  canal: z.string().min(1, "El canal es requerido"),
  contenido: z.string().min(1, "El contenido es requerido").max(1000, "Máximo 1000 caracteres"),
});

type MensajeFormData = z.infer<typeof mensajeSchema>;

interface MensajeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MensajeDialog({ open, onOpenChange }: MensajeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MensajeFormData>({
    resolver: zodResolver(mensajeSchema),
    defaultValues: {
      id_cliente: "",
      id_campania: "NONE",
      canal: "",
      contenido: "",
    },
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes-activos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, apellidos')
        .eq('activo', true)
        .order('nombre');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: campanias } = useQuery({
    queryKey: ['campanias-activas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campanias_marketing')
        .select('id, nombre')
        .in('estado', ['Activa', 'Planificada'])
        .order('nombre');
      
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: MensajeFormData) => {
      const mensajeData = {
        id_cliente: parseInt(data.id_cliente),
        id_campania: data.id_campania && data.id_campania !== "NONE" ? parseInt(data.id_campania) : null,
        canal: data.canal,
        contenido: data.contenido,
        estado: 'Enviado',
        fecha_envio: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('mensajes_enviados')
        .insert(mensajeData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mensajes-enviados'] });
      queryClient.invalidateQueries({ queryKey: ['mensajes-stats'] });
      toast({
        title: "Mensaje registrado",
        description: "El mensaje se ha registrado correctamente",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el mensaje",
      });
    },
  });

  const onSubmit = (data: MensajeFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Mensaje Enviado</DialogTitle>
          <DialogDescription>
            Registra un mensaje enviado a un cliente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="id_cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientes?.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id.toString()}>
                            {cliente.nombre} {cliente.apellidos}
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
                name="canal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canal</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona canal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="Llamada">Llamada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="id_campania"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaña (Opcional)</FormLabel>
                  <Select 
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona campaña" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NONE">Sin campaña</SelectItem>
                      {campanias?.map((campania) => (
                        <SelectItem key={campania.id} value={campania.id.toString()}>
                          {campania.nombre}
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
              name="contenido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido del Mensaje</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Escribe el contenido del mensaje..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                Registrar Mensaje
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
