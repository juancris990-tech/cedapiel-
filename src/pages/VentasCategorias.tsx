import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Download, TrendingUp, Package, Percent, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function VentasCategorias() {
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: categorias, isLoading, refetch } = useQuery({
    queryKey: ['ventas-categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ventas_por_categoria_servicio')
        .select('*')
        .order('cantidad_servicios', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast.error("Por favor selecciona un archivo CSV o Excel");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const response = await supabase.functions.invoke('ventas-categorias-importar', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;
      toast.success(result.message || 'Archivo importado correctamente');
      refetch();
    } catch (error) {
      console.error('Error al subir archivo:', error);
      toast.error(error instanceof Error ? error.message : 'Error al importar archivo');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const exportToCSV = () => {
    if (!categorias || categorias.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const headers = ['Categoría de Servicio', 'Cantidad', 'Porcentaje (%)'];
    const csvContent = [
      headers.join(','),
      ...categorias.map(cat => 
        `"${cat.categoria_servicio}",${cat.cantidad_servicios},${cat.porcentaje_participacion}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ventas_categorias_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Datos exportados correctamente");
  };

  // Filtrar por búsqueda
  const filteredData = categorias?.filter(cat =>
    cat.categoria_servicio.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Estadísticas
  const totalServicios = categorias?.reduce((sum, cat) => sum + cat.cantidad_servicios, 0) || 0;
  const categoriaMasVendida = categorias?.[0];
  const categoriaMenosVendida = categorias?.[categorias.length - 1];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Análisis de Ventas por Categoría</h1>
          <p className="text-muted-foreground">Distribución y estadísticas de servicios vendidos</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" disabled={uploading}>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Importar CSV
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </Button>
          <Button onClick={exportToCSV} variant="outline" disabled={!categorias?.length}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Servicios</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServicios}</div>
            <p className="text-xs text-muted-foreground">Servicios vendidos en total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categoría Más Vendida</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoriaMasVendida?.categoria_servicio || '-'}</div>
            <p className="text-xs text-muted-foreground">
              {categoriaMasVendida?.cantidad_servicios || 0} servicios ({categoriaMasVendida?.porcentaje_participacion || 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menor Participación</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoriaMenosVendida?.categoria_servicio || '-'}</div>
            <p className="text-xs text-muted-foreground">
              {categoriaMenosVendida?.cantidad_servicios || 0} servicios ({categoriaMenosVendida?.porcentaje_participacion || 0}%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            {searchTerm && (
              <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de datos */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Categoría ({filteredData.length} registros)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando datos...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No se encontraron resultados' : 'No hay datos disponibles. Importa un archivo CSV para comenzar.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría de Servicio</TableHead>
                    <TableHead className="text-right">Cantidad Vendida</TableHead>
                    <TableHead className="text-right">% Participación</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((categoria) => (
                    <TableRow key={categoria.id}>
                      <TableCell className="font-medium">{categoria.categoria_servicio}</TableCell>
                      <TableCell className="text-right">{categoria.cantidad_servicios}</TableCell>
                      <TableCell className="text-right">{categoria.porcentaje_participacion}%</TableCell>
                      <TableCell className="text-right">
                        {categoria.porcentaje_participacion >= 50 ? (
                          <Badge variant="default">Alta</Badge>
                        ) : categoria.porcentaje_participacion >= 10 ? (
                          <Badge variant="secondary">Media</Badge>
                        ) : (
                          <Badge variant="outline">Baja</Badge>
                        )}
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
  );
}
