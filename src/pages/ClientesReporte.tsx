import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Search, Download, Users, Star, Calendar, FileUser } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function ClientesReporte() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [filtroVIP, setFiltroVIP] = useState<string>("todos");
  const [filtroSemanas, setFiltroSemanas] = useState<string>("todos");
  const [filtroProfesional, setFiltroProfesional] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [isUploading, setIsUploading] = useState(false);

  const { data: clientes, isLoading, refetch } = useQuery({
    queryKey: ['clientes-reporte'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes_reporte')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const response = await supabase.functions.invoke('clientes-reporte-importar', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast.success(response.data.message);
      refetch();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al importar clientes');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleExportCSV = () => {
    if (!clientesFiltrados || clientesFiltrados.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const headers = [
      'Nombre Completo', 'Teléfono', 'Email', 'Cantidad Citas', 'Última Cita',
      'Profesional', 'Estado', 'Último Servicio', 'Fecha Registro', 'Semanas Ausente', 'VIP'
    ];

    const rows = clientesFiltrados.map(c => [
      c.nombre_completo,
      c.telefono_movil || '',
      c.email || '',
      c.cantidad_citas,
      c.fecha_ultimo_servicio ? format(new Date(c.fecha_ultimo_servicio), 'dd/MM/yyyy HH:mm') : '',
      c.profesional_ultimo_servicio || '',
      c.estado_ultima_cita || '',
      c.ultimo_servicio || '',
      c.fecha_registro ? format(new Date(c.fecha_registro), 'dd/MM/yyyy') : '',
      c.semanas_ausente,
      c.es_vip ? 'Sí' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes-reporte-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const clientesFiltrados = clientes?.filter(cliente => {
    const matchBusqueda = busqueda === "" || 
      cliente.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      cliente.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
      cliente.telefono_movil?.includes(busqueda) ||
      String(cliente.cliente_id)?.includes(busqueda);

    const matchVIP = filtroVIP === "todos" || 
      (filtroVIP === "vip" && cliente.es_vip) ||
      (filtroVIP === "no_vip" && !cliente.es_vip);

    const matchSemanas = filtroSemanas === "todos" ||
      (filtroSemanas === "0-4" && cliente.semanas_ausente >= 0 && cliente.semanas_ausente <= 4) ||
      (filtroSemanas === "5-12" && cliente.semanas_ausente >= 5 && cliente.semanas_ausente <= 12) ||
      (filtroSemanas === "13+" && cliente.semanas_ausente >= 13);

    const matchProfesional = filtroProfesional === "todos" ||
      cliente.profesional_ultimo_servicio === filtroProfesional;

    const matchEstado = filtroEstado === "todos" ||
      cliente.estado_ultima_cita === filtroEstado;

    return matchBusqueda && matchVIP && matchSemanas && matchProfesional && matchEstado;
  });

  const profesionalesUnicos = Array.from(new Set(clientes?.map(c => c.profesional_ultimo_servicio).filter(Boolean)));
  const estadosUnicos = Array.from(new Set(clientes?.map(c => c.estado_ultima_cita).filter(Boolean)));

  const stats = {
    total: clientes?.length || 0,
    vip: clientes?.filter(c => c.es_vip).length || 0,
    ausentes: clientes?.filter(c => c.semanas_ausente >= 4).length || 0,
  };

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Clientes VIP</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.vip}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ausentes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ausentes}</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email, teléfono o ID..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={!clientesFiltrados || clientesFiltrados.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>

            <Button asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Importando...' : 'Importar CSV'}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">VIP</label>
            <Select value={filtroVIP} onValueChange={setFiltroVIP}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por VIP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="no_vip">No VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Semanas Ausente</label>
            <Select value={filtroSemanas} onValueChange={setFiltroSemanas}>
              <SelectTrigger>
                <SelectValue placeholder="Semanas ausente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="0-4">0-4 semanas</SelectItem>
                <SelectItem value="5-12">5-12 semanas</SelectItem>
                <SelectItem value="13+">13+ semanas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Profesional</label>
            <Select value={filtroProfesional} onValueChange={setFiltroProfesional}>
              <SelectTrigger>
                <SelectValue placeholder="Profesional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {profesionalesUnicos.map(p => (
                  <SelectItem key={p} value={p!}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Estado Cita</label>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger>
                <SelectValue placeholder="Estado de cita" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {estadosUnicos.map(e => (
                  <SelectItem key={e} value={e!}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Cliente</TableHead>
                    <TableHead className="min-w-[120px]">Contacto</TableHead>
                    <TableHead className="text-center w-[60px]">Citas</TableHead>
                    <TableHead className="min-w-[100px]">Última Visita</TableHead>
                    <TableHead className="min-w-[120px]">Profesional</TableHead>
                    <TableHead className="text-center w-[80px]">Ausente</TableHead>
                    <TableHead className="text-center w-[50px]">VIP</TableHead>
                    <TableHead className="text-center w-[60px]">Ficha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : clientesFiltrados?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No se encontraron clientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientesFiltrados?.map((cliente) => (
                      <TableRow
                        key={cliente.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/clientes-reporte/${cliente.id}`)}
                      >
                        <TableCell>
                          <div className="font-medium">{cliente.nombre_completo}</div>
                          {cliente.ultimo_servicio && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {cliente.ultimo_servicio}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{cliente.telefono_movil || '-'}</div>
                          {cliente.email && (
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {cliente.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{cliente.cantidad_citas || 0}</TableCell>
                        <TableCell>
                          {cliente.fecha_ultimo_servicio 
                            ? format(new Date(cliente.fecha_ultimo_servicio), 'dd/MM/yyyy')
                            : <span className="text-muted-foreground">Sin visitas</span>}
                        </TableCell>
                        <TableCell>
                          <span className="truncate max-w-[120px] block">
                            {cliente.profesional_ultimo_servicio || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={cliente.semanas_ausente >= 13 ? "destructive" : cliente.semanas_ausente >= 4 ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {cliente.semanas_ausente ?? 0} sem
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {cliente.es_vip && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {cliente.cliente_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/clientes/${cliente.cliente_id}`);
                              }}
                              title="Ver Ficha del Cliente"
                            >
                              <FileUser className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}