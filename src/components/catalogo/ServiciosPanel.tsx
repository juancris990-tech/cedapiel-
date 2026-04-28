import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, Clock3, CircleDollarSign } from "lucide-react";
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

  const getCategoryBadgeClass = (categoria?: string | null) => {
    if (!categoria) {
      return "bg-muted text-muted-foreground border-border";
    }

    const palette = [
      "bg-blue-100 text-blue-800 border-blue-200",
      "bg-violet-100 text-violet-800 border-violet-200",
      "bg-emerald-100 text-emerald-800 border-emerald-200",
      "bg-amber-100 text-amber-800 border-amber-200",
      "bg-rose-100 text-rose-800 border-rose-200",
      "bg-cyan-100 text-cyan-800 border-cyan-200",
    ];

    const index = categoria
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % palette.length;

    return palette[index];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Servicios</h3>
          <p className="text-sm text-muted-foreground">Explora y administra tu catálogo con vista tipo cards</p>
        </div>
        <Button onClick={handleNew} size="lg" className="h-11 px-6 font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Servicio
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar servicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-[220px]">
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
      </div>

      {isLoading ? (
        <div className="rounded-lg border py-12">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        </div>
      ) : filteredServicios.length === 0 ? (
        <div className="rounded-lg border py-12 text-center text-muted-foreground">
          No se encontraron servicios
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredServicios.map((servicio: Servicio) => (
            <div
              key={servicio.id}
              className="group rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="space-y-2">
                  <h4 className="line-clamp-2 text-base font-semibold leading-tight">{servicio.nombre}</h4>
                  <Badge
                    className={`border font-medium ${getCategoryBadgeClass(servicio.categoria_servicio?.nombre)}`}
                    variant="outline"
                  >
                    {servicio.categoria_servicio?.nombre || "Sin categoría"}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock3 className="h-4 w-4" />
                    Duración
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {servicio.duracion_minutos ? `${servicio.duracion_minutos} min` : "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CircleDollarSign className="h-4 w-4" />
                    Precio
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(servicio.precio)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estado</span>
                  <Badge variant={servicio.activo ? "default" : "secondary"}>
                    {servicio.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
