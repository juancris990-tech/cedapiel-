import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/AppLayout";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Tag, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Lead {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  canal_origen: string | null;
  pipeline_stage: string;
  created_at: string;
  updated_at: string;
  lead_tags?: Array<{
    tag_id: number;
    tags: {
      nombre: string;
      color: string | null;
    };
  }>;
}

const PIPELINE_STAGES = [
  { id: "lead_nuevo", label: "Nuevo Lead", color: "bg-blue-500" },
  { id: "contactado", label: "Contactado", color: "bg-purple-500" },
  { id: "calificado", label: "Calificado", color: "bg-yellow-500" },
  { id: "cita_agendada", label: "Cita Agendada", color: "bg-orange-500" },
  { id: "cliente_activo", label: "Cliente Activo", color: "bg-green-500" },
  { id: "perdido", label: "Perdido", color: "bg-red-500" },
];

const CRM = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          lead_tags (
            tag_id,
            tags (
              nombre,
              color
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const leadId = active.id as number;
    const newStage = over.id as string;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.pipeline_stage === newStage) {
      setActiveId(null);
      return;
    }

    // Optimistic update
    setLeads((prevLeads) =>
      prevLeads.map((l) =>
        l.id === leadId ? { ...l, pipeline_stage: newStage } : l
      )
    );

    try {
      const { error } = await supabase
        .from("leads")
        .update({ pipeline_stage: newStage })
        .eq("id", leadId);

      if (error) throw error;

      toast({
        title: "Lead actualizado",
        description: `El lead se movió a ${
          PIPELINE_STAGES.find((s) => s.id === newStage)?.label
        }`,
      });
    } catch (error: any) {
      // Revert on error
      setLeads((prevLeads) =>
        prevLeads.map((l) =>
          l.id === leadId ? { ...l, pipeline_stage: lead.pipeline_stage } : l
        )
      );
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActiveId(null);
    }
  };

  const getLeadsByStage = (stageId: string) => {
    return leads.filter((lead) => lead.pipeline_stage === stageId);
  };

  const activeLead = leads.find((l) => l.id === activeId);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Cargando leads...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">CRM - Pipeline de Leads</h1>
          <p className="text-muted-foreground">
            Arrastra y suelta leads entre etapas para actualizar su estado
          </p>
        </div>

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {PIPELINE_STAGES.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                leads={getLeadsByStage(stage.id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </AppLayout>
  );
};

interface KanbanColumnProps {
  stage: { id: string; label: string; color: string };
  leads: Lead[];
}

const KanbanColumn = ({ stage, leads }: KanbanColumnProps) => {
  const { setNodeRef } = useDroppable({
    id: stage.id,
  });

  return (
    <div className="flex flex-col h-full">
      <div className={`${stage.color} text-white p-3 rounded-t-lg`}>
        <h3 className="font-semibold text-sm">{stage.label}</h3>
        <p className="text-xs opacity-90">{leads.length} leads</p>
      </div>

      <ScrollArea className="flex-1 bg-muted/30 rounded-b-lg border border-t-0">
        <div
          ref={setNodeRef}
          className="p-2 space-y-2 min-h-[200px]"
        >
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

interface LeadCardProps {
  lead: Lead;
  isDragging?: boolean;
}

const LeadCard = ({ lead, isDragging = false }: LeadCardProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
    data: lead,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card
        className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
          isDragging ? "opacity-50" : ""
        }`}
      >
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-medium">{lead.nombre}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          {lead.email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.telefono && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{lead.telefono}</span>
            </div>
          )}
          {lead.canal_origen && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-xs">
                {lead.canal_origen}
              </Badge>
            </div>
          )}
          {lead.lead_tags && lead.lead_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lead.lead_tags.map((tagRelation) => (
                <Badge
                  key={tagRelation.tag_id}
                  variant="secondary"
                  className="text-xs"
                  style={{
                    backgroundColor: tagRelation.tags.color || undefined,
                  }}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tagRelation.tags.nombre}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(lead.created_at).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRM;
