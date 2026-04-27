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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verificar autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log("Payload recibido:", payload);

    const {
      cita_id,
      cliente_nombre,
      servicio_nombre,
      sucursal_nombre,
      profesional_nombre,
      fecha,
      hora_inicio,
      hora_fin,
      estado,
      observaciones,
      motivo_cancelacion,
    } = payload;

    if (!cita_id) {
      return new Response(
        JSON.stringify({ error: "ID de cita es requerido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Buscar o crear cliente
    let clienteId: number;
    const { data: clienteExistente } = await supabase
      .from("clientes")
      .select("id")
      .ilike("nombre", cliente_nombre.trim())
      .single();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
      console.log("Cliente encontrado:", clienteId);
    } else {
      const { data: nuevoCliente, error: clienteError } = await supabase
        .from("clientes")
        .insert({
          nombre: cliente_nombre.trim(),
          activo: true,
        })
        .select("id")
        .single();

      if (clienteError) {
        console.error("Error creando cliente:", clienteError);
        return new Response(JSON.stringify({ error: "Error al crear cliente" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      clienteId = nuevoCliente.id;
      console.log("Cliente creado:", clienteId);
    }

    // 2. Buscar o crear servicio
    let servicioId: number | null = null;
    if (servicio_nombre && servicio_nombre.trim()) {
      const { data: servicioExistente } = await supabase
        .from("servicios")
        .select("id")
        .ilike("nombre", servicio_nombre.trim())
        .single();

      if (servicioExistente) {
        servicioId = servicioExistente.id;
        console.log("Servicio encontrado:", servicioId);
      } else {
        const { data: nuevoServicio, error: servicioError } = await supabase
          .from("servicios")
          .insert({
            nombre: servicio_nombre.trim(),
            activo: true,
            precio: 0,
            duracion_minutos: 60,
          })
          .select("id")
          .single();

        if (servicioError) {
          console.error("Error creando servicio:", servicioError);
          return new Response(JSON.stringify({ error: "Error al crear servicio" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        servicioId = nuevoServicio.id;
        console.log("Servicio creado:", servicioId);
      }
    }

    // 3. Buscar o crear sucursal
    let sucursalId: number;
    const { data: sucursalExistente } = await supabase
      .from("sucursales")
      .select("id")
      .ilike("nombre", sucursal_nombre.trim())
      .single();

    if (sucursalExistente) {
      sucursalId = sucursalExistente.id;
      console.log("Sucursal encontrada:", sucursalId);
    } else {
      const { data: nuevaSucursal, error: sucursalError } = await supabase
        .from("sucursales")
        .insert({
          nombre: sucursal_nombre.trim(),
          direccion: "Por definir",
          activo: true,
        })
        .select("id")
        .single();

      if (sucursalError) {
        console.error("Error creando sucursal:", sucursalError);
        return new Response(JSON.stringify({ error: "Error al crear sucursal" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      sucursalId = nuevaSucursal.id;
      console.log("Sucursal creada:", sucursalId);
    }

    // 4. Buscar o crear empleado/profesional
    let empleadoId: number | null = null;
    if (profesional_nombre && profesional_nombre.trim()) {
      const { data: empleadoExistente } = await supabase
        .from("empleados")
        .select("id")
        .ilike("nombre", profesional_nombre.trim())
        .single();

      if (empleadoExistente) {
        empleadoId = empleadoExistente.id;
        console.log("Empleado encontrado:", empleadoId);
      } else {
        const { data: nuevoEmpleado, error: empleadoError } = await supabase
          .from("empleados")
          .insert({
            nombre: profesional_nombre.trim(),
            activo: true,
            es_profesional: true,
          })
          .select("id")
          .single();

        if (empleadoError) {
          console.error("Error creando empleado:", empleadoError);
          return new Response(JSON.stringify({ error: "Error al crear empleado" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        empleadoId = nuevoEmpleado.id;
        console.log("Empleado creado:", empleadoId);
      }
    }

    // 5. Actualizar la cita
    const { data: citaActualizada, error: citaError } = await supabase
      .from("agendas")
      .update({
        id_cliente: clienteId,
        id_servicio: servicioId,
        id_sucursal: sucursalId,
        id_empleado: empleadoId,
        fecha,
        hora_inicio,
        hora_fin,
        estado: estado || "agendada",
        observaciones: observaciones || null,
        motivo_cancelacion: motivo_cancelacion || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cita_id)
      .select()
      .single();

    if (citaError) {
      console.error("Error actualizando cita:", citaError);
      return new Response(
        JSON.stringify({ error: "Error al actualizar la cita", details: citaError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Cita actualizada exitosamente:", citaActualizada);

    return new Response(
      JSON.stringify({ 
        success: true, 
        cita: citaActualizada,
        message: "Cita actualizada exitosamente"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error general:", error);
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
