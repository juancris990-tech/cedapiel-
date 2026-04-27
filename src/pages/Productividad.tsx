import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Upload, TrendingUp, Users, DollarSign, Activity } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function Productividad() {
  const [searchTerm, setSearchTerm] = useState("");
  const [profesionalFilter, setProfesionalFilter] = useState<string>("all");
  const [servicioFilter, setServicioFilter] = useState<string>("all");
  const [uploading, setUploading] = useState(false);

  const { data: productividad = [], isLoading, refetch } = useQuery({
    queryKey: ['productividad'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resumen_productividad_personal')
        .select('*')
        .order('facturado_mxn', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Obtener listas únicas para filtros (excluir fila de totales)
  const datosParaFiltros = productividad.filter((p: any) => p.profesional !== '_TOTALES_GLOBALES');
  const profesionales = Array.from(new Set(datosParaFiltros.map((p: any) => p.profesional))).sort();
  const servicios = Array.from(new Set(datosParaFiltros.map((p: any) => p.servicio))).sort();

  // Obtener totales globales de la fila especial
  const filaGlobal = productividad.find((item: any) => item.profesional === '_TOTALES_GLOBALES');
  const completadasGlobal = filaGlobal?.completadas || 0; // Usar Completed1 = 81
  const canceladasGlobal = filaGlobal?.canceladas || 0; // Usar Cancelled1 = 21
  const noShowGlobal = filaGlobal?.no_show || 0; // Usar DidNotShow1 = 0

  // Filtrar datos para mostrar (sin la fila global)
  const datosIndividuales = productividad.filter((item: any) => item.profesional !== '_TOTALES_GLOBALES');
  
  // Aplicar filtros solo a datos individuales
  const filteredIndividual = datosIndividuales.filter((item: any) => {
    const matchesSearch =
      item.profesional?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.servicio?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProfesional = profesionalFilter === "all" || item.profesional === profesionalFilter;
    const matchesServicio = servicioFilter === "all" || item.servicio === servicioFilter;
    return matchesSearch && matchesProfesional && matchesServicio;
  });
  
  // Calcular total facturado de los datos individuales
  const totalFacturado = filteredIndividual.reduce((sum: number, item: any) => 
    sum + (item.facturado_mxn || 0), 0
  );

  const totalCitas = completadasGlobal + canceladasGlobal + noShowGlobal;
  const noShowRate = totalCitas > 0 
    ? ((noShowGlobal / totalCitas) * 100).toFixed(1)
    : '0.0';

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Debes iniciar sesión');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/productividad-importar`,
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
        throw new Error(result.error || 'Error al importar');
      }

      toast.success(result.message || 'Importación exitosa');
      refetch();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al importar archivo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleExport = () => {
    const exportData = filteredIndividual.map((item: any) => ({
      'Profesional': item.profesional,
      'Servicio': item.servicio,
      'Completadas': item.completadas || 0,
      'Facturado (MXN)': item.facturado_mxn || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productividad');
    XLSX.writeFile(wb, `productividad_personal_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Datos exportados exitosamente');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount || 0);
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Productividad del Personal</h1>
            <p className="text-muted-foreground mt-1">
              Análisis detallado de citas y servicios por profesional
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button asChild disabled={uploading}>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Importando...' : 'Importar CSV'}
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleImport}
                  disabled={uploading}
                />
              </label>
            </Button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalFacturado)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Citas Completadas</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completadasGlobal}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Show Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{noShowRate}%</div>
              <p className="text-xs text-muted-foreground">{noShowGlobal} no-shows</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelaciones</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{canceladasGlobal}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <Input
                  placeholder="Profesional o servicio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Profesional</Label>
                <Select value={profesionalFilter} onValueChange={setProfesionalFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {profesionales.map((p: any) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Servicio</Label>
                <Select value={servicioFilter} onValueChange={setServicioFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {servicios.map((s: any) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(searchTerm || profesionalFilter !== "all" || servicioFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchTerm('');
                  setProfesionalFilter('all');
                  setServicioFilter('all');
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Productividad</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando datos...
              </div>
            ) : filteredIndividual.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos disponibles. Importa un archivo CSV para comenzar.
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profesional</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead className="text-right">Completadas</TableHead>
                      <TableHead className="text-right">Facturado (MXN)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIndividual.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.profesional}</TableCell>
                        <TableCell>{item.servicio}</TableCell>
                        <TableCell className="text-right">{item.completadas || 0}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.facturado_mxn || 0)}
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
}
