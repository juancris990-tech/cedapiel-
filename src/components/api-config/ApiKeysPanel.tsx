import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Eye, EyeOff, RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function ApiKeysPanel() {
  const [showDialog, setShowDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [showKey, setShowKey] = useState<Record<number, boolean>>({});
  const queryClient = useQueryClient();

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: async (nombre: string) => {
      // Generate random key
      const randomKey = `sk_${Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;
      
      setGeneratedKey(randomKey);

      // Hash the key for storage
      const encoder = new TextEncoder();
      const data = encoder.encode(randomKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: newKey, error } = await supabase
        .from('api_keys')
        .insert({
          nombre,
          key_hash: keyHash,
          permisos: { read: true, write: true, admin: false },
          activo: true
        })
        .select()
        .single();

      if (error) throw error;
      return newKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API Key creada exitosamente');
    },
    onError: (error: any) => {
      toast.error('Error al crear API Key: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: number; activo: boolean }) => {
      const { error } = await supabase
        .from('api_keys')
        .update({ activo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('Estado actualizado');
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API Key eliminada');
    },
  });

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Ingresa un nombre para la API Key');
      return;
    }

    try {
      await createKeyMutation.mutateAsync(newKeyName);
      // No cerrar el diálogo - mostrar la key generada
    } catch (error) {
      console.error('Error creating key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const toggleShowKey = (id: number) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona las claves de API para integraciones externas
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva API Key
        </Button>
      </div>

      <div className="grid gap-4">
        {apiKeys.map((key: any) => (
          <Card key={key.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{key.nombre}</CardTitle>
                  <Badge variant={key.activo ? "default" : "secondary"}>
                    {key.activo ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={key.activo}
                    onCheckedChange={(checked) => 
                      toggleActiveMutation.mutate({ id: key.id, activo: checked })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('¿Eliminar esta API Key?')) {
                        deleteKeyMutation.mutate(key.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                Creada el {new Date(key.created_at).toLocaleDateString()}
                {key.last_used_at && ` • Último uso: ${new Date(key.last_used_at).toLocaleDateString()}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Hash (SHA-256)</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={showKey[key.id] ? key.key_hash : '•'.repeat(64)}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowKey(key.id)}
                  >
                    {showKey[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(key.key_hash)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">
                    Lectura: {key.permisos?.read ? '✓' : '✗'}
                  </Badge>
                  <Badge variant="outline">
                    Escritura: {key.permisos?.write ? '✓' : '✗'}
                  </Badge>
                  <Badge variant="outline">
                    Admin: {key.permisos?.admin ? '✓' : '✗'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {apiKeys.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No hay API Keys configuradas. Crea una para comenzar.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog para crear nueva key */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva API Key</DialogTitle>
            <DialogDescription>
              {generatedKey 
                ? 'Guarda esta clave en un lugar seguro. No podrás verla de nuevo.'
                : 'Crea una nueva clave de API para integraciones externas.'
              }
            </DialogDescription>
          </DialogHeader>

          {generatedKey ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Tu nueva API Key
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={generatedKey}
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(generatedKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-destructive">
                ⚠️ Importante: Copia esta clave ahora. Por seguridad, solo se muestra una vez.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="key-name">Nombre de la clave</Label>
                <Input
                  id="key-name"
                  placeholder="ej: n8n Integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {generatedKey ? (
              <Button onClick={() => {
                setShowDialog(false);
                setGeneratedKey("");
                setNewKeyName("");
              }}>
                Cerrar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => {
                  setShowDialog(false);
                  setNewKeyName("");
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateKey} disabled={createKeyMutation.isPending}>
                  {createKeyMutation.isPending && <RotateCw className="h-4 w-4 mr-2 animate-spin" />}
                  Crear API Key
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
