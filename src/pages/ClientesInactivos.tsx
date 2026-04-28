import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Search, Users } from "lucide-react";
import * as XLSX from 'xlsx';

type ClienteInactivoRow = {
  id_cliente: number;
  nombre_completo: string;
  telefono: string;
  fecha_ultima_visita: string | null;
  dias_sin_visita: number;
};

const getInitials = (name: string) => {
  const parts = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "");
  return parts.join("") || "CL";
};

export default function ClientesInactivos() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ["clientes-inactivos-real", search],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("vw_clientes_ausentes")
        .select("id_cliente, nombre, apellidos, telefono, fecha_ultima_visita, dias_desde_ultima_visita")
        .gte("dias_desde_ultima_visita", 90)
        .order("dias_desde_ultima_visita", { ascending: false });

      if (error) throw error;

      return (rows || []).map((row) => ({
        id_cliente: Number(row.id_cliente || 0),
        nombre_completo: `${row.nombre || ""} ${row.apellidos || ""}`.trim() || "Sin nombre",
        telefono: row.telefono || "—",
        fecha_ultima_visita: row.fecha_ultima_visita,
        dias_sin_visita: Number(row.dias_desde_ultima_visita || 0),
      })) as ClienteInactivoRow[];
    },
  });

  const clientes = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.trim().toLowerCase();
    return data.filter(
      (c) =>
        c.nombre_completo.toLowerCase().includes(term) ||
        c.telefono.toLowerCase().includes(term)
    );
  }, [data, search]);

  const totalClientes = clientes.length;

  const exportarCSV = () => {
    if (!clientes.length) {
      toast({
        title: "Sin datos",
        description: "No hay clientes para exportar",
        variant: "destructive",
      });
      return;
    }

    const exportRows = clientes.map((c) => ({
      cliente: c.nombre_completo,
      telefono: c.telefono,
      ultima_visita: c.fecha_ultima_visita
        ? new Date(c.fecha_ultima_visita).toLocaleDateString("es-CL")
        : "—",
      dias_sin_visita: c.dias_sin_visita,
      estado: `Sin visita ${c.dias_sin_visita} días`,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes Inactivos");
    XLSX.writeFile(wb, `clientes_inactivos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes Inactivos</h1>
          <p className="text-muted-foreground">Clientes sin citas en los últimos 90 días.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportarCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium">Total clientes inactivos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalClientes}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o teléfono"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay clientes inactivos para mostrar.</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Última visita</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => (
                    <TableRow key={cliente.id_cliente}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(cliente.nombre_completo)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{cliente.nombre_completo}</span>
                        </div>
                      </TableCell>
                      <TableCell>{cliente.telefono}</TableCell>
                      <TableCell>
                        {cliente.fecha_ultima_visita
                          ? new Date(cliente.fecha_ultima_visita).toLocaleDateString("es-CL")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">Sin visita {cliente.dias_sin_visita} días</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
