import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Download, Check, DollarSign, FileText } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function LiquidacionPanel() {
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const [ajusteDialog, setAjusteDialog] = useState<any>(null);

  // Calcular fechas de la semana (sábado a viernes)
  const getWeekDates = (weeksAgo: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSaturday = dayOfWeek === 6 ? 0 : dayOfWeek === 0 ? 1 : 7 - dayOfWeek;
    
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysToSaturday - (weeksAgo * 7));
    
    const friday = new Date(saturday);
    friday.setDate(saturday.getDate() + 6);
    
    return {
      inicio: saturday.toISOString().split('T')[0],
      fin: friday.toISOString().split('T')[0]
    };
  };

  const weekDates = getWeekDates(selectedWeek);

  // Query liquidaciones
  const { data: liquidaciones, isLoading } = useQuery({
    queryKey: ['liquidaciones', weekDates.inicio, weekDates.fin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('liquidacion_semanal')
        .select(`
          *,
          empleados:id_empleado (
            id,
            nombre,
            apellidos,
            sucursales:id_sucursal (nombre)
          )
        `)
        .eq('semana_inicio', weekDates.inicio)
        .eq('semana_fin', weekDates.fin)
        .order('estado')
        .order('total_a_pagar_mxn', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Query detalle
  const { data: detalles } = useQuery({
    queryKey: ['liquidacion-detalle', detailDialog?.id],
    queryFn: async () => {
      if (!detailDialog?.id) return [];
      
      const { data, error } = await supabase
        .from('liquidacion_detalle')
        .select(`
          *,
          servicios:id_servicio (nombre)
        `)
        .eq('id_liquidacion', detailDialog.id)
        .order('fecha_servicio', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!detailDialog?.id,
  });

  // Mutation: Calcular liquidaciones
  const calcularMutation = useMutation({
    mutationFn: async () => {
      // Obtener empleados activos
      const { data: empleados, error: empError } = await supabase
        .from('empleados')
        .select('id, salario_hora')
        .eq('activo', true);
      
      if (empError) throw empError;

      // Para cada empleado, calcular su liquidación
      for (const empleado of empleados || []) {
        // 1. Calcular horas trabajadas
        const { data: asistencias } = await supabase
          .from('asistencias')
          .select('horas_trabajadas')
          .eq('id_empleado', empleado.id)
          .gte('fecha', weekDates.inicio)
          .lte('fecha', weekDates.fin);
        
        const horasTrabajadas = asistencias?.reduce((sum, a) => sum + (Number(a.horas_trabajadas) || 0), 0) || 0;
        const salarioBase = horasTrabajadas * (Number(empleado.salario_hora) || 0);

        // 2. Calcular ingresos reconocidos y comisiones desde venta_items de ventas cerradas
        const { data: items } = await supabase
          .from('venta_items')
          .select(`
            id,
            precio_final_mxn,
            subtotal,
            id_servicio,
            id_venta,
            ventas!inner (
              id,
              fecha,
              estado_venta
            ),
            servicios (
              id_categoria
            )
          `)
          .eq('id_empleado', empleado.id)
          .eq('ventas.estado_venta', 'cerrada')
          .gte('ventas.fecha', weekDates.inicio)
          .lte('ventas.fecha', weekDates.fin);

        let ingresosReconocidos = 0;
        let comisionTotal = 0;
        const detallesComision: any[] = [];

        for (const item of items || []) {
          const montoVenta = Number(item.precio_final_mxn || item.subtotal) || 0;
          ingresosReconocidos += montoVenta;

          // Buscar parámetro de comisión si hay categoría de servicio
          if (item.servicios?.id_categoria) {
            const { data: param } = await supabase
              .from('parametros_comision')
              .select('porcentaje')
              .eq('id_empleado', empleado.id)
              .eq('id_categoria_servicio', item.servicios.id_categoria)
              .eq('activo', true)
              .lte('fecha_inicio', (item as any).ventas.fecha)
              .or(`fecha_fin.is.null,fecha_fin.gte.${(item as any).ventas.fecha}`)
              .maybeSingle();

            const porcentaje = param ? Number(param.porcentaje) : 0;
            const comision = (montoVenta * porcentaje) / 100;
            comisionTotal += comision;

            detallesComision.push({
              id_cita: null,
              id_venta_item: item.id,
              id_servicio: item.id_servicio,
              fecha_servicio: (item as any).ventas.fecha,
              monto_venta_mxn: montoVenta,
              porcentaje_comision: porcentaje,
              comision_item_mxn: comision,
            });
          } else {
            // Si no hay categoría, agregar sin comisión
            detallesComision.push({
              id_cita: null,
              id_venta_item: item.id,
              id_servicio: item.id_servicio,
              fecha_servicio: (item as any).ventas.fecha,
              monto_venta_mxn: montoVenta,
              porcentaje_comision: 0,
              comision_item_mxn: 0,
            });
          }
        }

        // 3. Insertar liquidación
        const { data: liquidacion, error: liqError } = await supabase
          .from('liquidacion_semanal')
          .insert({
            id_empleado: empleado.id,
            semana_inicio: weekDates.inicio,
            semana_fin: weekDates.fin,
            ingresos_reconocidos_mxn: ingresosReconocidos,
            comision_mxn: comisionTotal,
            horas_trabajadas: horasTrabajadas,
            salario_base_mxn: salarioBase,
            ajustes_mxn: 0,
            estado: 'calculada',
          })
          .select()
          .single();

        if (liqError) throw liqError;

        // 4. Insertar detalles
        if (detallesComision.length > 0) {
          const detallesConId = detallesComision.map(d => ({
            ...d,
            id_liquidacion: liquidacion.id,
          }));

          const { error: detError } = await supabase
            .from('liquidacion_detalle')
            .insert(detallesConId);

          if (detError) throw detError;
        }

        // 5. Auditoría
        await supabase.from('bitacora_accion').insert({
          accion: 'calcular',
          entidad: 'LiquidacionSemanal',
          id_entidad: liquidacion.id,
          detalle_json: {
            semana_inicio: weekDates.inicio,
            semana_fin: weekDates.fin,
            id_empleado: empleado.id,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      toast.success('Liquidaciones calculadas correctamente');
    },
    onError: (error: any) => {
      toast.error('Error al calcular liquidaciones: ' + error.message);
    },
  });

  // Mutation: Aprobar liquidación
  const aprobarMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('liquidacion_semanal')
        .update({
          estado: 'aprobada',
          aprobada_por: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', id);
      
      if (error) throw error;

      await supabase.from('bitacora_accion').insert({
        accion: 'aprobar',
        entidad: 'LiquidacionSemanal',
        id_entidad: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      toast.success('Liquidación aprobada');
    },
    onError: (error: any) => {
      toast.error('Error: ' + error.message);
    },
  });

  // Mutation: Marcar como pagada
  const pagarMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('liquidacion_semanal')
        .update({
          estado: 'pagada',
          pagada_por: (await supabase.auth.getUser()).data.user?.id,
          fecha_pago: new Date().toISOString().split('T')[0],
        })
        .eq('id', id);
      
      if (error) throw error;

      await supabase.from('bitacora_accion').insert({
        accion: 'pagar',
        entidad: 'LiquidacionSemanal',
        id_entidad: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      toast.success('Pago registrado');
    },
    onError: (error: any) => {
      toast.error('Error: ' + error.message);
    },
  });

  // Mutation: Ajustar liquidación
  const ajustarMutation = useMutation({
    mutationFn: async (data: { id: number; ajustes_mxn: number; motivo: string }) => {
      const { error } = await supabase
        .from('liquidacion_semanal')
        .update({
          ajustes_mxn: data.ajustes_mxn,
          motivo_ajuste: data.motivo,
        })
        .eq('id', data.id);
      
      if (error) throw error;

      await supabase.from('bitacora_accion').insert({
        accion: 'ajustar',
        entidad: 'LiquidacionSemanal',
        id_entidad: data.id,
        detalle_json: {
          ajustes_mxn: data.ajustes_mxn,
          motivo: data.motivo,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      setAjusteDialog(null);
      toast.success('Ajuste aplicado');
    },
    onError: (error: any) => {
      toast.error('Error: ' + error.message);
    },
  });

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, any> = {
      calculada: { variant: "outline", text: "Calculada" },
      aprobada: { variant: "secondary", text: "Aprobada" },
      pagada: { variant: "default", text: "Pagada" },
    };
    const config = variants[estado] || variants.calculada;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const totalGeneral = liquidaciones?.reduce((sum, l) => sum + Number(l.total_a_pagar_mxn), 0) || 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Liquidación Semanal / Nómina</CardTitle>
              <CardDescription>
                Período: {new Date(weekDates.inicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} - {new Date(weekDates.fin).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedWeek.toString()} onValueChange={(v) => setSelectedWeek(Number(v))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Semana actual</SelectItem>
                  <SelectItem value="1">Semana anterior</SelectItem>
                  <SelectItem value="2">Hace 2 semanas</SelectItem>
                  <SelectItem value="3">Hace 3 semanas</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => calcularMutation.mutate()}
                disabled={calcularMutation.isPending || (liquidaciones && liquidaciones.length > 0)}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calcular Semana
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : liquidaciones && liquidaciones.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-right">Ingresos Recon.</TableHead>
                    <TableHead className="text-right">Comisión</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="text-right">Salario Base</TableHead>
                    <TableHead className="text-right">Ajustes</TableHead>
                    <TableHead className="text-right">Total a Pagar</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liquidaciones.map((liq: any) => (
                    <TableRow key={liq.id}>
                      <TableCell className="font-medium">
                        {liq.empleados?.nombre} {liq.empleados?.apellidos}
                      </TableCell>
                      <TableCell>{liq.empleados?.sucursales?.nombre || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(liq.ingresos_reconocidos_mxn)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(liq.comision_mxn)}</TableCell>
                      <TableCell className="text-right">{Number(liq.horas_trabajadas).toFixed(1)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(liq.salario_base_mxn)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(liq.ajustes_mxn)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(liq.total_a_pagar_mxn)}</TableCell>
                      <TableCell>{getEstadoBadge(liq.estado)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetailDialog(liq)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          {liq.estado === 'calculada' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setAjusteDialog(liq)}
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => aprobarMutation.mutate(liq.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {liq.estado === 'aprobada' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => pagarMutation.mutate(liq.id)}
                            >
                              Pagar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={7}>TOTAL GENERAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalGeneral)}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="text-center py-12">
              <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay liquidaciones calculadas</h3>
              <p className="text-muted-foreground mb-4">
                Haz clic en "Calcular Semana" para generar las liquidaciones del período
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Detalle */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalle de Liquidación</DialogTitle>
            <DialogDescription>
              {detailDialog?.empleados?.nombre} {detailDialog?.empleados?.apellidos}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Período</Label>
                <p className="text-sm text-muted-foreground">
                  {detailDialog && new Date(detailDialog.semana_inicio).toLocaleDateString('es-MX')} - {detailDialog && new Date(detailDialog.semana_fin).toLocaleDateString('es-MX')}
                </p>
              </div>
              <div>
                <Label>Estado</Label>
                <p className="text-sm">{detailDialog && getEstadoBadge(detailDialog.estado)}</p>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span>Salario base ({Number(detailDialog?.horas_trabajadas).toFixed(1)} hrs × {formatCurrency(detailDialog?.empleados?.salario_hora || 0)})</span>
                <span className="font-medium">{detailDialog && formatCurrency(detailDialog.salario_base_mxn)}</span>
              </div>
              <div className="flex justify-between">
                <span>Comisiones (sobre {detailDialog && formatCurrency(detailDialog.ingresos_reconocidos_mxn)} ingresos)</span>
                <span className="font-medium">{detailDialog && formatCurrency(detailDialog.comision_mxn)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ajustes</span>
                <span className="font-medium">{detailDialog && formatCurrency(detailDialog.ajustes_mxn)}</span>
              </div>
              {detailDialog?.motivo_ajuste && (
                <p className="text-sm text-muted-foreground italic">{detailDialog.motivo_ajuste}</p>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total a pagar</span>
                <span>{detailDialog && formatCurrency(detailDialog.total_a_pagar_mxn)}</span>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Detalle de comisiones por servicio</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead className="text-right">Venta</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Comisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalles?.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>{new Date(d.fecha_servicio).toLocaleDateString('es-MX')}</TableCell>
                      <TableCell>{d.servicios?.nombre || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(d.monto_venta_mxn)}</TableCell>
                      <TableCell className="text-right">{d.porcentaje_comision}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(d.comision_item_mxn)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ajustar */}
      <Dialog open={!!ajusteDialog} onOpenChange={() => setAjusteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Liquidación</DialogTitle>
            <DialogDescription>
              {ajusteDialog?.empleados?.nombre} {ajusteDialog?.empleados?.apellidos}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              ajustarMutation.mutate({
                id: ajusteDialog.id,
                ajustes_mxn: Number(formData.get('ajustes')),
                motivo: formData.get('motivo') as string,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="ajustes">Monto de ajuste (MXN)</Label>
              <Input
                id="ajustes"
                name="ajustes"
                type="number"
                step="0.01"
                defaultValue={ajusteDialog?.ajustes_mxn || 0}
                placeholder="Puede ser negativo para descuentos"
                required
              />
            </div>
            <div>
              <Label htmlFor="motivo">Motivo del ajuste</Label>
              <Textarea
                id="motivo"
                name="motivo"
                defaultValue={ajusteDialog?.motivo_ajuste || ''}
                placeholder="Describe el motivo del ajuste..."
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAjusteDialog(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={ajustarMutation.isPending}>
                Aplicar Ajuste
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
