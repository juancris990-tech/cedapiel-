import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, UserPlus, Users, AlertTriangle, Gift, FileText, UserX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ClienteDialog } from "@/components/clientes/ClienteDialog";
import { TarjetasRegaloPanel } from "@/components/clientes/TarjetasRegaloPanel";
import { ClientesAusentesPanel } from "@/components/clientes/ClientesAusentesPanel";
import { ClientesDuplicadosPanel } from "@/components/clientes/ClientesDuplicadosPanel";
import { ClientesEliminadosPanel } from "@/components/clientes/ClientesEliminadosPanel";
import { useHasAnyRole } from "@/hooks/useUserRoles";

export default function Clientes() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [tabActiva, setTabActiva] = useState("listado");
  
  const esAdmin = useHasAnyRole(['admin', 'gerencia']);

  // Cargar clientes
  const { data: clientes = [], isLoading, refetch } = useQuery({
    queryKey: ['clientes', busqueda],
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (busqueda) {
        query = query.or(`nombre.ilike.%${busqueda}%,apellidos.ilike.%${busqueda}%,telefono.ilike.%${busqueda}%,email.ilike.%${busqueda}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Estadísticas rápidas
  const { data: stats } = useQuery({
    queryKey: ['clientes-stats'],
    queryFn: async () => {
      const [totalResult, ausentesResult, duplicadosResult] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('vw_clientes_ausentes').select('id', { count: 'exact', head: true }),
        supabase.from('vw_clientes_duplicados').select('tipo_duplicado', { count: 'exact', head: true }),
      ]);

      return {
        total: totalResult.count || 0,
        ausentes: ausentesResult.count || 0,
        duplicados: duplicadosResult.count || 0,
      };
    },
  });

  const getRiesgoBadge = (riesgo: string) => {
    const variants = {
      ALTO: "destructive",
      MEDIO: "default",
      BAJO: "secondary",
    } as const;
    
    return (
      <Badge variant={variants[riesgo as keyof typeof variants] || "secondary"}>
        {riesgo}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground">Gestión y análisis de clientes</p>
          </div>
          <Button onClick={() => setClienteDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Clientes activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ausentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.ausentes || 0}</div>
              <p className="text-xs text-muted-foreground">Sin citas en 60+ días</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posibles Duplicados</CardTitle>
              <UserX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.duplicados || 0}</div>
              <p className="text-xs text-muted-foreground">Registros sospechosos</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={tabActiva} onValueChange={setTabActiva}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="listado">
              <Users className="mr-2 h-4 w-4" />
              Listado
            </TabsTrigger>
            <TabsTrigger value="ausentes">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Retención
            </TabsTrigger>
            <TabsTrigger value="tarjetas">
              <Gift className="mr-2 h-4 w-4" />
              Tarjetas Regalo
            </TabsTrigger>
            {esAdmin && (
              <TabsTrigger value="duplicados">
                <UserX className="mr-2 h-4 w-4" />
                Duplicados
              </TabsTrigger>
            )}
            {esAdmin && (
              <TabsTrigger value="eliminados">
                <FileText className="mr-2 h-4 w-4" />
                Eliminados
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab: Listado de Clientes */}
          <TabsContent value="listado" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Todos los Clientes</CardTitle>
                <CardDescription>Busca y gestiona tus clientes activos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, teléfono o email..."
                      className="pl-8"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center py-8">Cargando clientes...</div>
                ) : clientes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron clientes
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Expediente</TableHead>
                          <TableHead>Última Visita</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientes.map((cliente) => (
                          <TableRow
                            key={cliente.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/clientes/${cliente.id}`)}
                          >
                            <TableCell className="font-medium">
                              {cliente.nombre} {cliente.apellidos}
                            </TableCell>
                            <TableCell>{cliente.telefono || '-'}</TableCell>
                            <TableCell>{cliente.email || '-'}</TableCell>
                            <TableCell>{cliente.numero_expediente || '-'}</TableCell>
                            <TableCell>
                              {cliente.fecha_ultima_visita 
                                ? new Date(cliente.fecha_ultima_visita).toLocaleDateString()
                                : 'Sin visitas'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/clientes/${cliente.id}`);
                                }}
                              >
                                Ver Perfil
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

          {/* Tab: Clientes Ausentes */}
          <TabsContent value="ausentes">
            <ClientesAusentesPanel />
          </TabsContent>

          {/* Tab: Tarjetas de Regalo */}
          <TabsContent value="tarjetas">
            <TarjetasRegaloPanel />
          </TabsContent>

          {/* Tab: Duplicados (solo admin) */}
          {esAdmin && (
            <TabsContent value="duplicados">
              <ClientesDuplicadosPanel onMergeSuccess={refetch} />
            </TabsContent>
          )}

          {/* Tab: Eliminados (solo admin) */}
          {esAdmin && (
            <TabsContent value="eliminados">
              <ClientesEliminadosPanel />
            </TabsContent>
          )}
        </Tabs>

        {/* Dialog para crear cliente */}
        <ClienteDialog
          open={clienteDialogOpen}
          onOpenChange={setClienteDialogOpen}
          onSuccess={() => {
            refetch();
            setClienteDialogOpen(false);
          }}
        />
    </div>
  );
}
