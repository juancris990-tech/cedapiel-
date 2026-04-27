import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface NotasClientePanelProps {
  clienteId: number;
}

export function NotasClientePanel({ clienteId }: NotasClientePanelProps) {
  const [nuevaNota, setNuevaNota] = useState("");
  const queryClient = useQueryClient();

  const { data: notas = [], isLoading } = useQuery({
    queryKey: ['notas-cliente', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notas_clientes')
        .select(`
          *,
          profiles(nombre_completo)
        `)
        .eq('id_cliente', clienteId)
        .order('creado_en', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const crearNotaMutation = useMutation({
    mutationFn: async (nota: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('notas_clientes')
        .insert({
          id_cliente: clienteId,
          nota: nota,
          creado_por: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas-cliente', clienteId] });
      setNuevaNota("");
      toast.success("Nota agregada exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al agregar nota");
    },
  });

  const handleAgregarNota = () => {
    if (!nuevaNota.trim()) {
      toast.error("La nota no puede estar vacía");
      return;
    }
    crearNotaMutation.mutate(nuevaNota);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notas del Cliente</CardTitle>
        <CardDescription>Anotaciones y observaciones importantes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulario para nueva nota */}
        <div className="space-y-2">
          <Textarea
            placeholder="Escribe una nueva nota..."
            value={nuevaNota}
            onChange={(e) => setNuevaNota(e.target.value)}
            rows={3}
          />
          <Button
            onClick={handleAgregarNota}
            disabled={crearNotaMutation.isPending || !nuevaNota.trim()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Nota
          </Button>
        </div>

        {/* Lista de notas */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-4">Cargando notas...</div>
          ) : notas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay notas registradas
            </div>
          ) : (
            notas.map((nota: any) => (
              <Card key={nota.id}>
                <CardContent className="pt-4">
                  <p className="text-sm whitespace-pre-wrap">{nota.nota}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{nota.profiles?.nombre_completo || 'Usuario desconocido'}</span>
                    <span>{new Date(nota.creado_en).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
