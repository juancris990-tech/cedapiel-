import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermissions } from "@/hooks/usePermissions";
import { Separator } from "@/components/ui/separator";
import { User, Shield, Building2, Briefcase, Key, Check, X, Edit, Save, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PERMISOS_LEGIBLES: { [key: string]: string } = {
  "asistencia.ver": "Ver asistencia",
  "asistencia.editar": "Editar asistencia",
  "asistencia.ver_global": "Ver asistencia global",
  "asistencia.ver_solo_sucursal": "Ver asistencia de su sucursal",
  "asistencia.ver_solo_propio": "Ver su propia asistencia",
  "asistencia.marcar_propio": "Marcar su propia asistencia",
  "liquidacion.ver_todos": "Ver todas las liquidaciones",
  "liquidacion.ver_sucursal": "Ver liquidaciones de su sucursal",
  "liquidacion.ver_solo_propio": "Ver su propia liquidación",
  "liquidacion.aprobar": "Aprobar liquidaciones",
  "liquidacion.pagar": "Marcar liquidaciones como pagadas",
  "clientes.ver_saldos": "Ver saldos de clientes",
  "clientes.editar": "Editar clientes",
  "clientes.fusionar": "Fusionar clientes duplicados",
  "clientes.ver_eliminados": "Ver clientes eliminados",
  "inventario.ver_global": "Ver inventario global",
  "inventario.ver_sucursal": "Ver inventario de sucursal",
  "inventario.transferir": "Realizar transferencias de inventario",
  "reportes.estrategicos": "Ver reportes estratégicos",
  "reportes.productividad": "Ver reportes de productividad",
  "usuarios.gestionar": "Gestionar usuarios",
  "configuracion.modificar": "Modificar configuración del sistema",
};

export default function MiPerfil() {
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();
  const { data: permissions, isLoading: loadingPermissions } = usePermissions();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    nombre_completo: '',
    telefono: ''
  });
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const getRolLabel = (roles: string[]) => {
    if (!roles || roles.length === 0) return 'Sin rol asignado';
    return roles.map(r => {
      const rol = r.replace('_', ' ');
      return rol.charAt(0).toUpperCase() + rol.slice(1);
    }).join(', ');
  };

  const permisosActivos = Object.entries(permissions || {})
    .filter(([_, value]) => value === true)
    .map(([key]) => key);
  
  // Mutation para actualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { nombre_completo: string; telefono: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          nombre_completo: data.nombre_completo,
          telefono: data.telefono
        })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tus datos fueron actualizados');
      queryClient.invalidateQueries({ queryKey: ['current-user-profile'] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(`Error al guardar los cambios: ${error.message}`);
    }
  });
  
  // Mutation para cambiar contraseña
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      // Primero intentamos reautenticar al usuario con la contraseña actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No autenticado');
      
      // Intentar iniciar sesión con la contraseña actual para validarla
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword
      });
      
      if (signInError) throw new Error('La contraseña actual no es correcta');
      
      // Actualizar la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      });
      
      if (updateError) throw updateError;
      
      // Registrar en bitácora
      await supabase.rpc('registrar_accion_acceso', {
        _user_id: user.id,
        _accion: 'cambio_password_propio',
        _detalle: { timestamp: new Date().toISOString() }
      });
    },
    onSuccess: () => {
      toast.success('Tu contraseña ha sido actualizada');
      setShowPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });
  
  const handleEditProfile = () => {
    setEditData({
      nombre_completo: (currentUser as any)?.nombre_completo || '',
      telefono: (currentUser as any)?.telefono || ''
    });
    setIsEditing(true);
  };
  
  const handleSaveProfile = () => {
    if (!editData.nombre_completo.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    updateProfileMutation.mutate(editData);
  };
  
  const handleChangePassword = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Complete todos los campos');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  if (loadingUser || loadingPermissions) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Información de tu cuenta y permisos
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Información Personal */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle>Información Personal</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nombre Completo</Label>
                {isEditing ? (
                  <Input 
                    value={editData.nombre_completo}
                    onChange={(e) => setEditData(prev => ({ ...prev, nombre_completo: e.target.value }))}
                  />
                ) : (
                  <Input value={(currentUser as any)?.nombre_completo || 'Sin nombre'} disabled />
                )}
              </div>
              <div>
                <Label>Email</Label>
                <Input value={(currentUser as any)?.email || ''} disabled />
              </div>
              <div>
                <Label>Teléfono</Label>
                {isEditing ? (
                  <Input 
                    value={editData.telefono}
                    onChange={(e) => setEditData(prev => ({ ...prev, telefono: e.target.value }))}
                  />
                ) : (
                  <Input value={(currentUser as any)?.telefono || 'No especificado'} disabled />
                )}
              </div>
              <div>
                <Label>Estado</Label>
                <div className="mt-2">
                  <Badge variant={(currentUser as any)?.activo ? "default" : "secondary"}>
                    {(currentUser as any)?.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                  {!(currentUser as any)?.activo && (
                    <p className="text-sm text-destructive mt-2">
                      Tu cuenta está inactiva. Contacta a administración.
                    </p>
                  )}
                </div>
              </div>
              
              {isEditing ? (
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={updateProfileMutation.isPending}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button onClick={handleEditProfile}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Rol y Sucursal */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Rol y Ubicación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4" />
                  Rol del Sistema
                </Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium">{getRolLabel((currentUser as any)?.roles || [])}</p>
                  {(currentUser as any)?.roles_descripcion && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {(currentUser as any).roles_descripcion}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4" />
                  Sucursal Asignada
                </Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium">
                    {(currentUser as any)?.sucursal_nombre || 'Sin sucursal (acceso global)'}
                  </p>
                </div>
              </div>

              {(currentUser as any)?.empleado_nombre && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4" />
                    Vinculación Operativa
                  </Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">{(currentUser as any).empleado_nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {(currentUser as any).empleado_cargo || 'Sin cargo especificado'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Permisos Efectivos */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <CardTitle>Permisos Efectivos</CardTitle>
            </div>
            <CardDescription>
              Estos son los permisos que tienes actualmente en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {permisosActivos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {permisosActivos.map((permiso) => (
                  <div
                    key={permiso}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted"
                  >
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">
                      {PERMISOS_LEGIBLES[permiso] || permiso}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <X className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tienes permisos asignados</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cambiar Contraseña */}
        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
            <CardDescription>
              Gestiona la seguridad de tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
              <Key className="mr-2 h-4 w-4" />
              Cambiar Contraseña
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog para cambiar contraseña */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Actualiza tu contraseña de acceso al sistema
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Contraseña Actual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} disabled={changePasswordMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar Contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
