import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Search, TrendingUp, Users, DollarSign, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function ProyeccionValorFuturo() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("valor_futuro");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [uploading, setUploading] = useState(false);

  const { data: proyecciones = [], isLoading, refetch } = useQuery({
    queryKey: ['proyeccion-valor-futuro'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proyeccion_valor_futuro')
        .select('*')
        .order('valor_futuro_mxn', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('proyeccion-futuro-importar', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast.success(`Importación exitosa: ${response.data.registros} registros cargados`);
      refetch();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al importar archivo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Filtrado
  const filteredData = proyecciones.filter(p => {
    const matchesSearch = p.profesional.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFiltro === "todos" || p.tipo === tipoFiltro;
    return matchesSearch && matchesTipo;
  });

  // Ordenamiento
  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case 'valor_futuro':
        return (b.valor_futuro_mxn || 0) - (a.valor_futuro_mxn || 0);
      case 'servicios':
        return (b.cantidad_servicios || 0) - (a.cantidad_servicios || 0);
      case 'clientes':
        return (b.cantidad_clientes || 0) - (a.cantidad_clientes || 0);
      case 'nuevos':
        return (b.nuevos_clientes || 0) - (a.nuevos_clientes || 0);
      default:
        return 0;
    }
  });

  // Estadísticas
  const totalProyectado = proyecciones.reduce((sum, p) => sum + (p.valor_futuro_mxn || 0), 0);
  const totalServicios = proyecciones.reduce((sum, p) => sum + (p.cantidad_servicios || 0), 0);
  const totalClientes = proyecciones.reduce((sum, p) => sum + (p.cantidad_clientes || 0), 0);
  const totalNuevos = proyecciones.reduce((sum, p) => sum + (p.nuevos_clientes || 0), 0);
  const topProfesional = proyecciones.length > 0 
    ? proyecciones.reduce((max, p) => (p.valor_futuro_mxn || 0) > (max.valor_futuro_mxn || 0) ? p : max)
    : null;

  const formatCurrency = (value: number | null) => {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Proyección Valor Futuro</h1>
            <p className="text-muted-foreground">
              Proyección de ingresos por profesionales, sucursales y servicios
              {tipoFiltro !== "todos" && (
                <span className="ml-2 font-semibold">
                  • Mostrando: {tipoFiltro === "profesional" ? "Profesionales" : 
                               tipoFiltro === "sucursal" ? "Sucursales" : "Servicios"}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" disabled={uploading}>
              <label className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Importando...' : 'Importar CSV'}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleImport}
                  disabled={uploading}
                />
              </label>
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Proyectado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalProyectado)}</div>
              <p className="text-xs text-muted-foreground">Valor futuro total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Servicios Agendados</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalServicios}</div>
              <p className="text-xs text-muted-foreground">Total de servicios</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Totales</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClientes}</div>
              <p className="text-xs text-muted-foreground">Clientes involucrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nuevos Clientes</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalNuevos}</div>
              <p className="text-xs text-muted-foreground">Clientes nuevos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Profesional</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold truncate">{topProfesional?.profesional || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(topProfesional?.valor_futuro_mxn || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros y Búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="profesional">Profesionales</SelectItem>
                  <SelectItem value="sucursal">Sucursales</SelectItem>
                  <SelectItem value="servicio">Servicios</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor_futuro">Mayor Valor Futuro</SelectItem>
                  <SelectItem value="servicios">Mayor Servicios</SelectItem>
                  <SelectItem value="clientes">Mayor Clientes</SelectItem>
                  <SelectItem value="nuevos">Más Nuevos Clientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Detalle de Proyecciones ({sortedData.length} registros)
                {tipoFiltro !== "todos" && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    - Filtrando por {tipoFiltro === "profesional" ? "profesionales" : 
                                     tipoFiltro === "sucursal" ? "sucursales" : "servicios"}
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Servicios</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Nuevos</TableHead>
                    <TableHead className="text-right">Valor Futuro</TableHead>
                    <TableHead className="text-right">Total Agendado</TableHead>
                    <TableHead className="text-right">Reservas Online</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Cargando datos...
                      </TableCell>
                    </TableRow>
                  ) : sortedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No hay datos. Importa un archivo CSV para comenzar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedData.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            row.tipo === 'profesional' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            row.tipo === 'sucursal' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          }`}>
                            {row.tipo === 'profesional' ? '👤 Profesional' : 
                             row.tipo === 'sucursal' ? '🏢 Sucursal' : '💼 Servicio'}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.profesional}
                          <span className="block text-xs text-muted-foreground">
                            {row.tipo === 'profesional' ? 'Personal' : 
                             row.tipo === 'sucursal' ? 'Ubicación' : 'Tipo de servicio'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{row.cantidad_servicios || 0}</TableCell>
                        <TableCell className="text-right">{row.cantidad_clientes || 0}</TableCell>
                        <TableCell className="text-right">{row.nuevos_clientes || 0}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(row.valor_futuro_mxn)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.valor_total_agendado_mxn)}
                        </TableCell>
                        <TableCell className="text-right">{row.reservas_online || 0}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}