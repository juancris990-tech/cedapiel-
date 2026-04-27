import AppLayout from "@/components/layout/AppLayout";
import UsuariosList from "@/components/usuarios/UsuariosList";
import { useHasPermission } from "@/hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function Usuarios() {
  const canManageUsers = useHasPermission('usuarios.gestionar');

  if (!canManageUsers) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
              <p className="text-muted-foreground text-center max-w-md">
                No tienes permisos para acceder al módulo de gestión de usuarios.
                Contacta con un administrador si necesitas acceso.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administración de cuentas, roles y permisos del sistema
          </p>
        </div>

        <UsuariosList />
      </div>
    </AppLayout>
  );
}
