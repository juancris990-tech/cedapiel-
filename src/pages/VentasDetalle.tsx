import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
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
import { Upload, Search, Download, TrendingUp, DollarSign, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function VentasDetalle() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroSucursal, setFiltroSucursal] = useState<string>("todos");
  const [filtroProfesional, setFiltroProfesional] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: ventas, isLoading, refetch } = useQuery({
    queryKey: ['ventas-detalle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ventas_detalle')
        .select('*')
        .order('fecha_venta', { ascending: false })
        .order('id_factura', { ascending: false });
      
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

      const response = await supabase.functions.invoke('ventas-detalle-importar', {
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
      toast.error(error.message || 'Error al importar ventas');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleExportCSV = () => {
    if (!ventasFiltradas || ventasFiltradas.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const headers = [
      'Factura', 'Fecha', 'Cliente', 'Sucursal', 'Profesional', 'Tipo',
      'Descripción', 'Precio Unit.', 'Cantidad', 'Monto Línea', 'Impuesto'
    ];

    const rows = ventasFiltradas.map(v => [
      v.id_factura,
      format(new Date(v.fecha_venta), 'dd/MM/yyyy'),
      v.cliente,
      v.sucursal,
      v.profesional || '',
      v.tipo,
      v.descripcion || '',
      v.precio_unitario_mxn.toFixed(2),
      v.cantidad.toFixed(2),
      v.monto_linea_mxn.toFixed(2),
      v.impuesto_mxn.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ventas-detalle-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const ventasFiltradas = ventas?.filter(venta => {
    const matchBusqueda = busqueda === "" || 
      venta.cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
      venta.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      venta.id_factura?.includes(busqueda);

    const matchSucursal = filtroSucursal === "todos" || venta.sucursal === filtroSucursal;
    const matchProfesional = filtroProfesional === "todos" || venta.profesional === filtroProfesional;
    const matchTipo = filtroTipo === "todos" || venta.tipo === filtroTipo;

    // Comparar solo fechas sin horas para evitar problemas de zona horaria
    const fechaVenta = new Date(venta.fecha_venta);
    fechaVenta.setHours(0, 0, 0, 0);
    
    let matchFechaInicio = true;
    if (fechaInicio) {
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      matchFechaInicio = fechaVenta >= inicio;
    }
    
    let matchFechaFin = true;
    if (fechaFin) {
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      matchFechaFin = fechaVenta <= fin;
    }

    return matchBusqueda && matchSucursal && matchProfesional && matchTipo && matchFechaInicio && matchFechaFin;
  });

  const sucursalesUnicas = Array.from(new Set(ventas?.map(v => v.sucursal).filter(Boolean)));
  const profesionalesUnicos = Array.from(new Set(ventas?.map(v => v.profesional).filter(Boolean)));
  const tiposUnicos = Array.from(new Set(ventas?.map(v => v.tipo).filter(Boolean)));

  const stats = {
    totalVendido: ventasFiltradas?.reduce((sum, v) => sum + (v.monto_linea_mxn || 0), 0) || 0,
    totalFacturas: new Set(ventasFiltradas?.map(v => v.id_factura)).size,
    totalLineas: ventasFiltradas?.length || 0,
  };

  const statsPorTipo = tiposUnicos.map(tipo => ({
    tipo,
    total: ventasFiltradas?.filter(v => v.tipo === tipo).reduce((sum, v) => sum + (v.monto_linea_mxn || 0), 0) || 0
  }));

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'Appointment': return 'default';
      case 'Product': return 'secondary';
      case 'Service': return 'outline';
      case 'Discount': return 'destructive';
      case 'Adjustment': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reporte de Ventas Detallado</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalVendido.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">MXN</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFacturas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Líneas de Venta</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLineas}</div>
            </CardContent>
          </Card>
        </div>

        {/* Ventas por Tipo */}
        {statsPorTipo.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statsPorTipo.map(stat => (
                  <div key={stat.tipo} className="space-y-1">
                    <Badge variant={getTipoBadgeVariant(stat.tipo)}>{stat.tipo}</Badge>
                    <p className="text-lg font-bold">
                      ${stat.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, descripción o factura..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={!ventasFiltradas || ventasFiltradas.length === 0}
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input
            type="date"
            placeholder="Fecha inicio"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
          <Input
            type="date"
            placeholder="Fecha fin"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />

          <Select value={filtroSucursal} onValueChange={setFiltroSucursal}>
            <SelectTrigger>
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {sucursalesUnicas.map(s => (
                <SelectItem key={s} value={s!}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {tiposUnicos.map(t => (
                <SelectItem key={t} value={t!}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Profesional</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Impuesto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : ventasFiltradas?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center">
                        No se encontraron ventas
                      </TableCell>
                    </TableRow>
                  ) : (
                    ventasFiltradas?.map((venta) => (
                      <TableRow key={venta.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{venta.id_factura}</TableCell>
                        <TableCell>
                          {format(new Date(venta.fecha_venta), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>{venta.cliente}</TableCell>
                        <TableCell>{venta.sucursal}</TableCell>
                        <TableCell>{venta.profesional}</TableCell>
                        <TableCell>
                          <Badge variant={getTipoBadgeVariant(venta.tipo)}>{venta.tipo}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{venta.descripcion}</TableCell>
                        <TableCell className="text-right">
                          ${venta.precio_unitario_mxn.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">{venta.cantidad.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${venta.monto_linea_mxn.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ${venta.impuesto_mxn.toFixed(2)}
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
    </AppLayout>
  );
}