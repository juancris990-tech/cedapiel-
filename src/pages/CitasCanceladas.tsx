import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Upload, Search, Download, XCircle, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface CitaCancelada {
  id: number;
  fecha_cita: string;
  cliente: string;
  email: string;
  telefono: string;
  numero_sms: string;
  sucursal: string;
  estado: string;
  fecha_creacion: string;
  staff_registro: string;
  hora_inicio: string;
  hora_fin: string;
  profesional: string;
  servicio: string;
  equipo: string;
  retenido: boolean;
  reagendado: boolean;
  facturado: boolean;
  valor_mxn: number;
}

interface Stats {
  total: number;
  porProfesional: { [key: string]: number };
  porSucursal: { [key: string]: number };
  porEstado: { [key: string]: number };
  valorTotal: number;
}

export default function CitasCanceladas() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filtros, setFiltros] = useState({
    sucursal: "",
    profesional: "",
    estado: "",
    servicio: "",
    fecha_inicio: "",
    fecha_fin: "",
    search: ""
  });
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);

  const { data: citas, isLoading, refetch } = useQuery({
    queryKey: ['citas-canceladas', filtros, page],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '50',
          order_by: 'fecha_cita',
          order_dir: 'desc',
          ...Object.fromEntries(
            Object.entries(filtros).filter(([_, v]) => v !== "")
          )
        });

        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session:', session ? 'exists' : 'null');
        console.log('Fetching URL:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/citas-canceladas?${params.toString()}`);
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/citas-canceladas?${params.toString()}`,
          {
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
          }
        );

        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Data received:', data);
        return data;
      } catch (error) {
        console.error('Query error:', error);
        throw error;
      }
    },
  });

  const stats: Stats | null = citas?.data ? {
    total: citas.count || 0,
    porProfesional: citas.data.reduce((acc: any, c: CitaCancelada) => {
      if (c.profesional) {
        acc[c.profesional] = (acc[c.profesional] || 0) + 1;
      }
      return acc;
    }, {}),
    porSucursal: citas.data.reduce((acc: any, c: CitaCancelada) => {
      acc[c.sucursal] = (acc[c.sucursal] || 0) + 1;
      return acc;
    }, {}),
    porEstado: citas.data.reduce((acc: any, c: CitaCancelada) => {
      if (c.estado) {
        acc[c.estado] = (acc[c.estado] || 0) + 1;
      }
      return acc;
    }, {}),
    valorTotal: citas.data.reduce((sum: number, c: CitaCancelada) => sum + (c.valor_mxn || 0), 0)
  } : null;

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
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          console.log('Datos parseados del archivo:', jsonData.length, 'registros');

          const { data: result, error } = await supabase.functions.invoke('citas-canceladas-importar', {
            body: { data: jsonData }
          });

          if (error) {
            console.error('Error de invocación:', error);
            toast({
              title: "Error en importación",
              description: error.message || "Ocurrió un error",
              variant: "destructive"
            });
            return;
          }

          console.log('Respuesta del servidor:', result);

          if (result.success) {
            toast({
              title: "Importación exitosa",
              description: `Se importaron ${result.inserted} de ${result.total} registros`,
            });
            refetch();
          } else {
            toast({
              title: "Error en importación",
              description: result.error || "Ocurrió un error",
              variant: "destructive"
            });
          }
        } catch (parseError) {
          console.error('Error procesando archivo:', parseError);
          toast({
            title: "Error",
            description: parseError instanceof Error ? parseError.message : "No se pudo procesar el archivo",
            variant: "destructive"
          });
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "No se pudo leer el archivo",
          variant: "destructive"
        });
      };
      
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error general:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo procesar el archivo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const exportToExcel = () => {
    if (!citas?.data) return;
    
    const ws = XLSX.utils.json_to_sheet(citas.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Citas Canceladas");
    XLSX.writeFile(wb, `citas_canceladas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const topProfesional = stats ? Object.entries(stats.porProfesional).sort((a, b) => b[1] - a[1])[0] : null;
  const topSucursal = stats ? Object.entries(stats.porSucursal).sort((a, b) => b[1] - a[1])[0] : null;
  const estadoMasComun = stats ? Object.entries(stats.porEstado).sort((a, b) => b[1] - a[1])[0] : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Citas Canceladas</h1>
          <p className="text-muted-foreground">Análisis detallado de citas canceladas</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline" disabled={!citas?.data}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            variant="default"
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Subiendo..." : "Importar CSV"}
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profesional con más cancelaciones</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{topProfesional?.[0] || "N/A"}</div>
            <p className="text-xs text-muted-foreground">{topProfesional?.[1] || 0} cancelaciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sucursal con más cancelaciones</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{topSucursal?.[0] || "N/A"}</div>
            <p className="text-xs text-muted-foreground">{topSucursal?.[1] || 0} cancelaciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado más común</CardTitle>
            <Badge variant="outline">{estadoMasComun?.[1] || 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{estadoMasComun?.[0] || "N/A"}</div>
            <p className="text-xs text-muted-foreground">Valor total: ${(stats?.valorTotal || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, profesional..."
                value={filtros.search}
                onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
                className="pl-8"
              />
            </div>

            <Input
              type="text"
              placeholder="Sucursal"
              value={filtros.sucursal}
              onChange={(e) => setFiltros({ ...filtros, sucursal: e.target.value })}
            />

            <Input
              type="text"
              placeholder="Profesional"
              value={filtros.profesional}
              onChange={(e) => setFiltros({ ...filtros, profesional: e.target.value })}
            />

            <Input
              type="text"
              placeholder="Estado"
              value={filtros.estado}
              onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            />

            <Input
              type="date"
              placeholder="Fecha inicio"
              value={filtros.fecha_inicio}
              onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
            />

            <Input
              type="date"
              placeholder="Fecha fin"
              value={filtros.fecha_fin}
              onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
            />

            <Button 
              variant="outline" 
              onClick={() => setFiltros({
                sucursal: "",
                profesional: "",
                estado: "",
                servicio: "",
                fecha_inicio: "",
                fecha_fin: "",
                search: ""
              })}
            >
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Citas Canceladas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Profesional</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {citas?.data?.map((cita: CitaCancelada) => (
                      <TableRow key={cita.id}>
                        <TableCell>{new Date(cita.fecha_cita).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{cita.cliente}</TableCell>
                        <TableCell>{cita.profesional}</TableCell>
                        <TableCell>{cita.servicio}</TableCell>
                        <TableCell>{cita.sucursal}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{cita.estado}</Badge>
                        </TableCell>
                        <TableCell>{cita.hora_inicio} - {cita.hora_fin}</TableCell>
                        <TableCell className="text-right">${cita.valor_mxn?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando página {page} de {citas?.totalPages || 1} ({citas?.count || 0} total)
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
                    disabled={page >= (citas?.totalPages || 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}