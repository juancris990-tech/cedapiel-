import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Search, Filter, Download, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface GastoCliente {
  id: number;
  cliente: string;
  email: string | null;
  telefono: string | null;
  numero_sms: string | null;
  visitas_registradas: number;
  cantidad_citas: number;
  valor_citas_mxn: number;
  monto_servicios_facturados_mxn: number;
  monto_productos_facturados_mxn: number;
  monto_descuentos_mxn: number;
  monto_facturado_total_mxn: number;
  cantidad_grupos_citas: number;
  cantidad_citas_periodo: number;
  valor_citas_periodo_mxn: number;
  monto_servicios_facturados_periodo_mxn: number;
  cargo_adicional_mxn: number;
  descuento_periodo_mxn: number;
  monto_facturado_final_mxn: number;
}

export default function GastoClientes() {
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("monto_facturado_final_mxn");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Filtros
  const [montoMin, setMontoMin] = useState("");
  const [montoMax, setMontoMax] = useState("");
  const [citasMin, setCitasMin] = useState("");
  const [citasMax, setCitasMax] = useState("");
  const [conEmail, setConEmail] = useState<string>("todos");

  const limit = 50;

  // Query para obtener datos
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['gasto-clientes', page, searchTerm, sortBy, sortOrder, montoMin, montoMax, citasMin, citasMax, conEmail],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      if (searchTerm) params.append('search', searchTerm);
      if (montoMin) params.append('montoMin', montoMin);
      if (montoMax) params.append('montoMax', montoMax);
      if (citasMin) params.append('citasMin', citasMin);
      if (citasMax) params.append('citasMax', citasMax);
      if (conEmail !== 'todos') params.append('conEmail', conEmail);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gasto-clientes?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al obtener datos');
      return response.json();
    },
  });

  // Manejo de importación de archivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const csvData = XLSX.utils.sheet_to_json(worksheet);

          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast.error('No estás autenticado');
            return;
          }

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gasto-clientes-importar`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ csvData }),
            }
          );

          const result = await response.json();

          if (response.ok) {
            toast.success(`Importación exitosa: ${result.stats.inserted} registros insertados`);
            refetch();
          } else {
            toast.error(result.error || 'Error en la importación');
          }
        } catch (error) {
          console.error('Error procesando archivo:', error);
          toast.error('Error al procesar el archivo');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar el archivo');
      setUploading(false);
    }
  };

  // Exportar a Excel
  const handleExport = () => {
    if (!response?.data || response.data.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(response.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gasto Clientes');
    XLSX.writeFile(wb, `gasto-clientes-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Archivo exportado exitosamente');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  const totalClientes = response?.pagination?.total || 0;
  const totalMonto = response?.data?.reduce((sum: number, c: GastoCliente) => sum + c.monto_facturado_final_mxn, 0) || 0;
  const promedioCitas = response?.data?.length > 0
    ? response.data.reduce((sum: number, c: GastoCliente) => sum + c.cantidad_citas_periodo, 0) / response.data.length
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gasto de Clientes por Periodo</h1>
          <p className="text-muted-foreground">
            Analiza cuánto gasta cada cliente en un periodo determinado
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button asChild>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Importando...' : 'Importar CSV'}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonto)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Citas</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promedioCitas.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtra y busca clientes específicos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nombre, email o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="sortBy">Ordenar por</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sortBy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monto_facturado_final_mxn">Monto Total</SelectItem>
                  <SelectItem value="cantidad_citas_periodo">Número de Citas</SelectItem>
                  <SelectItem value="cliente">Nombre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Label htmlFor="sortOrder">Orden</Label>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
                <SelectTrigger id="sortOrder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descendente</SelectItem>
                  <SelectItem value="asc">Ascendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="montoMin">Monto Mínimo</Label>
              <Input
                id="montoMin"
                type="number"
                placeholder="0"
                value={montoMin}
                onChange={(e) => setMontoMin(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="montoMax">Monto Máximo</Label>
              <Input
                id="montoMax"
                type="number"
                placeholder="Sin límite"
                value={montoMax}
                onChange={(e) => setMontoMax(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="citasMin">Citas Mínimas</Label>
              <Input
                id="citasMin"
                type="number"
                placeholder="0"
                value={citasMin}
                onChange={(e) => setCitasMin(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="citasMax">Citas Máximas</Label>
              <Input
                id="citasMax"
                type="number"
                placeholder="Sin límite"
                value={citasMax}
                onChange={(e) => setCitasMax(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="conEmail">Email</Label>
              <Select value={conEmail} onValueChange={setConEmail}>
                <SelectTrigger id="conEmail">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="true">Con Email</SelectItem>
                  <SelectItem value="false">Sin Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            Mostrando {response?.data?.length || 0} de {totalClientes} clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando datos...</div>
          ) : !response?.data || response.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay datos disponibles. Importa un archivo CSV para comenzar.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead className="text-right">Citas Periodo</TableHead>
                      <TableHead className="text-right">Valor Citas</TableHead>
                      <TableHead className="text-right">Servicios</TableHead>
                      <TableHead className="text-right">Productos</TableHead>
                      <TableHead className="text-right">Descuentos</TableHead>
                      <TableHead className="text-right">Monto Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {response.data.map((cliente: GastoCliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">{cliente.cliente}</TableCell>
                        <TableCell>{cliente.email || '-'}</TableCell>
                        <TableCell>{cliente.telefono || '-'}</TableCell>
                        <TableCell className="text-right">{cliente.cantidad_citas_periodo}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cliente.valor_citas_periodo_mxn)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cliente.monto_servicios_facturados_periodo_mxn)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cliente.monto_productos_facturados_mxn)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cliente.descuento_periodo_mxn)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(cliente.monto_facturado_final_mxn)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Página {page} de {response.pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= response.pagination.totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
