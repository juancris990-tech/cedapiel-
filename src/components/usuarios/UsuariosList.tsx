import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Search, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import UsuarioDialog from "./UsuarioDialog";

const ROL_COLORS: { [key: string]: string } = {
  admin: "bg-red-500",
  direccion: "bg-purple-500",
  admin_rrhh: "bg-blue-500",
  gerencia: "bg-cyan-500",
  jefe_sucursal: "bg-green-500",
  recepcion: "bg-yellow-500",
  profesional: "bg-orange-500",
  colaborador: "bg-gray-500",
};

export default function UsuariosList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [rolFilter, setRolFilter] = useState("all");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios', searchQuery, rolFilter, estadoFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from('vw_usuarios_sistema')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`nombre_completo.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      if (estadoFilter !== 'all') {
        query = query.eq('activo', estadoFilter === 'activo');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filtrar por rol en el cliente (porque roles es un array)
      if (rolFilter !== 'all') {
        return data?.filter(u => u.roles?.includes(rolFilter as any)) || [];
      }

      return data || [];
    },
  });

  const getRolLabel = (roles: string[]) => {
    if (!roles || roles.length === 0) return 'Sin rol';
    return roles.map(r => {
      const rol = r.replace('_', ' ');
      return rol.charAt(0).toUpperCase() + rol.slice(1);
    }).join(', ');
  };

  const getRolColor = (roles: string[]) => {
    if (!roles || roles.length === 0) return 'bg-gray-500';
    return ROL_COLORS[roles[0]] || 'bg-gray-500';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuarios del Sistema</CardTitle>
              <CardDescription>
                Gestión de cuentas y permisos de acceso
              </CardDescription>
            </div>
            <Button onClick={() => setShowDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={rolFilter} onValueChange={setRolFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="direccion">Dirección</SelectItem>
                <SelectItem value="admin_rrhh">Admin RRHH</SelectItem>
                <SelectItem value="gerencia">Gerencia</SelectItem>
                <SelectItem value="jefe_sucursal">Jefe Sucursal</SelectItem>
                <SelectItem value="recepcion">Recepción</SelectItem>
                <SelectItem value="profesional">Profesional</SelectItem>
                <SelectItem value="colaborador">Colaborador</SelectItem>
              </SelectContent>
            </Select>

            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol(es)</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Cargando usuarios...
                    </TableCell>
                  </TableRow>
                ) : usuarios && usuarios.length > 0 ? (
                  usuarios.map((usuario: any) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">
                        {usuario.nombre_completo || 'Sin nombre'}
                      </TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>
                        <Badge className={getRolColor(usuario.roles)}>
                          {getRolLabel(usuario.roles)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {usuario.sucursal_nombre || 'Sin sucursal'}
                      </TableCell>
                      <TableCell>
                        {usuario.ultimo_login
                          ? formatDistanceToNow(new Date(usuario.ultimo_login), {
                              addSuffix: true,
                              locale: es,
                            })
                          : 'Nunca'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={usuario.activo ? "default" : "secondary"}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/usuarios/${usuario.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UsuarioDialog open={showDialog} onOpenChange={setShowDialog} />
    </>
  );
}
