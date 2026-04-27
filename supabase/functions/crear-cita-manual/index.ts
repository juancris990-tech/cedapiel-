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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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

    // Validar campos requeridos
    const required = [
      "cliente_nombre",
      "servicio_nombre",
      "sucursal_nombre",
      "profesional_nombre",
      "fecha",
      "hora_inicio",
      "hora_fin",
    ];
    
    for (const field of required) {
      if (!payload[field]) {
        return new Response(JSON.stringify({ error: `Campo requerido: ${field}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 1. Buscar o crear cliente
    let clienteId: number;
    const nombreParts = payload.cliente_nombre.trim().split(" ");
    const primerNombre = nombreParts[0];
    const apellidos = nombreParts.slice(1).join(" ");

    // Primero buscar por email si se proporcionó
    let clienteExistente = null;
    if (payload.cliente_email) {
      const { data: clientePorEmail } = await supabase
        .from("clientes")
        .select("id")
        .eq("email", payload.cliente_email.trim())
        .maybeSingle();
      
      if (clientePorEmail) {
        clienteExistente = clientePorEmail;
        console.log("Cliente encontrado por email:", clientePorEmail.id);
      }
    }

    // Si no se encontró por email, buscar por nombre
    if (!clienteExistente) {
      const { data: clientePorNombre } = await supabase
        .from("clientes")
        .select("id")
        .ilike("nombre", primerNombre)
        .ilike("apellidos", apellidos || "")
        .maybeSingle();
      
      if (clientePorNombre) {
        clienteExistente = clientePorNombre;
        console.log("Cliente encontrado por nombre:", clientePorNombre.id);
      }
    }

    if (clienteExistente) {
      clienteId = clienteExistente.id;
      
      // Actualizar datos del cliente si se proporcionaron
      const updateData: Record<string, string> = {};
      if (payload.cliente_telefono) updateData.telefono = payload.cliente_telefono;
      if (payload.cliente_email) updateData.email = payload.cliente_email;
      if (payload.cliente_direccion) updateData.direccion = payload.cliente_direccion;
      
      if (Object.keys(updateData).length > 0) {
        await supabase
          .from("clientes")
          .update(updateData)
          .eq("id", clienteId);
        console.log("Cliente actualizado con datos adicionales");
      }
    } else {
      const { data: nuevoCliente, error: clienteError } = await supabase
        .from("clientes")
        .insert({
          nombre: primerNombre,
          apellidos: apellidos || null,
          telefono: payload.cliente_telefono || null,
          email: payload.cliente_email || null,
          direccion: payload.cliente_direccion || null,
          activo: true,
        })
        .select("id")
        .single();

      if (clienteError) {
        console.error("Error creando cliente:", clienteError);
        return new Response(JSON.stringify({ error: "Error al crear cliente: " + clienteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      clienteId = nuevoCliente.id;
      console.log("Cliente creado:", clienteId);
    }

    // 2. Buscar o crear servicio
    let servicioId: number;
    const { data: servicioExistente } = await supabase
      .from("servicios")
      .select("id")
      .ilike("nombre", payload.servicio_nombre.trim())
      .single();

    if (servicioExistente) {
      servicioId = servicioExistente.id;
      console.log("Servicio encontrado:", servicioId);
    } else {
      const { data: nuevoServicio, error: servicioError } = await supabase
        .from("servicios")
        .insert({
          nombre: payload.servicio_nombre.trim(),
          activo: true,
          duracion_minutos: 60,
          precio: 0,
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

    // 3. Buscar o crear sucursal
    let sucursalId: number;
    const { data: sucursalExistente } = await supabase
      .from("sucursales")
      .select("id")
      .ilike("nombre", payload.sucursal_nombre.trim())
      .single();

    if (sucursalExistente) {
      sucursalId = sucursalExistente.id;
      console.log("Sucursal encontrada:", sucursalId);
    } else {
      const { data: nuevaSucursal, error: sucursalError } = await supabase
        .from("sucursales")
        .insert({
          nombre: payload.sucursal_nombre.trim(),
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
    let empleadoId: number;
    const nombreEmpleadoParts = payload.profesional_nombre.trim().split(" ");
    const nombreEmpleado = nombreEmpleadoParts[0];
    const apellidosEmpleado = nombreEmpleadoParts.slice(1).join(" ");

    const { data: empleadoExistente } = await supabase
      .from("empleados")
      .select("id")
      .ilike("nombre", nombreEmpleado)
      .ilike("apellidos", apellidosEmpleado)
      .single();

    if (empleadoExistente) {
      empleadoId = empleadoExistente.id;
      console.log("Empleado encontrado:", empleadoId);
    } else {
      const { data: nuevoEmpleado, error: empleadoError } = await supabase
        .from("empleados")
        .insert({
          nombre: nombreEmpleado,
          apellidos: apellidosEmpleado,
          activo: true,
          es_profesional: true,
          id_sucursal: sucursalId,
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

    // 5. Crear la cita
    const { data: cita, error: citaError } = await supabase
      .from("agendas")
      .insert({
        id_cliente: clienteId,
        id_servicio: servicioId,
        id_sucursal: sucursalId,
        id_empleado: empleadoId,
        fecha: payload.fecha,
        hora_inicio: payload.hora_inicio,
        hora_fin: payload.hora_fin,
        estado: payload.estado || "agendada",
        observaciones: payload.observaciones || null,
        motivo_cancelacion: payload.motivo_cancelacion || null,
      })
      .select()
      .single();

    if (citaError) {
      console.error("Error creando cita:", citaError);
      return new Response(JSON.stringify({ error: "Error al crear cita" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Cita creada exitosamente:", cita.id);

    return new Response(
      JSON.stringify({
        success: true,
        cita: cita,
        ids: {
          cliente: clienteId,
          servicio: servicioId,
          sucursal: sucursalId,
          empleado: empleadoId,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error en función crear-cita-manual:", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
