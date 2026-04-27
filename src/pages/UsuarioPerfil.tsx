import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Key, Shield, User, History } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useHasPermission } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

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

export default function UsuarioPerfil() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const canManageUsers = useHasPermission('usuarios.gestionar');
  
  const [activeTab, setActiveTab] = useState('perfil');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    nombre_completo: '',
    telefono: ''
  });
  
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [roleData, setRoleData] = useState<{
    rol: string;
    id_sucursal: string | null;
    activo: boolean;
  }>({
    rol: '',
    id_sucursal: null,
    activo: true
  });
  
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({
    nueva_password: '',
    motivo: ''
  });
  
  // Cargar datos del usuario
  const { data: usuario, isLoading } = useQuery({
    queryKey: ['usuario-detalle', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vw_usuarios_sistema')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Inicializar formularios con datos del usuario
      setProfileData({
        nombre_completo: (data as any).nombre_completo || '',
        telefono: (data as any).telefono || ''
      });
      
      setRoleData({
        rol: (data as any).roles?.[0] || '',
        id_sucursal: (data as any).id_sucursal?.toString() || null,
        activo: (data as any).activo
      });
      
      return data;
    },
    enabled: !!id
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
    }
  });
  
  // Cargar historial de bitácora
  const { data: historial } = useQuery({
    queryKey: ['usuario-historial', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bitacora_acceso')
        .select(`
          *,
          responsable:id_usuario_responsable(nombre_completo)
        `)
        .or(`id_usuario_afectado.eq.${id},id_usuario_responsable.eq.${id}`)
        .order('timestamp', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
  
  // Mutation para actualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { nombre_completo: string; telefono: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          nombre_completo: data.nombre_completo,
          telefono: data.telefono
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Registrar en bitácora
      await supabase.rpc('registrar_accion_acceso', {
        _user_id: currentUser?.id,
        _accion: 'actualizar_usuario',
        _id_afectado: id,
        _detalle: { campos: ['nombre_completo', 'telefono'] }
      });
    },
    onSuccess: () => {
      toast.success('Datos actualizados correctamente');
      queryClient.invalidateQueries({ queryKey: ['usuario-detalle', id] });
      setIsEditingProfile(false);
    },
    onError: (error: any) => {
      toast.error(`Error al actualizar: ${error.message}`);
    }
  });
  
  // Mutation para actualizar rol y ubicación
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { rol: string; id_sucursal: string | null; activo: boolean }) => {
      // Actualizar profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          id_sucursal: data.id_sucursal ? parseInt(data.id_sucursal) : null,
          activo: data.activo
        })
        .eq('id', id);
      
      if (profileError) throw profileError;
      
      // Actualizar rol (eliminar roles existentes y agregar el nuevo)
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', id);
      
      if (deleteError) throw deleteError;
      
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: id,
          role: data.rol as any
        });
      
      if (insertError) throw insertError;
      
      // Registrar en bitácora
      await supabase.rpc('registrar_accion_acceso', {
        _user_id: currentUser?.id,
        _accion: 'actualizar_rol',
        _id_afectado: id,
        _detalle: { 
          nuevo_rol: data.rol,
          sucursal: data.id_sucursal,
          activo: data.activo
        }
      });
    },
    onSuccess: () => {
      toast.success('Rol y ubicación actualizados');
      queryClient.invalidateQueries({ queryKey: ['usuario-detalle', id] });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setIsEditingRole(false);
    },
    onError: (error: any) => {
      toast.error(`Error al actualizar: ${error.message}`);
    }
  });
  
  // Mutation para resetear contraseña
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { nueva_password: string; motivo: string }) => {
      // Usar admin API para resetear contraseña
      const { error } = await supabase.auth.admin.updateUserById(
        id!,
        { password: data.nueva_password }
      );
      
      if (error) throw error;
      
      // Registrar en bitácora
      await supabase.rpc('registrar_accion_acceso', {
        _user_id: currentUser?.id,
        _accion: 'reset_password_admin',
        _id_afectado: id,
        _detalle: { motivo: data.motivo }
      });
    },
    onSuccess: () => {
      toast.success('Contraseña reiniciada correctamente');
      queryClient.invalidateQueries({ queryKey: ['usuario-historial', id] });
      setShowResetPassword(false);
      setResetPasswordData({ nueva_password: '', motivo: '' });
    },
    onError: (error: any) => {
      toast.error(`Error al resetear contraseña: ${error.message}`);
    }
  });
  
  const handleSaveProfile = () => {
    if (!profileData.nombre_completo.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    updateProfileMutation.mutate(profileData);
  };
  
  const handleSaveRole = () => {
    if (!roleData.rol) {
      toast.error('Debe seleccionar un rol');
      return;
    }
    if (roleData.rol === 'jefe_sucursal' && !roleData.id_sucursal) {
      toast.error('Jefe de sucursal requiere sucursal asignada');
      return;
    }
    updateRoleMutation.mutate(roleData);
  };
  
  const handleResetPassword = () => {
    if (!resetPasswordData.nueva_password || resetPasswordData.nueva_password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!resetPasswordData.motivo.trim()) {
      toast.error('Debe especificar el motivo del reinicio');
      return;
    }
    resetPasswordMutation.mutate(resetPasswordData);
  };
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }
  
  if (!usuario) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Usuario no encontrado</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }
  
  // Determinar permisos de edición
  const isAdmin = (currentUser as any)?.roles?.includes('admin') || 
                  (currentUser as any)?.roles?.includes('direccion') || 
                  (currentUser as any)?.roles?.includes('admin_rrhh');
  const canEditProfile = isAdmin || 
                        ((currentUser as any)?.roles?.includes('jefe_sucursal') && 
                         (currentUser as any)?.id_sucursal === (usuario as any).id_sucursal);
  const canEditRole = isAdmin;
  const canResetPassword = isAdmin;
  
  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/usuarios')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{(usuario as any).nombre_completo}</h1>
            <p className="text-muted-foreground">{(usuario as any).email}</p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="perfil">
              <User className="mr-2 h-4 w-4" />
              Perfil
            </TabsTrigger>
            {canEditRole && (
              <TabsTrigger value="rol">
                <Shield className="mr-2 h-4 w-4" />
                Rol y Ubicación
              </TabsTrigger>
            )}
            {canResetPassword && (
              <TabsTrigger value="seguridad">
                <Key className="mr-2 h-4 w-4" />
                Seguridad
              </TabsTrigger>
            )}
            <TabsTrigger value="historial">
              <History className="mr-2 h-4 w-4" />
              Historial
            </TabsTrigger>
          </TabsList>
          
          {/* Tab Perfil */}
          <TabsContent value="perfil">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>
                  Datos básicos del usuario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nombre Completo</Label>
                  {isEditingProfile && canEditProfile ? (
                    <Input 
                      value={profileData.nombre_completo}
                      onChange={(e) => setProfileData(prev => ({ ...prev, nombre_completo: e.target.value }))}
                    />
                  ) : (
                    <Input value={(usuario as any).nombre_completo} disabled />
                  )}
                </div>
                
                <div>
                  <Label>Email</Label>
                  <Input value={(usuario as any).email} disabled />
                </div>
                
                <div>
                  <Label>Teléfono</Label>
                  {isEditingProfile && canEditProfile ? (
                    <Input 
                      value={profileData.telefono}
                      onChange={(e) => setProfileData(prev => ({ ...prev, telefono: e.target.value }))}
                    />
                  ) : (
                    <Input value={(usuario as any).telefono || 'No especificado'} disabled />
                  )}
                </div>
                
                <div>
                  <Label>Estado</Label>
                  <div className="mt-2">
                    <Badge variant={(usuario as any).activo ? "default" : "secondary"}>
                      {(usuario as any).activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
                
                {canEditProfile && (
                  <div className="flex gap-2">
                    {isEditingProfile ? (
                      <>
                        <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                          {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <Save className="mr-2 h-4 w-4" />
                          Guardar Cambios
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditingProfile(false)} disabled={updateProfileMutation.isPending}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setIsEditingProfile(true)}>
                        Editar
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab Rol y Ubicación */}
          {canEditRole && (
            <TabsContent value="rol">
              <Card>
                <CardHeader>
                  <CardTitle>Rol y Ubicación</CardTitle>
                  <CardDescription>
                    Gestión de permisos y asignación de sucursal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">⚠️ Advertencias importantes:</p>
                    <p className="text-sm text-muted-foreground">
                      • Cambiar el rol afecta los permisos de acceso inmediatamente.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      • Cambiar la sucursal limita qué información puede ver el usuario.
                    </p>
                  </div>
                  
                  <div>
                    <Label>Rol del Sistema</Label>
                    {isEditingRole ? (
                      <Select value={roleData.rol} onValueChange={(value) => setRoleData(prev => ({ ...prev, rol: value }))}>
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
                    ) : (
                      <Input value={(usuario as any).roles?.[0] || 'Sin rol'} disabled />
                    )}
                  </div>
                  
                  <div>
                    <Label>Sucursal Asignada</Label>
                    {isEditingRole ? (
                      <Select value={roleData.id_sucursal || "null"} onValueChange={(value) => setRoleData(prev => ({ ...prev, id_sucursal: value === "null" ? null : value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin sucursal (acceso global)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">Sin sucursal (acceso global)</SelectItem>
                          {sucursales?.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={(usuario as any).sucursal_nombre || 'Sin sucursal (acceso global)'} disabled />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isEditingRole ? (
                      <>
                        <Switch
                          id="activo"
                          checked={roleData.activo}
                          onCheckedChange={(checked) => setRoleData(prev => ({ ...prev, activo: checked }))}
                        />
                        <Label htmlFor="activo">Usuario Activo</Label>
                      </>
                    ) : (
                      <div>
                        <Label>Estado de Cuenta</Label>
                        <div className="mt-2">
                          <Badge variant={usuario.activo ? "default" : "secondary"}>
                            {usuario.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {isEditingRole ? (
                      <>
                        <Button onClick={handleSaveRole} disabled={updateRoleMutation.isPending}>
                          {updateRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Actualizar Rol / Sucursal
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditingRole(false)} disabled={updateRoleMutation.isPending}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setIsEditingRole(true)}>
                        Editar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {/* Tab Seguridad */}
          {canResetPassword && (
            <TabsContent value="seguridad">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Contraseña</CardTitle>
                  <CardDescription>
                    Resetear la contraseña de acceso del usuario
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Al reiniciar la contraseña, el usuario recibirá una nueva contraseña temporal que deberá cambiar en su próximo inicio de sesión.
                  </p>
                  <Button onClick={() => setShowResetPassword(true)} variant="destructive">
                    <Key className="mr-2 h-4 w-4" />
                    Reiniciar Contraseña
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {/* Tab Historial */}
          <TabsContent value="historial">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Cambios</CardTitle>
                <CardDescription>
                  Registro de acciones y modificaciones realizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha/Hora</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead>Detalle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historial && historial.length > 0 ? (
                        historial.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              {formatDistanceToNow(new Date(item.timestamp), {
                                addSuffix: true,
                                locale: es
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.accion}</Badge>
                            </TableCell>
                            <TableCell>
                              {item.responsable?.nombre_completo || 'Sistema'}
                            </TableCell>
                            <TableCell>
                              {item.motivo || JSON.stringify(item.detalle_json) || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No hay historial disponible
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Dialog para resetear contraseña */}
      <Dialog open={showResetPassword} onOpenChange={setShowResetPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reiniciar Contraseña</DialogTitle>
            <DialogDescription>
              Esta acción establecerá una nueva contraseña para el usuario
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="nueva_password">Nueva Contraseña</Label>
              <Input
                id="nueva_password"
                type="password"
                value={resetPasswordData.nueva_password}
                onChange={(e) => setResetPasswordData(prev => ({ ...prev, nueva_password: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="motivo">Motivo del Reinicio *</Label>
              <Textarea
                id="motivo"
                placeholder="Explique la razón del reinicio de contraseña..."
                value={resetPasswordData.motivo}
                onChange={(e) => setResetPasswordData(prev => ({ ...prev, motivo: e.target.value }))}
                rows={3}
              />
              <p className="text-sm text-muted-foreground mt-1">
                El motivo quedará registrado en la bitácora de auditoría
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPassword(false)} disabled={resetPasswordMutation.isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleResetPassword} disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Reinicio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
