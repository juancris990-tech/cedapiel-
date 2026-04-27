import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, Search, Download, RefreshCw, FileText, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { importFacturacionDirect } from "@/utils/importFacturacionDirect";
import { cn } from "@/lib/utils";

interface FacturacionDetalle {
  id: number;
  id_factura: string;
  fecha: string;
  cliente: string;
  sucursal: string;
  profesional: string | null;
  tipo: string;
  descripcion: string | null;
  precio_unitario_mxn: number;
  cantidad: number;
  impuesto_mxn: number;
  responsabilidad_paquete_mxn: number;
  monto_mxn: number;
  cantidad_extra: number;
  impuesto_extra_mxn: number;
  responsabilidad_paquete_total_mxn: number;
  monto_total_mxn: number;
}

export default function FacturacionDetalle() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [openClienteCombobox, setOpenClienteCombobox] = useState(false);
  
  // Obtener lista de clientes desde clientes_reporte
  const { data: clientesReporte } = useQuery({
    queryKey: ['clientes-reporte-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes_reporte')
        .select('cliente_id, nombre_completo')
        .order('nombre_completo');
      
      if (error) throw error;
      return data || [];
    },
  });
  
  // Función de importación manual
  const handleManualImport = async () => {
    if (isImporting) return;
    setIsImporting(true);
    
    try {
      console.log('🚀 Iniciando importación manual...');
      const result = await importFacturacionDirect('/temp-import.xlsx');
      console.log('✅ Importación exitosa:', result);
      toast({
        title: "Importación exitosa",
        description: `Se importaron ${result.inserted} registros de facturación`,
      });
      queryClient.invalidateQueries({ queryKey: ['facturacion-detalle'] });
    } catch (error: any) {
      console.error('❌ Error en importación:', error);
      toast({
        title: "Error en importación",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  const [filtros, setFiltros] = useState({
    id_factura: "",
    fecha_inicio: "",
    fecha_fin: "",
    cliente: "",
    cliente_id: "",
    sucursal: "",
    tipo: "all"
  });
  
  const [paginacion, setPaginacion] = useState({
    page: 1,
    limit: 50
  });

  // Fetch data
  const { data: facturas, isLoading, refetch } = useQuery({
    queryKey: ['facturacion-detalle', filtros, paginacion],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autorizado');

      const params = new URLSearchParams({
        page: paginacion.page.toString(),
        limit: paginacion.limit.toString(),
        ...(filtros.id_factura && { id_factura: filtros.id_factura }),
        ...(filtros.fecha_inicio && { fecha_inicio: filtros.fecha_inicio }),
        ...(filtros.fecha_fin && { fecha_fin: filtros.fecha_fin }),
        ...(filtros.cliente && { cliente: filtros.cliente }),
        ...(filtros.cliente_id && { cliente_id: filtros.cliente_id }),
        ...(filtros.sucursal && { sucursal: filtros.sucursal }),
        ...(filtros.tipo && filtros.tipo !== 'all' && { tipo: filtros.tipo }),
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facturacion-detalle?${params}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al cargar datos');
      return response.json();
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autorizado');

      // Enviar archivo directamente como FormData
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facturacion-importar`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al importar archivo');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Importación exitosa",
        description: `Se importaron ${data.inserted} de ${data.total_records} registros`,
      });
      queryClient.invalidateQueries({ queryKey: ['facturacion-detalle'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al importar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Archivo inválido",
          description: "Por favor selecciona un archivo Excel (.xlsx o .xls)",
          variant: "destructive",
        });
        return;
      }
      importMutation.mutate(file);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  const exportToCSV = () => {
    if (!facturas?.data?.length) {
      toast({
        title: "Sin datos",
        description: "No hay datos para exportar",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      'ID Factura', 'Fecha', 'Cliente', 'Sucursal', 'Profesional', 'Tipo',
      'Descripción', 'Precio Unitario', 'Cantidad', 'Impuesto', 
      'Responsabilidad Paquete', 'Monto', 'Cantidad Extra', 'Impuesto Extra',
      'Responsabilidad Paquete Total', 'Monto Total'
    ];

    const rows = facturas.data.map((f: FacturacionDetalle) => [
      f.id_factura,
      f.fecha,
      f.cliente,
      f.sucursal,
      f.profesional || '',
      f.tipo,
      f.descripcion || '',
      f.precio_unitario_mxn,
      f.cantidad,
      f.impuesto_mxn,
      f.responsabilidad_paquete_mxn,
      f.monto_mxn,
      f.cantidad_extra,
      f.impuesto_extra_mxn,
      f.responsabilidad_paquete_total_mxn,
      f.monto_total_mxn,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `facturacion_detalle_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Facturación Detallada</h1>
            <p className="text-muted-foreground">
              Gestión y análisis de detalles de facturación
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleManualImport} 
              variant="default"
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Archivo Temporal
                </>
              )}
            </Button>
            <Button onClick={() => refetch()} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button asChild>
              <label className="cursor-pointer flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Importar Excel
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={importMutation.isPending}
                />
              </label>
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <div>
              <Label>ID Factura</Label>
              <Input
                placeholder="Buscar..."
                value={filtros.id_factura}
                onChange={(e) => setFiltros({ ...filtros, id_factura: e.target.value })}
              />
            </div>
            <div>
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={filtros.fecha_inicio}
                onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
              />
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={filtros.fecha_fin}
                onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
              />
            </div>
            <div>
              <Label>Cliente (Nombre)</Label>
              <Input
                placeholder="Buscar..."
                value={filtros.cliente}
                onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
              />
            </div>
            <div>
              <Label>ID Cliente</Label>
              <Popover open={openClienteCombobox} onOpenChange={setOpenClienteCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openClienteCombobox}
                    className="w-full justify-between"
                  >
                    {filtros.cliente_id
                      ? clientesReporte?.find((c) => c.cliente_id?.toString() === filtros.cliente_id)?.nombre_completo
                      : "Seleccionar cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandEmpty>No se encontró el cliente.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-auto">
                      {clientesReporte?.map((cliente) => (
                        <CommandItem
                          key={cliente.cliente_id}
                          value={`${cliente.cliente_id} ${cliente.nombre_completo}`}
                          onSelect={() => {
                            setFiltros({ ...filtros, cliente_id: cliente.cliente_id?.toString() || "" });
                            setOpenClienteCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filtros.cliente_id === cliente.cliente_id?.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {cliente.nombre_completo} (ID: {cliente.cliente_id})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {filtros.cliente_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-6 px-2 text-xs"
                  onClick={() => setFiltros({ ...filtros, cliente_id: "" })}
                >
                  Limpiar
                </Button>
              )}
            </div>
            <div>
              <Label>Sucursal</Label>
              <Input
                placeholder="Buscar..."
                value={filtros.sucursal}
                onChange={(e) => setFiltros({ ...filtros, sucursal: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={filtros.tipo}
                onValueChange={(value) => setFiltros({ ...filtros, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Product">Product</SelectItem>
                  <SelectItem value="Appointment">Appointment</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="Discount">Discount</SelectItem>
                  <SelectItem value="Adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setPaginacion({ ...paginacion, page: 1 })}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>
        </Card>

        {/* Tabla */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Profesional</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : !facturas?.data?.length ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center">
                      <div className="py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No se encontraron registros</p>
                        <p className="text-sm">Importa un archivo Excel para comenzar</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  facturas.data.map((factura: FacturacionDetalle) => (
                    <TableRow key={factura.id}>
                      <TableCell className="font-medium">{factura.id_factura}</TableCell>
                      <TableCell>{format(new Date(factura.fecha), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{factura.cliente}</TableCell>
                      <TableCell>{factura.sucursal}</TableCell>
                      <TableCell>{factura.profesional || '-'}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs bg-primary/10 text-primary">
                          {factura.tipo}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{factura.descripcion || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(factura.precio_unitario_mxn)}</TableCell>
                      <TableCell className="text-right">{factura.cantidad}</TableCell>
                      <TableCell className="text-right">{formatCurrency(factura.monto_mxn)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(factura.monto_total_mxn)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {facturas?.data?.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {((paginacion.page - 1) * paginacion.limit) + 1} a {Math.min(paginacion.page * paginacion.limit, facturas.count || 0)} de {facturas.count || 0} registros
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginacion({ ...paginacion, page: paginacion.page - 1 })}
                  disabled={paginacion.page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginacion({ ...paginacion, page: paginacion.page + 1 })}
                  disabled={paginacion.page >= (facturas.total_pages || 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
