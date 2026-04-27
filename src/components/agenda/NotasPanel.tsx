import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare, Send } from "lucide-react";

interface NotasPanelProps {
  type: 'cliente' | 'cita';
  id: number;
}

export function NotasPanel({ type, id }: NotasPanelProps) {
  const [newNota, setNewNota] = useState('');
  const queryClient = useQueryClient();

  const { data: notas, isLoading } = useQuery({
    queryKey: [`notas-${type}`, id],
    queryFn: async () => {
      if (type === 'cliente') {
        const { data, error } = await supabase
          .from('notas_clientes')
          .select(`
            *,
            profiles:creado_por(nombre_completo, email)
          `)
          .eq('id_cliente', id)
          .order('creado_en', { ascending: false });

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('notas_citas')
          .select(`
            *,
            profiles:creado_por(nombre_completo, email)
          `)
          .eq('id_cita', id)
          .order('creado_en', { ascending: false });

        if (error) throw error;
        return data;
      }
    },
  });

  const createNota = useMutation({
    mutationFn: async (nota: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      if (type === 'cliente') {
        const { error } = await supabase.from('notas_clientes').insert({
          id_cliente: id,
          nota,
          creado_por: user.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notas_citas').insert({
          id_cita: id,
          nota,
          creado_por: user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`notas-${type}`, id] });
      toast.success('Nota agregada correctamente');
      setNewNota('');
    },
    onError: (error: any) => {
      toast.error('Error al agregar nota: ' + error.message);
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Notas del {type === 'cliente' ? 'Cliente' : 'Cita'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={newNota}
            onChange={(e) => setNewNota(e.target.value)}
            placeholder="Escribe una nota..."
            className="min-h-[100px]"
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {newNota.length}/1000
            </span>
            <Button
              onClick={() => createNota.mutate(newNota)}
              disabled={!newNota.trim() || createNota.isPending}
              size="sm"
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {createNota.isPending ? 'Enviando...' : 'Agregar Nota'}
            </Button>
          </div>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando notas...</p>
          ) : notas && notas.length > 0 ? (
            notas.map((nota: any) => (
              <div key={nota.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {nota.profiles?.nombre_completo
                      ? getInitials(nota.profiles.nombre_completo)
                      : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {nota.profiles?.nombre_completo || 'Usuario desconocido'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(nota.creado_en), "d 'de' MMM, HH:mm", { locale: es })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {nota.nota}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay notas registradas
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
