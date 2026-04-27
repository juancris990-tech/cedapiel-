import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'admin' | 'gerencia' | 'recepcion' | 'profesional';

export function useUserRoles() {
  return useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data || []).map(r => r.role as AppRole);
    },
  });
}

export function useHasRole(role: AppRole) {
  const { data: roles = [] } = useUserRoles();
  return roles.includes(role);
}

export function useHasAnyRole(rolesList: AppRole[]) {
  const { data: roles = [] } = useUserRoles();
  return rolesList.some(role => roles.includes(role));
}
