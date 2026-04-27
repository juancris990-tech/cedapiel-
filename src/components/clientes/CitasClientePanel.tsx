import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock } from "lucide-react";

interface CitasClientePanelProps {
  clienteId: number;
}

export function CitasClientePanel({ clienteId }: CitasClientePanelProps) {
  const [filtro, setFiltro] = useState<'todas' | 'pasadas' | 'futuras'>('todas');

  const { data: citas = [], isLoading } = useQuery({
    queryKey: ['citas-cliente', clienteId, filtro],
    queryFn: async () => {
      let query = supabase
        .from('agendas')
        .select(`
          *,
          servicios(nombre),
          empleados(nombre, apellidos),
          sucursales(nombre)
        `)
        .eq('id_cliente', clienteId)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false });

      const hoy = new Date().toISOString().split('T')[0];
      
      if (filtro === 'pasadas') {
        query = query.lt('fecha', hoy);
      } else if (filtro === 'futuras') {
        query = query.gte('fecha', hoy);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const getEstadoBadge = (estado: string) => {
    // Mapear estados a categorías simplificadas
    const estadosAgendada = ['agendada', 'confirmada', 'reservada', 'en_atencion', 'llego_paciente'];
    const estadosRealizada = ['finalizada', 'asistida'];
    const estadosCancelada = ['cancelada', 'cancelada_cliente', 'cancelada_clinica'];
    const estadosNoAsiste = ['no_asiste', 'no_show'];

    let variant: "outline" | "default" | "secondary" | "destructive" = "outline";
    let label = "Agendada";

    if (estadosRealizada.includes(estado)) {
      variant = "default";
      label = "Realizada";
    } else if (estadosCancelada.includes(estado)) {
      variant = "destructive";
      label = "Cancelada";
    } else if (estadosNoAsiste.includes(estado)) {
      variant = "secondary";
      label = "No asiste";
    } else if (estadosAgendada.includes(estado)) {
      variant = "outline";
      label = "Agendada";
    }

    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Citas</CardTitle>
        <CardDescription>Todas las citas registradas del cliente</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="pasadas">Pasadas</TabsTrigger>
            <TabsTrigger value="futuras">Futuras</TabsTrigger>
          </TabsList>

          <TabsContent value={filtro} className="mt-4">
            {isLoading ? (
              <div className="text-center py-8">Cargando citas...</div>
            ) : citas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron citas
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Profesional</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {citas.map((cita: any) => (
                      <TableRow key={cita.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(cita.fecha).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {cita.hora_inicio}
                          </div>
                        </TableCell>
                        <TableCell>{cita.servicios?.nombre || '-'}</TableCell>
                        <TableCell>
                          {cita.empleados 
                            ? `${cita.empleados.nombre} ${cita.empleados.apellidos}`
                            : '-'
                          }
                        </TableCell>
                        <TableCell>{cita.sucursales?.nombre || '-'}</TableCell>
                        <TableCell>{getEstadoBadge(cita.estado)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
