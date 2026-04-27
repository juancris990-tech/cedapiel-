import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { descripcion, trigger_type } = await req.json();

    if (!descripcion) {
      return new Response(
        JSON.stringify({ error: 'La descripción es requerida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no está configurado');
    }

    const systemPrompt = `Eres un experto en sistemas de automatización. Tu tarea es convertir descripciones en lenguaje natural a configuraciones JSON para reglas de automatización.

TIPOS DE ACCIONES DISPONIBLES:

1. update_appointment - Actualizar estado de una cita
   Estructura: { "type": "update_appointment", "estado": "confirmada" | "cancelada" | "completada" }

2. update_lead_stage - Cambiar etapa del pipeline de un lead
   Estructura: { "type": "update_lead_stage", "stage": "nuevo" | "contactado" | "calificado" | "negociacion" | "ganado" | "perdido" }

3. add_tag - Agregar un tag a un lead
   Estructura: { "type": "add_tag", "tag_name": "nombre del tag" }

4. webhook - Enviar datos a un webhook externo
   Estructura: { "type": "webhook", "url": "https://...", "event": "nombre_evento" }

REGLAS:
- Siempre devuelve un array de acciones válido
- Usa solo los tipos de acción listados arriba
- Los valores de "estado" y "stage" deben ser exactamente como se especifican
- Para webhooks, usa URLs reales si se proporcionan, o placeholders como "https://tu-webhook.com/endpoint"

Contexto adicional:
- Trigger actual: ${trigger_type || 'no especificado'}

RESPONDE SOLO CON EL JSON DEL ARRAY DE ACCIONES, SIN EXPLICACIONES.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Genera las acciones de automatización para: ${descripcion}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de tasa excedido. Intenta de nuevo en unos momentos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Se requiere pago. Agrega créditos a tu workspace de Lovable AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Error de AI gateway:', response.status, errorText);
      throw new Error('Error al comunicarse con el servicio de IA');
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content.trim();
    
    // Intentar extraer JSON si viene envuelto en markdown
    let jsonText = generatedText;
    const jsonMatch = generatedText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    // Validar que sea JSON válido
    let actions;
    try {
      actions = JSON.parse(jsonText);
      if (!Array.isArray(actions)) {
        throw new Error('Las acciones deben ser un array');
      }
    } catch (parseError) {
      console.error('Error al parsear JSON generado:', parseError, 'Texto:', jsonText);
      return new Response(
        JSON.stringify({ error: 'La IA generó un formato inválido. Intenta con una descripción más específica.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ actions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en generar-acciones-automatizacion:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
