import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageSquare, TrendingUp, DollarSign } from "lucide-react";
import CampaniasPanel from "@/components/marketing/CampaniasPanel";
import MensajesPanel from "@/components/marketing/MensajesPanel";
import SegmentacionPanel from "@/components/marketing/SegmentacionPanel";
import { Skeleton } from "@/components/ui/skeleton";

const Marketing = () => {
  const [activeTab, setActiveTab] = useState("campanias");

  // Get campaign statistics
  const { data: campanias } = useQuery({
    queryKey: ['campanias-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campanias_marketing')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  // Get messaging statistics
  const { data: mensajes } = useQuery({
    queryKey: ['mensajes-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mensajes_enviados')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  // Get client statistics
  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true);
      
      if (error) throw error;
      return data;
    },
  });

  const campaniasActivas = campanias?.filter(c => c.estado === 'Activa').length || 0;
  const totalMensajes = mensajes?.length || 0;
  const tasaRespuesta = mensajes?.length 
    ? ((mensajes.filter(m => m.respondido).length / mensajes.length) * 100).toFixed(1)
    : 0;
  const gastoTotal = campanias?.reduce((sum, c) => sum + (c.gasto_real || 0), 0) || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Marketing y CRM</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de campañas, segmentación de clientes y comunicaciones
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingClientes ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{clientes?.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Base de clientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campañas Activas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaniasActivas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En ejecución
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensajes Enviados</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMensajes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasa respuesta: {tasaRespuesta}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto en Marketing</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(gastoTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total invertido
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="campanias">Campañas</TabsTrigger>
          <TabsTrigger value="segmentacion">Segmentación</TabsTrigger>
          <TabsTrigger value="mensajes">Mensajes</TabsTrigger>
        </TabsList>

        <TabsContent value="campanias">
          <CampaniasPanel />
        </TabsContent>

        <TabsContent value="segmentacion">
          <SegmentacionPanel />
        </TabsContent>

        <TabsContent value="mensajes">
          <MensajesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Marketing;
