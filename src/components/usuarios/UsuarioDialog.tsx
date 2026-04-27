import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface UsuarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuarioId?: string;
}

const ROLES_DISPONIBLES = [
  { value: 'admin', label: 'Administrador del Sistema' },
  { value: 'direccion', label: 'Dirección / Dueño' },
  { value: 'admin_rrhh', label: 'Administrador de RRHH' },
  { value: 'gerencia', label: 'Gerencia' },
  { value: 'jefe_sucursal', label: 'Jefe de Sucursal' },
  { value: 'recepcion', label: 'Recepción' },
  { value: 'profesional', label: 'Profesional / Colaborador' },
  { value: 'colaborador', label: 'Colaborador' },
];

export default function UsuarioDialog({ open, onOpenChange, usuarioId }: UsuarioDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    email: '',
    nombreCompleto: '',
    telefono: '',
    password: '',
    rol: '',
    idSucursal: 'NONE',
    idEmpleado: 'NONE',
    activo: true,
  });

  // Cargar sucursales
  const { data: sucursales } = useQuery({
    queryKey: ['sucursales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sucursales')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  // Cargar empleados
  const { data: empleados } = useQuery({
    queryKey: ['empleados-activos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  // Crear usuario
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // 1. Crear usuario en auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          nombre_completo: data.nombreCompleto
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // 2. Actualizar profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nombre_completo: data.nombreCompleto,
          telefono: data.telefono,
          id_sucursal: data.idSucursal && data.idSucursal !== "NONE" ? parseInt(data.idSucursal) : null,
          id_empleado: data.idEmpleado && data.idEmpleado !== "NONE" ? parseInt(data.idEmpleado) : null,
          activo: data.activo,
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // 3. Asignar rol
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: data.rol as any,
        });

      if (roleError) throw roleError;

      // 4. Registrar en bitácora
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.rpc('registrar_accion_acceso', {
        _user_id: user?.id,
        _accion: 'crear_usuario',
        _id_afectado: authData.user.id,
        _detalle: {
          email: data.email,
          rol: data.rol,
          sucursal: data.idSucursal
        },
      });

      return authData.user;
    },
    onSuccess: () => {
      toast.success('Usuario creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Error al crear usuario: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      email: '',
      nombreCompleto: '',
      telefono: '',
      password: '',
      rol: '',
      idSucursal: 'NONE',
      idEmpleado: 'NONE',
      activo: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.nombreCompleto || !formData.password || !formData.rol) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    // Validar que jefe de sucursal tenga sucursal asignada
    if (formData.rol === 'jefe_sucursal' && !formData.idSucursal) {
      toast.error('Jefe de sucursal requiere sucursal asignada');
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Crear una nueva cuenta de usuario en el sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombreCompleto">Nombre Completo *</Label>
              <Input
                id="nombreCompleto"
                value={formData.nombreCompleto}
                onChange={(e) => setFormData(prev => ({ ...prev, nombreCompleto: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña Inicial *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rol">Rol del Sistema *</Label>
              <Select value={formData.rol} onValueChange={(value) => setFormData(prev => ({ ...prev, rol: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un rol" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES_DISPONIBLES.map(rol => (
                    <SelectItem key={rol.value} value={rol.value}>
                      {rol.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sucursal">Sucursal Asociada</Label>
              <Select value={formData.idSucursal} onValueChange={(value) => setFormData(prev => ({ ...prev, idSucursal: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin sucursal asignada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin sucursal</SelectItem>
                  {sucursales?.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.rol === 'jefe_sucursal' && (
                <p className="text-sm text-muted-foreground">* Obligatorio para Jefe de Sucursal</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="empleado">Empleado Vinculado (opcional)</Label>
              <Select value={formData.idEmpleado} onValueChange={(value) => setFormData(prev => ({ ...prev, idEmpleado: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin empleado vinculado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin empleado</SelectItem>
                  {empleados?.map(e => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.nombre} {e.apellidos} - {e.cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, activo: checked }))}
              />
              <Label htmlFor="activo">Usuario Activo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
