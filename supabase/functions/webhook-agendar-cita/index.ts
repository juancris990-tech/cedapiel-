import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversationState {
  stage: "inicial" | "consultando_horario" | "confirmando_datos" | "creando_cita" | "finalizado";
  nombre?: string;
  telefono?: string;
  email?: string;
  fecha_deseada?: string;
  hora_deseada?: string;
  servicio?: string;
  id_servicio?: number;
  id_empleado?: number;
  id_cliente?: number;
  slots_disponibles?: any[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log("📨 Webhook recibido:", body);

    // Extraer datos del mensaje (ajustar según formato de tu plataforma)
    const mensaje = body.message || body.text || body.Body || "";
    const telefono = body.from || body.From || body.phone || "";
    const canal = body.channel || "whatsapp";

    if (!mensaje || !telefono) {
      console.error("❌ Mensaje o teléfono faltante");
      return new Response(
        JSON.stringify({ error: "Mensaje o teléfono requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`💬 Mensaje de ${telefono}: ${mensaje}`);

    // Obtener o crear conversación
    const { data: conversacion, error: convError } = await supabase
      .from("conversaciones_agendamiento")
      .select("*")
      .eq("telefono", telefono)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let estadoActual: ConversationState = conversacion?.estado || {
      stage: "inicial",
      telefono: telefono,
    };

    console.log("📊 Estado actual:", estadoActual);

    // Construir contexto para la IA
    const systemPrompt = `Eres un asistente virtual de una clínica de belleza. Tu trabajo es ayudar a los clientes a gestionar sus citas (agendar, reagendar o cancelar).

INFORMACIÓN IMPORTANTE:
- Horarios disponibles: Lunes a Viernes 9:00-18:00, Sábados 9:00-14:00
- Servicios: Facial (60 min), Masaje (90 min), Limpieza Facial (45 min), Tratamiento Corporal (120 min)
- Siempre confirma los datos antes de crear la cita

HERRAMIENTAS DISPONIBLES:
1. consultar_horarios_disponibles: Para ver horarios disponibles en una fecha
2. buscar_o_crear_cliente: Para registrar o encontrar al cliente
3. crear_cita: Para confirmar y crear una cita nueva
4. buscar_cita_cliente: Para buscar citas activas de un cliente por teléfono
5. reagendar_cita: Para cambiar fecha/hora de una cita existente (queda confirmada)
6. cancelar_cita: Para cancelar una cita existente y guardar motivo en notas

FLUJOS DE CONVERSACIÓN:
1) AGENDAR NUEVA CITA
   - Identifica servicio, fecha y horario deseado
   - Consulta disponibilidad con consultar_horarios_disponibles
   - Confirma nombre/correo y busca o crea cliente
   - Crea la cita con crear_cita
   - Confirma resumen final al cliente

2) REAGENDAR CITA EXISTENTE
   - Solicita teléfono del cliente si falta
   - Busca sus citas activas con buscar_cita_cliente
   - Si hay varias, pide que elija una (por id, fecha u hora)
   - Solicita nueva fecha/hora y ejecuta reagendar_cita
   - Confirma reagendamiento con el nuevo horario

3) CANCELAR CITA
   - Solicita teléfono del cliente si falta
   - Busca citas activas con buscar_cita_cliente
   - Si hay varias, pide seleccionar cuál cancelar
   - Solicita motivo de cancelación
   - Ejecuta cancelar_cita y confirma que quedó cancelada

REGLAS:
- Antes de reagendar o cancelar, siempre identifica una cita específica.
- Si faltan datos para ejecutar una herramienta, pídelo al cliente de forma clara.
- Usa respuestas breves, amables y orientadas a la acción.

Estado actual de la conversación: ${JSON.stringify(estadoActual)}`;

    // Construir historial de mensajes
    const mensajes = [
      { role: "system", content: systemPrompt },
      { role: "user", content: mensaje },
    ];

    // Llamar a Lovable AI con herramientas
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: mensajes,
        tools: [
          {
            type: "function",
            function: {
              name: "consultar_horarios_disponibles",
              description: "Consulta los horarios disponibles para una fecha específica",
              parameters: {
                type: "object",
                properties: {
                  fecha: {
                    type: "string",
                    description: "Fecha en formato YYYY-MM-DD",
                  },
                  id_servicio: {
                    type: "number",
                    description: "ID del servicio (opcional)",
                  },
                },
                required: ["fecha"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "buscar_o_crear_cliente",
              description: "Busca un cliente existente o crea uno nuevo",
              parameters: {
                type: "object",
                properties: {
                  nombre: { type: "string", description: "Nombre completo del cliente" },
                  telefono: { type: "string", description: "Teléfono del cliente" },
                  email: { type: "string", description: "Email del cliente (opcional)" },
                },
                required: ["nombre", "telefono"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "crear_cita",
              description: "Crea una nueva cita en el sistema",
              parameters: {
                type: "object",
                properties: {
                  id_cliente: { type: "number", description: "ID del cliente" },
                  id_empleado: { type: "number", description: "ID del empleado/profesional" },
                  id_servicio: { type: "number", description: "ID del servicio" },
                  fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
                  hora_inicio: { type: "string", description: "Hora en formato HH:MM:SS" },
                  duracion_minutos: { type: "number", description: "Duración en minutos" },
                },
                required: ["id_cliente", "id_empleado", "id_servicio", "fecha", "hora_inicio", "duracion_minutos"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "buscar_cita_cliente",
              description: "Busca citas activas (pendiente o confirmada) de un cliente por teléfono",
              parameters: {
                type: "object",
                properties: {
                  telefono: {
                    type: "string",
                    description: "Teléfono del cliente",
                  },
                },
                required: ["telefono"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "reagendar_cita",
              description: "Reagenda una cita existente cambiando fecha/hora y estado a confirmada",
              parameters: {
                type: "object",
                properties: {
                  cita_id: { type: "number", description: "ID de la cita a reagendar" },
                  nueva_fecha: { type: "string", description: "Nueva fecha en formato YYYY-MM-DD" },
                  nueva_hora: { type: "string", description: "Nueva hora en formato HH:MM:SS" },
                },
                required: ["cita_id", "nueva_fecha", "nueva_hora"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "cancelar_cita",
              description: "Cancela una cita y guarda el motivo en notas",
              parameters: {
                type: "object",
                properties: {
                  cita_id: { type: "number", description: "ID de la cita a cancelar" },
                  motivo_cancelacion: {
                    type: "string",
                    description: "Motivo de cancelación proporcionado por el cliente",
                  },
                },
                required: ["cita_id", "motivo_cancelacion"],
              },
            },
          },
        ],
        tool_choice: "auto",
      }),
    });

    if (!aiResponse.ok) {
      console.error("❌ Error en Lovable AI:", await aiResponse.text());
      throw new Error("Error en el servicio de IA");
    }

    const aiData = await aiResponse.json();
    console.log("🤖 Respuesta de IA:", JSON.stringify(aiData, null, 2));

    const choice = aiData.choices[0];
    let respuestaFinal = "";
    let toolCalls = choice.message.tool_calls || [];

    // Procesar llamadas a herramientas
    if (toolCalls.length > 0) {
      console.log("🔧 Procesando herramientas:", toolCalls.length);

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`⚙️ Ejecutando: ${functionName}`, functionArgs);

        if (functionName === "consultar_horarios_disponibles") {
          const { fecha, id_servicio } = functionArgs;

          // Llamar a la API de slots
          const slotsUrl = `${supabaseUrl}/functions/v1/api-agenda-slots?fecha=${fecha}${
            id_servicio ? `&id_servicio=${id_servicio}` : ""
          }&id_sucursal=1`;

          const slotsResponse = await fetch(slotsUrl, {
            headers: {
              "x-api-key": "clinic_api_key_2025_n8n_integration",
            },
          });

          const slotsData = await slotsResponse.json();
          estadoActual.slots_disponibles = slotsData.slots || [];
          estadoActual.fecha_deseada = fecha;

          console.log("📅 Slots disponibles:", slotsData.slots?.length || 0);
        } else if (functionName === "buscar_o_crear_cliente") {
          const { nombre, telefono, email } = functionArgs;

          // Buscar cliente existente
          const { data: clienteExistente } = await supabase
            .from("clientes")
            .select("id")
            .eq("telefono", telefono)
            .maybeSingle();

          if (clienteExistente) {
            estadoActual.id_cliente = clienteExistente.id;
            console.log("✅ Cliente encontrado:", clienteExistente.id);
          } else {
            // Crear nuevo cliente
            const [nombreParte, ...apellidosParte] = nombre.split(" ");
            const { data: nuevoCliente, error: errorCliente } = await supabase
              .from("clientes")
              .insert({
                nombre: nombreParte,
                apellidos: apellidosParte.join(" ") || "",
                telefono: telefono,
                email: email || null,
              })
              .select()
              .single();

            if (errorCliente) {
              console.error("❌ Error creando cliente:", errorCliente);
            } else {
              estadoActual.id_cliente = nuevoCliente.id;
              console.log("✅ Cliente creado:", nuevoCliente.id);
            }
          }

          estadoActual.nombre = nombre;
          estadoActual.email = email;
        } else if (functionName === "crear_cita") {
          const { id_cliente, id_empleado, id_servicio, fecha, hora_inicio, duracion_minutos } = functionArgs;

          // Llamar a la API para crear cita
          const crearCitaUrl = `${supabaseUrl}/functions/v1/crear-cita`;

          const citaResponse = await fetch(crearCitaUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": "clinic_api_key_2025_n8n_integration",
            },
            body: JSON.stringify({
              id_cliente,
              id_empleado,
              id_servicio,
              fecha,
              hora_inicio,
              duracion_minutos,
              id_sucursal: 1,
            }),
          });

          const citaData = await citaResponse.json();

          if (citaData.cita) {
            estadoActual.stage = "finalizado";
            console.log("✅ Cita creada:", citaData.cita.id);

            // Crear lead en CRM
            await supabase.from("leads").insert({
              nombre: estadoActual.nombre,
              telefono: estadoActual.telefono,
              email: estadoActual.email,
              canal_origen: canal,
              pipeline_stage: "cita_agendada",
              cita_id: citaData.cita.id,
            });
          } else {
            console.error("❌ Error creando cita:", citaData);
          }
        } else if (functionName === "buscar_cita_cliente") {
          const { telefono } = functionArgs;

          const { data: citasCliente, error: citasError } = await supabase
            .from("agendas")
            .select(`
              id,
              fecha,
              hora_inicio,
              estado,
              clientes!inner(telefono),
              servicios(nombre),
              empleados(nombre)
            `)
            .eq("clientes.telefono", telefono)
            .in("estado", ["pendiente", "confirmada"])
            .order("fecha", { ascending: true })
            .order("hora_inicio", { ascending: true });

          if (citasError) {
            console.error("❌ Error buscando citas del cliente:", citasError);
          } else {
            const citasNormalizadas = (citasCliente || []).map((cita: any) => ({
              id: cita.id,
              fecha: cita.fecha,
              hora: cita.hora_inicio,
              estado: cita.estado,
              servicio: cita.servicios?.nombre || null,
              empleado: cita.empleados?.nombre || null,
            }));

            (estadoActual as any).citas_cliente = citasNormalizadas;
            estadoActual.telefono = telefono;
            console.log("✅ Citas activas encontradas:", citasNormalizadas.length);
          }
        } else if (functionName === "reagendar_cita") {
          const { cita_id, nueva_fecha, nueva_hora } = functionArgs;

          const { data: citaActualizada, error: reagendarError } = await supabase
            .from("agendas")
            .update({
              fecha: nueva_fecha,
              hora_inicio: nueva_hora,
              estado: "confirmada",
              updated_at: new Date().toISOString(),
            })
            .eq("id", cita_id)
            .select("id, fecha, hora_inicio, estado")
            .maybeSingle();

          if (reagendarError) {
            console.error("❌ Error reagendando cita:", reagendarError);
          } else {
            (estadoActual as any).ultima_cita_reagendada = {
              id: citaActualizada?.id || cita_id,
              fecha: citaActualizada?.fecha || nueva_fecha,
              hora: citaActualizada?.hora_inicio || nueva_hora,
              estado: citaActualizada?.estado || "confirmada",
            };
            console.log("✅ Cita reagendada:", citaActualizada?.id || cita_id);
          }
        } else if (functionName === "cancelar_cita") {
          const { cita_id, motivo_cancelacion } = functionArgs;

          const { data: citaCancelada, error: cancelarError } = await supabase
            .from("agendas")
            .update({
              estado: "cancelada",
              notas: motivo_cancelacion,
              updated_at: new Date().toISOString(),
            })
            .eq("id", cita_id)
            .select("id, estado, notas")
            .maybeSingle();

          if (cancelarError) {
            console.error("❌ Error cancelando cita:", cancelarError);
          } else {
            (estadoActual as any).ultima_cita_cancelada = {
              id: citaCancelada?.id || cita_id,
              estado: citaCancelada?.estado || "cancelada",
              motivo_cancelacion: citaCancelada?.notas || motivo_cancelacion,
            };
            console.log("✅ Cita cancelada:", citaCancelada?.id || cita_id);
          }
        }
      }

      // Obtener respuesta final después de ejecutar herramientas
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: mensaje },
            {
              role: "assistant",
              content: `He ejecutado las funciones necesarias. Estado actualizado: ${JSON.stringify(estadoActual)}`,
            },
            {
              role: "user",
              content: "Genera una respuesta amigable para el cliente con la información actualizada",
            },
          ],
        }),
      });

      const followUpData = await followUpResponse.json();
      respuestaFinal = followUpData.choices[0].message.content;
    } else {
      respuestaFinal = choice.message.content;
    }

    console.log("💬 Respuesta final:", respuestaFinal);

    // Guardar conversación
    if (conversacion) {
      await supabase
        .from("conversaciones_agendamiento")
        .update({
          estado: estadoActual,
          ultimo_mensaje: mensaje,
          ultima_respuesta: respuestaFinal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversacion.id);
    } else {
      await supabase.from("conversaciones_agendamiento").insert({
        telefono: telefono,
        canal: canal,
        estado: estadoActual,
        ultimo_mensaje: mensaje,
        ultima_respuesta: respuestaFinal,
      });
    }

    // Responder al webhook (formato depende de tu plataforma)
    return new Response(
      JSON.stringify({
        success: true,
        reply: respuestaFinal,
        // Para WhatsApp Business API:
        messaging_product: "whatsapp",
        to: telefono,
        text: { body: respuestaFinal },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error en webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
