import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Permission = string;

export interface UserPermissions {
  [key: string]: boolean;
}

export function usePermissions() {
  return useQuery({
    queryKey: ['user-permissions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      const { data, error } = await supabase
        .rpc('get_permisos_usuario', { _user_id: user.id });

      if (error) throw error;
      return (data || {}) as UserPermissions;
    },
  });
}

export function useHasPermission(permission: Permission) {
  const { data: permissions = {} } = usePermissions();
  return permissions[permission] === true;
}

export function useHasAnyPermission(permissionsList: Permission[]) {
  const { data: permissions = {} } = usePermissions();
  return permissionsList.some(p => permissions[p] === true);
}

export function useCanAccessSucursal(idSucursal: number | null) {
  return useQuery({
    queryKey: ['can-access-sucursal', idSucursal],
    queryFn: async () => {
      if (!idSucursal) return false;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .rpc('puede_acceder_sucursal', { 
          _user_id: user.id, 
          _id_sucursal: idSucursal 
        });

      if (error) throw error;
      return data as boolean;
    },
    enabled: !!idSucursal,
  });
}
