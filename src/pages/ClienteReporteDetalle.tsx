import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Star, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ClienteReporteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente-reporte', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes_reporte')
        .select('*')
        .eq('id', parseInt(id!))
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p>Cargando información del cliente...</p>
        </div>
      </AppLayout>
    );
  }

  if (!cliente) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>No se encontró el cliente</p>
          <Button onClick={() => navigate('/clientes-reporte')}>
            Volver al listado
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/clientes-reporte')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{cliente.nombre_completo}</h1>
            {cliente.es_vip && (
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información Personal */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">ID Cliente</p>
                  <p className="font-medium">{cliente.cliente_id}</p>
                </div>
              </div>

              {cliente.telefono_movil && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono Móvil</p>
                    <p className="font-medium">{cliente.telefono_movil}</p>
                  </div>
                </div>
              )}

              {cliente.telefono && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{cliente.telefono}</p>
                  </div>
                </div>
              )}

              {cliente.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{cliente.email}</p>
                  </div>
                </div>
              )}

              {cliente.fecha_nacimiento && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Nacimiento</p>
                    <p className="font-medium">
                      {format(new Date(cliente.fecha_nacimiento), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {(cliente.direccion_1 || cliente.ciudad || cliente.estado) && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Dirección</p>
                      {cliente.direccion_1 && <p className="font-medium">{cliente.direccion_1}</p>}
                      {cliente.direccion_2 && <p className="text-sm">{cliente.direccion_2}</p>}
                      <p className="text-sm">
                        {[cliente.ciudad, cliente.estado, cliente.codigo_postal]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Historial y Estadísticas */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Historial de Visitas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total de Citas</p>
                  <p className="text-2xl font-bold">{cliente.cantidad_citas}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Semanas Ausente</p>
                  <Badge variant={cliente.semanas_ausente >= 4 ? "destructive" : "secondary"} className="text-lg">
                    {cliente.semanas_ausente}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge variant="outline">{cliente.es_vip ? 'VIP' : 'Regular'}</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Última Cita</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cliente.fecha_ultimo_servicio && (
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha</p>
                      <p className="font-medium">
                        {format(new Date(cliente.fecha_ultimo_servicio), "dd 'de' MMMM 'de' yyyy, HH:mm", {
                          locale: es
                        })}
                      </p>
                    </div>
                  )}

                  {cliente.profesional_ultimo_servicio && (
                    <div>
                      <p className="text-sm text-muted-foreground">Profesional</p>
                      <p className="font-medium">{cliente.profesional_ultimo_servicio}</p>
                    </div>
                  )}

                  {cliente.ultimo_servicio && (
                    <div>
                      <p className="text-sm text-muted-foreground">Servicio</p>
                      <p className="font-medium">{cliente.ultimo_servicio}</p>
                    </div>
                  )}

                  {cliente.estado_ultima_cita && (
                    <div>
                      <p className="text-sm text-muted-foreground">Estado</p>
                      <Badge variant="outline">{cliente.estado_ultima_cita}</Badge>
                    </div>
                  )}

                  {cliente.ultima_cita_reservada_via && (
                    <div>
                      <p className="text-sm text-muted-foreground">Reservada vía</p>
                      <p className="font-medium">{cliente.ultima_cita_reservada_via}</p>
                    </div>
                  )}
                </div>
              </div>

              {cliente.fecha_registro && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Registro</p>
                    <p className="font-medium">
                      {format(new Date(cliente.fecha_registro), "dd 'de' MMMM 'de' yyyy", {
                        locale: es
                      })}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}