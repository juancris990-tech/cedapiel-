import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
type TipoCliente = "Nuevo" | "Regular" | "VIP";
type FiltroRapido = "todos" | "nuevos" | "regulares" | "vip" | "inactivos";

type ClienteConMetricas = ClienteRow & {
  nombreCompleto: string;
  totalCitas: number;
  totalGastado: number;
  ultimaVisita: string | null;
  tipoCliente: TipoCliente;
  inactivo: boolean;
};

const FILTROS_RAPIDOS: Array<{ key: FiltroRapido; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "nuevos", label: "Nuevos" },
  { key: "regulares", label: "Regulares" },
  { key: "vip", label: "VIP" },
  { key: "inactivos", label: "Inactivos" },
];

const getTipoCliente = (totalCitas: number): TipoCliente => {
  if (totalCitas >= 20) return "VIP";
  if (totalCitas >= 5) return "Regular";
  return "Nuevo";
};

const formatFecha = (fecha: string | null) => {
  if (!fecha) return "Sin visitas";
  return new Date(fecha).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);

const getInitials = (nombre: string, apellidos: string | null) => {
  const firstName = (nombre || "").trim().split(" ")[0] || "";
  const lastName = (apellidos || "").trim().split(" ")[0] || "";
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "CL";
};

const getTipoBadge = (tipo: TipoCliente) => {
  if (tipo === "VIP") {
    return (
      <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400">
        VIP
      </Badge>
    );
  }

  if (tipo === "Regular") {
    return <Badge>Regular</Badge>;
  }

  return <Badge variant="secondary">Nuevo</Badge>;
};

export default function Clientes() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [tabActiva, setTabActiva] = useState("listado");
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapido>("todos");
  
  const esAdmin = useHasAnyRole(['admin', 'gerencia']);

  // Cargar clientes
  const { data: clientes = [], isLoading, refetch } = useQuery({
    queryKey: ['clientes-listado'],
    queryFn: async (): Promise<ClienteConMetricas[]> => {
      const query = supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });

      const { data, error } = await query.limit(1000);
      if (error) throw error;

      const clientesBase = data || [];
      if (!clientesBase.length) return [];

      const idsClientes = clientesBase.map((cliente) => cliente.id);

      const [agendasResult, ventasResult] = await Promise.all([
        supabase
          .from('agendas')
          .select('id_cliente, fecha')
          .in('id_cliente', idsClientes),
        supabase
          .from('ventas')
          .select('id_cliente, total, monto_final_mxn')
          .in('id_cliente', idsClientes),
      ]);

      if (agendasResult.error) throw agendasResult.error;
      if (ventasResult.error) throw ventasResult.error;

      const metricsByCliente = new Map<number, { totalCitas: number; ultimaVisita: string | null; ultimaVisitaMs: number }>();

      for (const agenda of agendasResult.data || []) {
        if (!agenda.id_cliente) continue;

        const current = metricsByCliente.get(agenda.id_cliente) || {
          totalCitas: 0,
          ultimaVisita: null,
          ultimaVisitaMs: 0,
        };

        current.totalCitas += 1;

        const fechaMs = agenda.fecha ? new Date(agenda.fecha).getTime() : 0;
        if (fechaMs > current.ultimaVisitaMs) {
          current.ultimaVisitaMs = fechaMs;
          current.ultimaVisita = agenda.fecha;
        }

        metricsByCliente.set(agenda.id_cliente, current);
      }

      const gastoByCliente = new Map<number, number>();
      for (const venta of ventasResult.data || []) {
        if (!venta.id_cliente) continue;
        const amount = Number(venta.monto_final_mxn ?? venta.total ?? 0);
        gastoByCliente.set(venta.id_cliente, (gastoByCliente.get(venta.id_cliente) || 0) + amount);
      }

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      return clientesBase.map((cliente) => {
        const metricas = metricsByCliente.get(cliente.id);
        const totalCitas = metricas?.totalCitas ?? 0;
        const ultimaVisita = metricas?.ultimaVisita ?? cliente.fecha_ultima_visita;
        const inactivo = !ultimaVisita || new Date(ultimaVisita) < ninetyDaysAgo;

        return {
          ...cliente,
          nombreCompleto: `${cliente.nombre} ${cliente.apellidos || ''}`.trim(),
          totalCitas,
          totalGastado: gastoByCliente.get(cliente.id) || 0,
          ultimaVisita,
          tipoCliente: getTipoCliente(totalCitas),
          inactivo,
        };
      });
    },
  });

  const clientesFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return clientes.filter((cliente) => {
      const coincideBusqueda = !term || [
        cliente.nombreCompleto,
        cliente.telefono || "",
        cliente.email || "",
      ].some((value) => value.toLowerCase().includes(term));

      if (!coincideBusqueda) return false;

      if (filtroRapido === "nuevos") return cliente.totalCitas < 5;
      if (filtroRapido === "regulares") return cliente.totalCitas >= 5 && cliente.totalCitas <= 19;
      if (filtroRapido === "vip") return cliente.totalCitas >= 20;
      if (filtroRapido === "inactivos") return cliente.inactivo;

      return true;
    });
  }, [clientes, busqueda, filtroRapido]);

  const conteosFiltros = useMemo(() => {
    return {
      todos: clientes.length,
      nuevos: clientes.filter((c) => c.totalCitas < 5).length,
      regulares: clientes.filter((c) => c.totalCitas >= 5 && c.totalCitas <= 19).length,
      vip: clientes.filter((c) => c.totalCitas >= 20).length,
      inactivos: clientes.filter((c) => c.inactivo).length,
    };
  }, [clientes]);

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

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground">Gestión y análisis de clientes</p>
          </div>
          <Button onClick={() => setClienteDialogOpen(true)} size="lg" className="h-11 px-6 text-base font-semibold shadow-sm">
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
                <CardTitle>Listado de Clientes</CardTitle>
                <CardDescription>
                  Busca en tiempo real y filtra por tipo de cliente para gestionar mejor tu base activa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, teléfono o email..."
                      className="pl-8"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {FILTROS_RAPIDOS.map((filtro) => (
                      <Button
                        key={filtro.key}
                        type="button"
                        size="sm"
                        variant={filtroRapido === filtro.key ? "default" : "outline"}
                        onClick={() => setFiltroRapido(filtro.key)}
                        className="h-8"
                      >
                        {filtro.label} ({conteosFiltros[filtro.key]})
                      </Button>
                    ))}
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center py-8">Cargando clientes...</div>
                ) : clientesFiltrados.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron clientes
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Última Visita</TableHead>
                          <TableHead className="text-right">Total Gastado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientesFiltrados.map((cliente) => (
                          <TableRow
                            key={cliente.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/clientes/${cliente.id}`)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="text-xs font-semibold">
                                    {getInitials(cliente.nombre, cliente.apellidos)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{cliente.nombreCompleto}</p>
                                  <p className="text-xs text-muted-foreground truncate">{cliente.email || 'Sin email'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{cliente.telefono || '-'}</TableCell>
                            <TableCell>{getTipoBadge(cliente.tipoCliente)}</TableCell>
                            <TableCell>{formatFecha(cliente.ultimaVisita)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(cliente.totalGastado)}</TableCell>
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
