import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, MessageSquare, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MensajeDialog from "./MensajeDialog";

export default function MensajesPanel() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: mensajes, isLoading } = useQuery({
    queryKey: ['mensajes-enviados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mensajes_enviados')
        .select(`
          *,
          clientes(nombre, apellidos, telefono, email),
          campanias_marketing(nombre)
        `)
        .order('fecha_envio', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      'Enviado': 'default',
      'Abierto': 'secondary',
      'Respondido': 'secondary',
      'Error': 'destructive',
    };
    return <Badge variant={variants[estado] || 'default'}>{estado}</Badge>;
  };

  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case 'WhatsApp':
        return <MessageSquare className="h-4 w-4" />;
      case 'Email':
        return <Mail className="h-4 w-4" />;
      case 'SMS':
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mensajes Enviados</CardTitle>
              <CardDescription>
                Historial de comunicaciones con clientes
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Mensaje
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Contenido</TableHead>
                  <TableHead>Fecha Envío</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Respuesta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mensajes?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No hay mensajes registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  mensajes?.map((mensaje) => (
                    <TableRow key={mensaje.id}>
                      <TableCell className="font-medium">
                        {mensaje.clientes?.nombre} {mensaje.clientes?.apellidos}
                      </TableCell>
                      <TableCell>
                        {mensaje.campanias_marketing?.nombre || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCanalIcon(mensaje.canal)}
                          {mensaje.canal}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {mensaje.contenido || '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(mensaje.fecha_envio), "d MMM yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>{getEstadoBadge(mensaje.estado)}</TableCell>
                      <TableCell>
                        {mensaje.respondido ? (
                          <Badge variant="default">Sí</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MensajeDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
