import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'gerencia' | 'recepcion' | 'profesional' | 'direccion' | 'admin_rrhh' | 'jefe_sucursal';

export function useUserRoles() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(r => r.role as UserRole);
    },
    enabled: !!user?.id,
  });

  const hasRole = (role: UserRole) => roles.includes(role);
  
  // Core roles
  const isAdmin = hasRole('admin');
  const isGerencia = hasRole('gerencia');
  const isRecepcion = hasRole('recepcion');
  const isProfesional = hasRole('profesional');
  
  // Extended roles that map to admin-level permissions
  const isDireccion = hasRole('direccion');
  const isAdminRRHH = hasRole('admin_rrhh');
  const isJefeSucursal = hasRole('jefe_sucursal');
  
  // Combined permission levels
  const hasAdminPermissions = isAdmin || isDireccion || isAdminRRHH || isJefeSucursal;
  const hasGerenciaPermissions = isGerencia || hasAdminPermissions;

  return {
    roles,
    hasRole,
    isAdmin,
    isGerencia,
    isRecepcion,
    isProfesional,
    isDireccion,
    isAdminRRHH,
    isJefeSucursal,
    hasAdminPermissions,
    hasGerenciaPermissions,
    isLoading,
  };
}
