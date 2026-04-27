import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();

    // Validaciones mínimas
    const required = ["id_cliente", "id_sucursal", "id_servicio", "fecha", "hora_inicio", "hora_fin"];
    for (const field of required) {
      if (!payload?.[field]) {
        return new Response(JSON.stringify({ error: `Campo requerido: ${field}` }), {
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const nuevaCita = {
      id_cliente: payload.id_cliente,
      id_sucursal: payload.id_sucursal,
      id_servicio: payload.id_servicio,
      id_empleado: payload.id_empleado || null,
      fecha: payload.fecha,
      hora_inicio: payload.hora_inicio,
      hora_fin: payload.hora_fin,
      estado: "agendada", // Forzado: estado inicial siempre es 'agendada'
      observaciones: payload.observaciones || null,
    };

    const { data, error } = await supabase
      .from("agendas")
      .insert(nuevaCita)
      .select()
      .single();

    if (error) {
      console.error("Error creando cita:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Registrar en bitácora
    await supabase
      .from("bitacora_accion")
      .insert({
        entidad: "agendas",
        accion: "crear_cita",
        id_entidad: data.id,
        usuario: user.id,
        detalle_json: {
          id_cliente: data.id_cliente,
          id_servicio: data.id_servicio,
          fecha: data.fecha,
        },
      });

    return new Response(JSON.stringify({ success: true, cita: data }), {
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error en función crear-cita:", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
