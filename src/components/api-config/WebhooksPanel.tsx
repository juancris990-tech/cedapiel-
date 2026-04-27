import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ExternalLink, Activity } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AVAILABLE_EVENTS = [
  'appointment.created',
  'appointment.confirmed',
  'appointment.cancelled',
  'appointment.updated',
  'lead.created',
  'lead.tag_added',
  'lead.tag_removed',
  'lead.stage_changed',
];

export default function WebhooksPanel() {
  const [showDialog, setShowDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [selectedWebhookId, setSelectedWebhookId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    url: "",
    eventos: [] as string[],
  });
  const queryClient = useQueryClient();

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['webhook-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_configs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['webhook-logs', selectedWebhookId],
    queryFn: async () => {
      if (!selectedWebhookId) return [];
      
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('webhook_config_id', selectedWebhookId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedWebhookId,
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('webhook_configs')
        .insert({
          nombre: data.nombre,
          url: data.url,
          eventos: data.eventos,
          activo: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-configs'] });
      toast.success('Webhook creado exitosamente');
      setShowDialog(false);
      setFormData({ nombre: "", url: "", eventos: [] });
    },
    onError: (error: any) => {
      toast.error('Error al crear webhook: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: number; activo: boolean }) => {
      const { error } = await supabase
        .from('webhook_configs')
        .update({ activo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-configs'] });
      toast.success('Estado actualizado');
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('webhook_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-configs'] });
      toast.success('Webhook eliminado');
    },
  });

  const handleEventToggle = (event: string) => {
    setFormData(prev => ({
      ...prev,
      eventos: prev.eventos.includes(event)
        ? prev.eventos.filter(e => e !== event)
        : [...prev.eventos, event]
    }));
  };

  const handleSubmit = () => {
    if (!formData.nombre || !formData.url || formData.eventos.length === 0) {
      toast.error('Completa todos los campos');
      return;
    }

    createWebhookMutation.mutate(formData);
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Configura webhooks para recibir eventos en tiempo real
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Webhook
        </Button>
      </div>

      <div className="grid gap-4">
        {webhooks.map((webhook: any) => (
          <Card key={webhook.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{webhook.nombre}</CardTitle>
                  <Badge variant={webhook.activo ? "default" : "secondary"}>
                    {webhook.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedWebhookId(webhook.id);
                      setShowLogsDialog(true);
                    }}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Logs
                  </Button>
                  <Switch
                    checked={webhook.activo}
                    onCheckedChange={(checked) => 
                      toggleActiveMutation.mutate({ id: webhook.id, activo: checked })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('¿Eliminar este webhook?')) {
                        deleteWebhookMutation.mutate(webhook.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                Creado el {new Date(webhook.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-muted px-2 py-1 rounded flex-1 truncate">
                      {webhook.url}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(webhook.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Eventos suscritos</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {webhook.eventos.map((evento: string) => (
                      <Badge key={evento} variant="outline">
                        {evento}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {webhooks.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No hay webhooks configurados. Crea uno para recibir eventos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog para crear webhook */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Webhook</DialogTitle>
            <DialogDescription>
              Configura un endpoint para recibir eventos en tiempo real
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                placeholder="ej: n8n WhatsApp Notifications"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="url">URL del Webhook</Label>
              <Input
                id="url"
                placeholder="https://your-n8n.com/webhook/..."
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>

            <div>
              <Label>Eventos a escuchar</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {AVAILABLE_EVENTS.map(event => (
                  <div key={event} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={event}
                      checked={formData.eventos.includes(event)}
                      onChange={() => handleEventToggle(event)}
                      className="rounded"
                    />
                    <label htmlFor={event} className="text-sm cursor-pointer">
                      {event}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createWebhookMutation.isPending}>
              Crear Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de logs */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Logs del Webhook</DialogTitle>
            <DialogDescription>
              Últimas 50 entregas del webhook
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {logs.map((log: any) => (
              <Card key={log.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.evento}</Badge>
                      {log.status_code && (
                        <Badge variant={log.status_code >= 200 && log.status_code < 300 ? "default" : "destructive"}>
                          {log.status_code}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {log.error_message && (
                    <p className="text-sm text-destructive mb-2">
                      Error: {log.error_message}
                    </p>
                  )}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Ver payload
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            ))}

            {logs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No hay logs disponibles
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
