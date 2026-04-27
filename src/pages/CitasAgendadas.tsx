import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, Search, Calendar, DollarSign, Users, TrendingUp, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";

const CitasAgendadas = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSucursal, setFilterSucursal] = useState("all");
  const [filterProfesional, setFilterProfesional] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [filterRetencion, setFilterRetencion] = useState("all");
  const [filterReagendado, setFilterReagendado] = useState("all");
  const [orderBy, setOrderBy] = useState("fecha");
  const [orderDir, setOrderDir] = useState("desc");

  const { data: citasData, isLoading, refetch } = useQuery({
    queryKey: ['citas-agendadas', searchTerm, filterSucursal, filterProfesional, filterEstado, filterRetencion, filterReagendado, orderBy, orderDir],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterSucursal && filterSucursal !== 'all') params.append('sucursal', filterSucursal);
      if (filterProfesional && filterProfesional !== 'all') params.append('profesional', filterProfesional);
      if (filterEstado && filterEstado !== 'all') params.append('estado', filterEstado);
      if (filterRetencion && filterRetencion !== 'all') params.append('retencion', filterRetencion);
      if (filterReagendado && filterReagendado !== 'all') params.append('reagendado', filterReagendado);
      params.append('orderBy', orderBy);
      params.append('orderDir', orderDir);
      params.append('limit', '100');

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Debes iniciar sesión");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/citas-agendadas?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar datos');
      }

      return await response.json();
    },
  });

  const handleFileUpload = async () => {
    if (!file) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Debes iniciar sesión para importar archivos");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/citas-agendadas-importar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al importar archivo');
      }

      toast.success(result.message || "Archivo importado correctamente");
      setFile(null);
      refetch();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : "Error al importar archivo");
    } finally {
      setUploading(false);
    }
  };

  const exportToExcel = () => {
    if (!citasData?.data?.length) {
      toast.error("No hay datos para exportar");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(citasData.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CitasAgendadas");
    XLSX.writeFile(wb, `citas_agendadas_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Datos exportados correctamente");
  };

  // Obtener valores únicos para filtros
  const sucursales = [...new Set(citasData?.data?.map((d: any) => d.sucursal).filter(Boolean))];
  const profesionales = [...new Set(citasData?.data?.map((d: any) => d.profesional).filter(Boolean))];
  const estados = [...new Set(citasData?.data?.map((d: any) => d.estado).filter(Boolean))];

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Citas Agendadas</h1>
        </div>

        {/* Estadísticas */}
        {citasData?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Citas</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{citasData.stats.totalCitas}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completadas</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{citasData.stats.citasCompletadas}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${citasData.stats.valorTotal}</div>
                <p className="text-xs text-muted-foreground">
                  Promedio: ${citasData.stats.valorPromedio}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retención</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{citasData.stats.porcentajeRetencion}%</div>
                <p className="text-xs text-muted-foreground">
                  Reagendados: {citasData.stats.porcentajeReagendados}%
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Importar CSV */}
        <Card>
          <CardHeader>
            <CardTitle>Importar Citas Agendadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button onClick={handleFileUpload} disabled={!file || uploading}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Importando..." : "Importar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filtros y búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Select value={filterSucursal} onValueChange={setFilterSucursal}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {sucursales.map((s: any) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterProfesional} onValueChange={setFilterProfesional}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los profesionales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {profesionales.map((p: any) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {estados.map((e: any) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterRetencion} onValueChange={setFilterRetencion}>
                <SelectTrigger>
                  <SelectValue placeholder="Retención" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Y">Retenidos (Y)</SelectItem>
                  <SelectItem value="N">No Retenidos (N)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterReagendado} onValueChange={setFilterReagendado}>
                <SelectTrigger>
                  <SelectValue placeholder="Reagendado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Y">Reagendados (Y)</SelectItem>
                  <SelectItem value="N">No Reagendados (N)</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={exportToExcel} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de datos */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Citas Agendadas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : citasData?.data?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos. Importa un archivo de citas agendadas para comenzar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Profesional</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Retención</TableHead>
                      <TableHead>Reagendado</TableHead>
                      <TableHead>Facturado</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Contacto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {citasData?.data?.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm">{row.fecha}</TableCell>
                        <TableCell className="text-sm">
                          {row.hora_inicio} - {row.hora_fin}
                        </TableCell>
                        <TableCell className="font-medium">{row.cliente}</TableCell>
                        <TableCell className="text-sm">{row.profesional}</TableCell>
                        <TableCell className="text-sm">{row.servicio}</TableCell>
                        <TableCell className="text-sm">{row.sucursal}</TableCell>
                        <TableCell>
                          <Badge variant={row.estado === 'Completed' ? 'default' : 'secondary'}>
                            {row.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{row.equipo}</TableCell>
                        <TableCell>
                          {row.retencion === 'Y' ? (
                            <Badge variant="default" className="bg-green-500">Y</Badge>
                          ) : (
                            <Badge variant="outline">N</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.reagendado === 'Y' ? (
                            <Badge variant="default" className="bg-blue-500">Y</Badge>
                          ) : (
                            <Badge variant="outline">N</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.facturado === 'Y' ? (
                            <Badge variant="default">Y</Badge>
                          ) : (
                            <Badge variant="outline">N</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${row.valor_mxn?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.telefono && <div>Tel: {row.telefono}</div>}
                          {row.email && <div className="text-xs text-muted-foreground">{row.email}</div>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CitasAgendadas;