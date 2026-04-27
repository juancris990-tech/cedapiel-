import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Phone, Calendar } from "lucide-react";

export function ClientesAusentesPanel() {
  const [diasCorte, setDiasCorte] = useState("60");

  // Clientes ausentes
  const { data: ausentes = [], isLoading: loadingAusentes } = useQuery({
    queryKey: ['clientes-ausentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_clientes_ausentes')
        .select('*')
        .order('dias_sin_citas', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Clientes no retenidos
  const { data: noRetenidos = [], isLoading: loadingNoRetenidos } = useQuery({
    queryKey: ['clientes-no-retenidos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_clientes_no_retenidos')
        .select('*')
        .order('dias_desde_ultima_cita', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Clientes por segmento de recompra
  const { data: segmentos = [], isLoading: loadingSegmentos } = useQuery({
    queryKey: ['clientes-recompra'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_clientes_recompra')
        .select('*')
        .order('dias_desde_ultima_cita', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const getSegmentoBadge = (segmento: string) => {
    const config = {
      ACTIVO: { variant: "secondary" as const, label: "Activo" },
      EN_RIESGO: { variant: "default" as const, label: "En Riesgo" },
      ALTO_RIESGO: { variant: "destructive" as const, label: "Alto Riesgo" },
      PERDIDO: { variant: "destructive" as const, label: "Perdido" },
    };
    
    const info = config[segmento as keyof typeof config] || config.ACTIVO;
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  return (
    <Tabs defaultValue="ausentes" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="ausentes">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Clientes Ausentes
        </TabsTrigger>
        <TabsTrigger value="no-retenidos">
          <Calendar className="mr-2 h-4 w-4" />
          No Retenidos
        </TabsTrigger>
        <TabsTrigger value="segmentos">
          <Phone className="mr-2 h-4 w-4" />
          Por Segmento
        </TabsTrigger>
      </TabsList>

      {/* Tab: Clientes Ausentes */}
      <TabsContent value="ausentes">
        <Card>
          <CardHeader>
            <CardTitle>Clientes Ausentes</CardTitle>
            <CardDescription>
              Clientes sin citas en los últimos 60+ días
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAusentes ? (
              <div className="text-center py-8">Cargando...</div>
            ) : ausentes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay clientes ausentes
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Última Cita</TableHead>
                      <TableHead>Días Sin Citas</TableHead>
                      <TableHead>Total Citas</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ausentes.map((cliente: any) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">
                          {cliente.nombre} {cliente.apellidos}
                        </TableCell>
                        <TableCell>{cliente.telefono || '-'}</TableCell>
                        <TableCell>{cliente.email || '-'}</TableCell>
                        <TableCell>
                          {cliente.fecha_ultima_cita 
                            ? new Date(cliente.fecha_ultima_cita).toLocaleDateString()
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{cliente.dias_sin_citas} días</Badge>
                        </TableCell>
                        <TableCell>{cliente.total_citas_historicas}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (cliente.telefono) {
                                window.open(`https://wa.me/${cliente.telefono.replace(/\D/g, '')}`, '_blank');
                              }
                            }}
                          >
                            <Phone className="mr-2 h-3 w-3" />
                            Contactar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab: No Retenidos */}
      <TabsContent value="no-retenidos">
        <Card>
          <CardHeader>
            <CardTitle>Clientes No Retenidos</CardTitle>
            <CardDescription>
              Clientes que vinieron pero no tienen reservas futuras (90+ días sin citas)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingNoRetenidos ? (
              <div className="text-center py-8">Cargando...</div>
            ) : noRetenidos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay clientes no retenidos
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Última Cita</TableHead>
                      <TableHead>Días Desde Última</TableHead>
                      <TableHead>Citas Pasadas</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {noRetenidos.map((cliente: any) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">
                          {cliente.nombre} {cliente.apellidos}
                        </TableCell>
                        <TableCell>{cliente.telefono || '-'}</TableCell>
                        <TableCell>{cliente.email || '-'}</TableCell>
                        <TableCell>
                          {cliente.fecha_ultima_cita 
                            ? new Date(cliente.fecha_ultima_cita).toLocaleDateString()
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{cliente.dias_desde_ultima_cita} días</Badge>
                        </TableCell>
                        <TableCell>{cliente.total_citas_pasadas}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (cliente.telefono) {
                                window.open(`https://wa.me/${cliente.telefono.replace(/\D/g, '')}`, '_blank');
                              }
                            }}
                          >
                            <Phone className="mr-2 h-3 w-3" />
                            Contactar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab: Segmentos */}
      <TabsContent value="segmentos">
        <Card>
          <CardHeader>
            <CardTitle>Clientes por Segmento de Recompra</CardTitle>
            <CardDescription>
              Clasificación de clientes según tiempo desde última visita
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-4 gap-2 text-sm">
              <div className="p-2 rounded border">
                <Badge variant="secondary" className="mb-1">Activo</Badge>
                <p className="text-muted-foreground">≤ 30 días</p>
              </div>
              <div className="p-2 rounded border">
                <Badge variant="default" className="mb-1">En Riesgo</Badge>
                <p className="text-muted-foreground">31-60 días</p>
              </div>
              <div className="p-2 rounded border">
                <Badge variant="destructive" className="mb-1">Alto Riesgo</Badge>
                <p className="text-muted-foreground">61-90 días</p>
              </div>
              <div className="p-2 rounded border">
                <Badge variant="destructive" className="mb-1">Perdido</Badge>
                <p className="text-muted-foreground">&gt; 90 días</p>
              </div>
            </div>

            {loadingSegmentos ? (
              <div className="text-center py-8">Cargando...</div>
            ) : segmentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos disponibles
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Última Cita</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Segmento</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segmentos.map((cliente: any) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">
                          {cliente.nombre} {cliente.apellidos}
                        </TableCell>
                        <TableCell>{cliente.telefono || '-'}</TableCell>
                        <TableCell>
                          {cliente.fecha_ultima_cita 
                            ? new Date(cliente.fecha_ultima_cita).toLocaleDateString()
                            : '-'
                          }
                        </TableCell>
                        <TableCell>{cliente.dias_desde_ultima_cita} días</TableCell>
                        <TableCell>
                          {getSegmentoBadge(cliente.segmento_recompra)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (cliente.telefono) {
                                window.open(`https://wa.me/${cliente.telefono.replace(/\D/g, '')}`, '_blank');
                              }
                            }}
                          >
                            <Phone className="mr-2 h-3 w-3" />
                            Contactar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
