import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { ServicioDialog } from "./ServicioDialog";

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion_minutos: number | null;
  id_categoria: number | null;
  activo: boolean | null;
  categoria_servicio?: {
    nombre: string;
  } | null;
}

export const ServiciosPanel = () => {
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null);
  const queryClient = useQueryClient();

  const { data: servicios = [], isLoading } = useQuery({
    queryKey: ["servicios-catalogo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicios")
        .select(`
          *,
          categoria_servicio (nombre)
        `)
        .order("nombre");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias-servicio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categoria_servicio")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("servicios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Servicio eliminado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["servicios-catalogo"] });
      queryClient.invalidateQueries({ queryKey: ["pos-buscar"] });
      setDeleteDialogOpen(false);
      setServicioToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar servicio");
    },
  });

  const filteredServicios = servicios.filter((servicio: Servicio) => {
    const matchesSearch = servicio.nombre
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategoria =
      filterCategoria === "all" ||
      servicio.id_categoria?.toString() === filterCategoria;
    const matchesEstado =
      filterEstado === "all" ||
      (filterEstado === "activo" && servicio.activo) ||
      (filterEstado === "inactivo" && !servicio.activo);
    return matchesSearch && matchesCategoria && matchesEstado;
  });

  const handleEdit = (servicio: Servicio) => {
    setSelectedServicio(servicio);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedServicio(null);
    setDialogOpen(true);
  };

  const handleDelete = (servicio: Servicio) => {
    setServicioToDelete(servicio);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (servicioToDelete) {
      deleteMutation.mutate(servicioToDelete.id);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar servicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categorias.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleNew} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Servicio
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredServicios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron servicios
                </TableCell>
              </TableRow>
            ) : (
              filteredServicios.map((servicio: Servicio) => (
                <TableRow key={servicio.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{servicio.nombre}</p>
                      {servicio.descripcion && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {servicio.descripcion}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {servicio.categoria_servicio?.nombre || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(servicio.precio)}
                  </TableCell>
                  <TableCell>
                    {servicio.duracion_minutos ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {servicio.duracion_minutos} min
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={servicio.activo ? "default" : "secondary"}>
                      {servicio.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(servicio)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(servicio)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ServicioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        servicio={selectedServicio}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El servicio "{servicioToDelete?.nombre}"
              será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
