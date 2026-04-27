import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, Mail, Calendar, FileText, ShoppingCart, Hash } from "lucide-react";
import { CitasClientePanel } from "@/components/clientes/CitasClientePanel";
import { NotasClientePanel } from "@/components/clientes/NotasClientePanel";
import { VentasClientePanel } from "@/components/clientes/VentasClientePanel";

export default function ClientePerfil() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clienteId = parseInt(id || '0');

  // Cargar datos del cliente
  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">Cargando ficha del cliente...</div>
    );
  }

  if (!cliente) {
    return (
      <div className="text-center py-8">Cliente no encontrado</div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clientes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Ficha del Cliente</h1>
            <p className="text-muted-foreground">Información y historial completo</p>
          </div>
        </div>

        {/* Datos del Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Datos del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium">{cliente.nombre} {cliente.apellidos || ''}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {cliente.telefono || 'No registrado'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {cliente.email || 'No registrado'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {cliente.created_at 
                    ? new Date(cliente.created_at).toLocaleDateString() 
                    : 'No disponible'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Número de Ficha</p>
                <p className="font-medium text-primary text-lg">
                  #{cliente.numero_expediente || cliente.id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de contenido */}
        <Tabs defaultValue="citas" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="citas">
              <Calendar className="mr-2 h-4 w-4" />
              Citas
            </TabsTrigger>
            <TabsTrigger value="ventas">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Ventas
            </TabsTrigger>
            <TabsTrigger value="notas">
              <FileText className="mr-2 h-4 w-4" />
              Notas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="citas">
            <CitasClientePanel clienteId={clienteId} />
          </TabsContent>

          <TabsContent value="ventas">
            <VentasClientePanel clienteId={clienteId} />
          </TabsContent>

          <TabsContent value="notas">
            <NotasClientePanel clienteId={clienteId} />
          </TabsContent>
      </Tabs>
    </div>
  );
}
