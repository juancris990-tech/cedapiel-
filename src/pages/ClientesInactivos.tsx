import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Search, Download, Filter } from "lucide-react";
import * as XLSX from 'xlsx';

export default function ClientesInactivos() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    profesional: "all",
    dias_min: "",
    dias_max: "",
    ultimo_servicio: "",
    estado: "all",
    search: ""
  });
  const [ordenamiento, setOrdenamiento] = useState({
    order_by: "dias_sin_volver",
    order_dir: "desc"
  });
  const [paginacion, setPaginacion] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [profesionales, setProfesionales] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);

  useEffect(() => {
    cargarClientes();
    cargarFiltrosUnicos();
  }, [filtros, ordenamiento, paginacion.page]);

  const cargarFiltrosUnicos = async () => {
    try {
      const { data: profData } = await supabase
        .from('clientes_inactivos')
        .select('profesional')
        .not('profesional', 'is', null);
      
      const { data: estadoData } = await supabase
        .from('clientes_inactivos')
        .select('estado')
        .not('estado', 'is', null);

      if (profData) {
        const uniqueProf = Array.from(new Set(profData.map(p => p.profesional)));
        setProfesionales(uniqueProf);
      }

      if (estadoData) {
        const uniqueEstados = Array.from(new Set(estadoData.map(e => e.estado)));
        setEstados(uniqueEstados);
      }
    } catch (error) {
      console.error('Error cargando filtros:', error);
    }
  };

  const cargarClientes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: paginacion.page.toString(),
        limit: paginacion.limit.toString(),
        order_by: ordenamiento.order_by,
        order_dir: ordenamiento.order_dir,
        ...(filtros.profesional && filtros.profesional !== 'all' && { profesional: filtros.profesional }),
        ...(filtros.dias_min && { dias_min: filtros.dias_min }),
        ...(filtros.dias_max && { dias_max: filtros.dias_max }),
        ...(filtros.ultimo_servicio && { ultimo_servicio: filtros.ultimo_servicio }),
        ...(filtros.estado && filtros.estado !== 'all' && { estado: filtros.estado }),
        ...(filtros.search && { search: filtros.search }),
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clientes-inactivos?${params}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setClientes(result.data || []);
      if (result.pagination) {
        setPaginacion(prev => ({
          ...prev,
          total: result.pagination.total,
          pages: result.pagination.pages
        }));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al cargar clientes inactivos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          const { data: result, error } = await supabase.functions.invoke('clientes-inactivos-importar', {
            body: { data: jsonData },
          });

          if (error) throw error;

          toast({
            title: "Importación exitosa",
            description: result.message || `Se importaron ${result.inserted} registros`,
          });

          cargarClientes();
        } catch (error: any) {
          toast({
            title: "Error en importación",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    const ws = XLSX.utils.json_to_sheet(clientes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes Inactivos");
    XLSX.writeFile(wb, `clientes_inactivos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clientes Inactivos</h1>
        <div className="flex gap-2">
          <Button onClick={exportarCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <label htmlFor="file-upload">
            <Button variant="default" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Importar CSV
              </span>
            </Button>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={filtros.search}
                onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
                className="pl-8"
              />
            </div>

            <Select
              value={filtros.profesional}
              onValueChange={(value) => setFiltros({ ...filtros, profesional: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Profesional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {profesionales.map(prof => (
                  <SelectItem key={prof} value={prof}>{prof}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Días mínimos"
              value={filtros.dias_min}
              onChange={(e) => setFiltros({ ...filtros, dias_min: e.target.value })}
            />

            <Input
              type="number"
              placeholder="Días máximos"
              value={filtros.dias_max}
              onChange={(e) => setFiltros({ ...filtros, dias_max: e.target.value })}
            />

            <Input
              placeholder="Servicio"
              value={filtros.ultimo_servicio}
              onChange={(e) => setFiltros({ ...filtros, ultimo_servicio: e.target.value })}
            />

            <Select
              value={filtros.estado}
              onValueChange={(value) => setFiltros({ ...filtros, estado: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {estados.map(est => (
                  <SelectItem key={est} value={est}>{est}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Select
              value={ordenamiento.order_by}
              onValueChange={(value) => setOrdenamiento({ ...ordenamiento, order_by: value })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dias_sin_volver">Días sin volver</SelectItem>
                <SelectItem value="ultima_cita">Última cita</SelectItem>
                <SelectItem value="cliente">Nombre cliente</SelectItem>
                <SelectItem value="profesional">Profesional</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={ordenamiento.order_dir}
              onValueChange={(value) => setOrdenamiento({ ...ordenamiento, order_dir: value })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Dirección" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descendente</SelectItem>
                <SelectItem value="asc">Ascendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profesional</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Última Cita</TableHead>
                      <TableHead>Días sin volver</TableHead>
                      <TableHead>Último Servicio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Gasto Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell>{cliente.profesional}</TableCell>
                        <TableCell className="font-medium">{cliente.cliente}</TableCell>
                        <TableCell>{cliente.email || '-'}</TableCell>
                        <TableCell>{cliente.telefono || cliente.numero_sms || '-'}</TableCell>
                        <TableCell>
                          {cliente.ultima_cita 
                            ? new Date(cliente.ultima_cita).toLocaleDateString('es-MX')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${
                            cliente.dias_sin_volver > 365 ? 'text-red-600' : 
                            cliente.dias_sin_volver > 180 ? 'text-orange-600' : 
                            'text-yellow-600'
                          }`}>
                            {cliente.dias_sin_volver || '-'}
                          </span>
                        </TableCell>
                        <TableCell>{cliente.ultimo_servicio || '-'}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded text-xs bg-muted">
                            {cliente.estado || '-'}
                          </span>
                        </TableCell>
                        <TableCell>${cliente.gasto_total_mxn?.toFixed(2) || '0.00'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {clientes.length} de {paginacion.total} registros
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPaginacion(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={paginacion.page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPaginacion(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={paginacion.page >= paginacion.pages}
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
