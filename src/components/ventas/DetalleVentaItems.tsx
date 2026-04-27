import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface DetalleVentaItemsProps {
  idVenta: number;
}

export function DetalleVentaItems({ idVenta }: DetalleVentaItemsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value || 0);
  };

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['venta-items-detalle', idVenta],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_ventas_detalle_descuentos')
        .select('*')
        .eq('id_venta', idVenta)
        .order('id_item');
      
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Cargando items...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No hay items para mostrar
      </div>
    );
  }

  const totales = items.reduce((acc, item) => ({
    original: acc.original + (item.subtotal_original_mxn || 0),
    descuento: acc.descuento + (item.descuento_total_mxn || 0),
    final: acc.final + (item.subtotal_final_mxn || 0),
  }), { original: 0, descuento: 0, final: 0 });

  return (
    <div className="p-4 bg-muted/30">
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Servicio/Producto</TableHead>
              <TableHead>Profesional</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Precio Original</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  Descuento
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Monto y porcentaje de descuento aplicado</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableHead>
              <TableHead className="text-right">Precio Final</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id_item}>
                <TableCell>
                  <div className="font-medium">{item.servicio_nombre || 'Sin nombre'}</div>
                  {item.categoria_servicio && (
                    <div className="text-xs text-muted-foreground">{item.categoria_servicio}</div>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {item.profesional_nombre || 'Sin asignar'}
                </TableCell>
                <TableCell className="text-right">{item.cantidad}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(item.precio_original_mxn)}
                </TableCell>
                <TableCell className="text-right">
                  {item.descuento_tipo && item.descuento_tipo !== 'ninguno' ? (
                    <div className="space-y-1">
                      <div className="text-destructive font-medium">
                        -{formatCurrency(item.descuento_total_mxn)}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {item.descuento_tipo === 'porcentaje' 
                            ? `${item.descuento_valor}%` 
                            : `${item.descuento_porcentaje_efectivo.toFixed(1)}%`}
                        </Badge>
                        {item.codigo_promocion && (
                          <Badge variant="outline" className="text-xs">
                            {item.codigo_promocion}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin descuento</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.precio_final_mxn)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency(item.subtotal_final_mxn)}
                </TableCell>
              </TableRow>
            ))}
            {/* Fila de totales */}
            <TableRow className="bg-muted/50 font-bold">
              <TableCell colSpan={3} className="text-right">TOTALES:</TableCell>
              <TableCell className="text-right">{formatCurrency(totales.original)}</TableCell>
              <TableCell className="text-right text-destructive">
                -{formatCurrency(totales.descuento)}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(totales.final)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totales.final)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}