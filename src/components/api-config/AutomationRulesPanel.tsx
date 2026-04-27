import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Play, Pause, Sparkles } from "lucide-react";
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

const TRIGGERS = [
  { value: 'on_appointment_created', label: 'Cuando se crea una cita' },
  { value: 'on_appointment_confirmed', label: 'Cuando se confirma una cita' },
  { value: 'on_appointment_cancelled', label: 'Cuando se cancela una cita' },
  { value: 'on_tag_added', label: 'Cuando se agrega un tag' },
  { value: 'on_tag_removed', label: 'Cuando se remueve un tag' },
  { value: 'on_pipeline_stage_changed', label: 'Cuando cambia etapa del pipeline' },
];

const ACTION_TYPES = [
  { value: 'update_appointment', label: 'Actualizar estado de cita' },
  { value: 'update_lead_stage', label: 'Cambiar etapa del lead' },
  { value: 'add_tag', label: 'Agregar tag al lead' },
  { value: 'webhook', label: 'Enviar webhook' },
];

export default function AutomationRulesPanel() {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    trigger_type: "",
    trigger_config: {},
    actions: [] as any[],
  });
  const [actionsJson, setActionsJson] = useState('[\n  {\n    "type": "update_appointment",\n    "estado": "confirmada"\n  }\n]');
  const [aiDescription, setAiDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['automation-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('automation_rules')
        .insert({
          nombre: data.nombre,
          trigger_type: data.trigger_type,
          trigger_config: data.trigger_config,
          actions: data.actions,
          activo: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast.success('Regla de automatización creada');
      setShowDialog(false);
      setFormData({ nombre: "", trigger_type: "", trigger_config: {}, actions: [] });
      setActionsJson('[\n  {\n    "type": "update_appointment",\n    "estado": "confirmada"\n  }\n]');
      setAiDescription('');
    },
    onError: (error: any) => {
      toast.error('Error al crear regla: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: number; activo: boolean }) => {
      const { error } = await supabase
        .from('automation_rules')
        .update({ activo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast.success('Estado actualizado');
    },
  });

  const handleGenerateWithAI = async () => {
    if (!aiDescription.trim()) {
      toast.error('Describe qué acciones quieres automatizar');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generar-acciones-automatizacion', {
        body: { 
          descripcion: aiDescription,
          trigger_type: formData.trigger_type 
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.actions) {
        const formattedJson = JSON.stringify(data.actions, null, 2);
        setActionsJson(formattedJson);
        toast.success('Acciones generadas con IA');
      }
    } catch (error: any) {
      console.error('Error generando acciones:', error);
      toast.error('Error al generar acciones: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast.success('Regla eliminada');
    },
  });

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Reglas de Automatización</h2>
          <p className="text-sm text-muted-foreground">
            Define acciones automáticas basadas en eventos del sistema
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Regla
        </Button>
      </div>

      <div className="grid gap-4">
        {rules.map((rule: any) => (
          <Card key={rule.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{rule.nombre}</CardTitle>
                  <Badge variant={rule.activo ? "default" : "secondary"}>
                    {rule.activo ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.activo}
                    onCheckedChange={(checked) => 
                      toggleActiveMutation.mutate({ id: rule.id, activo: checked })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('¿Eliminar esta regla?')) {
                        deleteRuleMutation.mutate(rule.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                Creada el {new Date(rule.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Trigger</Label>
                  <p className="text-sm mt-1">
                    {TRIGGERS.find(t => t.value === rule.trigger_type)?.label || rule.trigger_type}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Acciones ({rule.actions.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {rule.actions.map((action: any, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {ACTION_TYPES.find(a => a.value === action.type)?.label || action.type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {rules.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No hay reglas de automatización configuradas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Logs recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Logs Recientes</CardTitle>
          <CardDescription>Últimas 20 ejecuciones de automatizaciones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-3">
                  <Badge variant={log.success ? "default" : "destructive"}>
                    {log.success ? 'Éxito' : 'Error'}
                  </Badge>
                  <span className="text-sm">{log.trigger_event}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}

            {logs.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No hay logs disponibles
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para crear regla */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Regla de Automatización</DialogTitle>
            <DialogDescription>
              Define trigger y acciones para automatizar flujos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre de la regla</Label>
              <Input
                id="nombre"
                placeholder="ej: Confirmar cita al agregar tag"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="trigger">Trigger</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, trigger_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un trigger" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map(trigger => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <Label htmlFor="ai-description" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generar con IA
                </Label>
                <p className="text-xs text-muted-foreground">
                  Describe lo que quieres automatizar y la IA generará el JSON por ti
                </p>
                <div className="flex gap-2">
                  <Input
                    id="ai-description"
                    placeholder="ej: Confirmar la cita y agregar tag de cliente confirmado"
                    value={aiDescription}
                    onChange={(e) => setAiDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGenerateWithAI();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleGenerateWithAI} 
                    disabled={isGenerating || !aiDescription.trim()}
                    size="sm"
                  >
                    {isGenerating ? 'Generando...' : 'Generar'}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="actions">Acciones (JSON)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  O edita manualmente las acciones en formato JSON
                </p>
                <Textarea
                  id="actions"
                  placeholder="Configura las acciones en formato JSON"
                  value={actionsJson}
                  onChange={(e) => setActionsJson(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tipos disponibles: update_appointment, update_lead_stage, add_tag, webhook
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!formData.nombre || !formData.trigger_type) {
                  toast.error('Completa los campos requeridos');
                  return;
                }
                
                // Validar y parsear el JSON de acciones
                try {
                  const parsedActions = JSON.parse(actionsJson);
                  if (!Array.isArray(parsedActions)) {
                    toast.error('Las acciones deben ser un array JSON');
                    return;
                  }
                  createRuleMutation.mutate({ ...formData, actions: parsedActions });
                } catch (error) {
                  toast.error('JSON de acciones inválido. Verifica la sintaxis.');
                }
              }}
              disabled={createRuleMutation.isPending}
            >
              Crear Regla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
