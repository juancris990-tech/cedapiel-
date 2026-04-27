import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ParametrosComisionPanel() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<any>(null);

  // Query parámetros
  const { data: parametros, isLoading } = useQuery({
    queryKey: ['parametros-comision'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parametros_comision')
        .select(`
          *,
          empleados:id_empleado (
            id,
            nombre,
            apellidos
          ),
          categoria_servicio:id_categoria_servicio (
            id,
            nombre
          )
        `)
        .order('activo', { ascending: false })
        .order('fecha_inicio', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Query empleados
  const { data: empleados } = useQuery({
    queryKey: ['empleados-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellidos')
        .eq('activo', true)
        .order('nombre');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Query categorías
  const { data: categorias } = useQuery({
    queryKey: ['categorias-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categoria_servicio')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Query servicios
  const { data: servicios } = useQuery({
    queryKey: ['servicios-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicios')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation: Crear/Actualizar
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        id_empleado: data.id_empleado || null,
        id_categoria_servicio: data.id_categoria_servicio || null,
        id_servicio: data.id_servicio || null,
        porcentaje: Number(data.porcentaje),
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin || null,
        activo: data.activo !== undefined ? data.activo : true,
        actualizado_por: user?.id,
      };

      if (editingParam) {
        const { error } = await supabase
          .from('parametros_comision')
          .update(payload)
          .eq('id', editingParam.id);
        
        if (error) throw error;

        await supabase.from('bitacora_accion').insert({
          accion: 'editar',
          entidad: 'ParametroComision',
          id_entidad: editingParam.id,
          detalle_json: payload,
        });
      } else {
        const { data: newParam, error } = await supabase
          .from('parametros_comision')
          .insert({
            ...payload,
            creado_por: user?.id,
          })
          .select()
          .single();
        
        if (error) throw error;

        await supabase.from('bitacora_accion').insert({
          accion: 'crear',
          entidad: 'ParametroComision',
          id_entidad: newParam.id,
          detalle_json: payload,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parametros-comision'] });
      setDialogOpen(false);
      setEditingParam(null);
      toast.success(editingParam ? 'Parámetro actualizado' : 'Parámetro creado');
    },
    onError: (error: any) => {
      toast.error('Error: ' + error.message);
    },
  });

  // Mutation: Eliminar
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('parametros_comision')
        .delete()
        .eq('id', id);
      
      if (error) throw error;

      await supabase.from('bitacora_accion').insert({
        accion: 'eliminar',
        entidad: 'ParametroComision',
        id_entidad: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parametros-comision'] });
      toast.success('Parámetro eliminado');
    },
    onError: (error: any) => {
      toast.error('Error: ' + error.message);
    },
  });

  const handleEdit = (param: any) => {
    setEditingParam(param);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingParam(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Eliminar este parámetro de comisión?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Parámetros de Comisión</CardTitle>
              <CardDescription>
                Reglas para calcular comisiones por empleado y categoría de servicio
              </CardDescription>
            </div>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Parámetro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              El sistema elige el parámetro más específico: primero busca por empleado+categoría, luego solo categoría, y si no hay, comisión = 0.
            </AlertDescription>
          </Alert>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : parametros && parametros.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">% Comisión</TableHead>
                  <TableHead>Vigencia Desde</TableHead>
                  <TableHead>Vigencia Hasta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parametros.map((param: any) => (
                  <TableRow key={param.id}>
                    <TableCell>
                      {param.empleados ? `${param.empleados.nombre} ${param.empleados.apellidos}` : <span className="text-muted-foreground italic">Todos</span>}
                    </TableCell>
                    <TableCell>
                      {param.categoria_servicio ? param.categoria_servicio.nombre : <span className="text-muted-foreground italic">Todas</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium">{param.porcentaje}%</TableCell>
                    <TableCell>{new Date(param.fecha_inicio).toLocaleDateString('es-MX')}</TableCell>
                    <TableCell>
                      {param.fecha_fin ? new Date(param.fecha_fin).toLocaleDateString('es-MX') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={param.activo ? "default" : "secondary"}>
                        {param.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(param)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(param.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay parámetros configurados</h3>
              <p className="text-muted-foreground mb-4">
                Crea el primer parámetro de comisión
              </p>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Parámetro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingParam ? 'Editar' : 'Nuevo'} Parámetro de Comisión</DialogTitle>
            <DialogDescription>
              Define el porcentaje de comisión según empleado y categoría
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const empleadoValue = formData.get('id_empleado');
              const categoriaValue = formData.get('id_categoria_servicio');
              const servicioValue = formData.get('id_servicio');
              saveMutation.mutate({
                id_empleado: empleadoValue === 'ALL' ? null : empleadoValue,
                id_categoria_servicio: categoriaValue === 'ALL_CAT' ? null : categoriaValue,
                id_servicio: servicioValue === 'ALL_SERV' ? null : servicioValue,
                porcentaje: formData.get('porcentaje'),
                fecha_inicio: formData.get('fecha_inicio'),
                fecha_fin: formData.get('fecha_fin'),
                activo: formData.get('activo') === 'true',
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="id_empleado">Empleado (opcional)</Label>
              <Select name="id_empleado" defaultValue={editingParam?.id_empleado?.toString() || 'ALL'}>
                <SelectTrigger>
                  <SelectValue placeholder="Aplica a todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los empleados</SelectItem>
                  {empleados?.map((e: any) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.nombre} {e.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="id_categoria_servicio">Categoría (opcional)</Label>
              <Select name="id_categoria_servicio" defaultValue={editingParam?.id_categoria_servicio?.toString() || 'ALL_CAT'}>
                <SelectTrigger>
                  <SelectValue placeholder="Aplica a todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_CAT">Todas las categorías</SelectItem>
                  {categorias?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="id_servicio">Servicio (opcional)</Label>
              <Select name="id_servicio" defaultValue={editingParam?.id_servicio?.toString() || 'ALL_SERV'}>
                <SelectTrigger>
                  <SelectValue placeholder="Aplica a todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_SERV">Todos los servicios</SelectItem>
                  {servicios?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Si se especifica un servicio, la categoría se ignora
              </p>
            </div>

            <div>
              <Label htmlFor="porcentaje">% Comisión</Label>
              <Input
                id="porcentaje"
                name="porcentaje"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={editingParam?.porcentaje || ''}
                placeholder="Ej: 10.00"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fecha_inicio">Vigencia Desde</Label>
                <Input
                  id="fecha_inicio"
                  name="fecha_inicio"
                  type="date"
                  defaultValue={editingParam?.fecha_inicio || ''}
                  required
                />
              </div>
              <div>
                <Label htmlFor="fecha_fin">Vigencia Hasta</Label>
                <Input
                  id="fecha_fin"
                  name="fecha_fin"
                  type="date"
                  defaultValue={editingParam?.fecha_fin || ''}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="activo">Estado</Label>
              <Select name="activo" defaultValue={editingParam ? editingParam.activo.toString() : 'true'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {editingParam ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
