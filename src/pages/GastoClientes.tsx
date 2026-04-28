import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Search, Download, TrendingUp, Users, Trophy } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

  const limit = 50;

  // Query para obtener datos
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['gasto-clientes', page, searchTerm],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: 'monto_facturado_final_mxn',
        sortOrder: 'desc',
      });

      if (searchTerm) params.append('search', searchTerm);

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

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "CL";

  const getTier = (cliente: GastoCliente): "VIP" | "Regular" | "Nuevo" => {
    const historial = Math.max(
      cliente.visitas_registradas || 0,
      cliente.cantidad_citas || 0,
      cliente.cantidad_citas_periodo || 0,
    );

    if (historial >= 20) return "VIP";
    if (historial >= 5) return "Regular";
    return "Nuevo";
  };

  const getTierBadge = (tier: "VIP" | "Regular" | "Nuevo") => {
    if (tier === "VIP") {
      return (
        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400">
          VIP
        </Badge>
      );
    }

    if (tier === "Regular") {
      return <Badge>Regular</Badge>;
    }

    return <Badge variant="secondary">Nuevo</Badge>;
  };

  const rankingData = useMemo(() => {
    const data: GastoCliente[] = response?.data || [];
    return [...data].sort((a, b) => b.monto_facturado_final_mxn - a.monto_facturado_final_mxn);
  }, [response?.data]);

  const totalClientes = rankingData.length;
  const totalFacturado = rankingData.reduce((sum, c) => sum + c.monto_facturado_final_mxn, 0);
  const gastoPromedio = totalClientes > 0 ? totalFacturado / totalClientes : 0;
  const clienteTop = rankingData[0];

  const hasRows = rankingData.length > 0;
  const pageStart = (page - 1) * limit;

  const rankingRows = rankingData.map((cliente, idx) => ({
    ...cliente,
    posicion: pageStart + idx + 1,
  }));

  const visitasPromedio = totalClientes > 0
    ? rankingData.reduce((sum, c) => sum + (c.cantidad_citas_periodo || c.cantidad_citas || 0), 0) / totalClientes
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
            <CardTitle className="text-sm font-medium">Cliente Top</CardTitle>
            <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{clienteTop?.cliente || "Sin datos"}</div>
            <p className="text-xs text-muted-foreground">
              {clienteTop ? formatCurrency(clienteTop.monto_facturado_final_mxn) : "Sin facturación"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto promedio por cliente</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(gastoPromedio)}</div>
            <p className="text-xs text-muted-foreground">{totalClientes} clientes analizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total facturado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFacturado)}</div>
            <p className="text-xs text-muted-foreground">Visitas promedio: {visitasPromedio.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda y ordenamiento */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de clientes</CardTitle>
          <CardDescription>Ordenado por total gastado (MXN) de mayor a menor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o teléfono..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground md:w-auto">
              Orden: mayor a menor por total gastado (MXN)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            Mostrando {rankingRows.length} de {response?.pagination?.total || 0} clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando datos...</div>
          ) : !hasRows ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay datos disponibles. Importa un archivo CSV para comenzar.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Pos.</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead className="text-right">Visitas</TableHead>
                      <TableHead className="text-right">Total gastado</TableHead>
                      <TableHead className="text-center">Segmento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankingRows.map((cliente) => {
                      const tier = getTier(cliente);
                      const visitas = cliente.cantidad_citas || cliente.visitas_registradas || cliente.cantidad_citas_periodo || 0;
                      return (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-semibold">#{cliente.posicion}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{getInitials(cliente.cliente)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium leading-none">{cliente.cliente}</p>
                              <p className="text-xs text-muted-foreground">{cliente.email || "Sin email"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{cliente.telefono || '-'}</TableCell>
                        <TableCell className="text-right">{visitas}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(cliente.monto_facturado_final_mxn)}</TableCell>
                        <TableCell className="text-center">{getTierBadge(tier)}</TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Página {page} de {response?.pagination?.totalPages || 1}
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
                    disabled={page >= (response?.pagination?.totalPages || 1)}
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
