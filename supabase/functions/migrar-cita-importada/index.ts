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
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { citaImportadaId } = await req.json();

    // Obtener la cita importada
    const { data: citaImportada, error: citaError } = await supabase
      .from('citas_agendadas')
      .select('*')
      .eq('id', citaImportadaId)
      .single();

    if (citaError || !citaImportada) {
      return new Response(JSON.stringify({ error: "Cita no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar o crear cliente
    const clienteParts = (citaImportada.cliente || '').split(' ');
    const nombreCliente = clienteParts[0] || '';
    const apellidosCliente = clienteParts.slice(1).join(' ') || '';

    let clienteId: number;
    
    // Intentar buscar cliente por nombre completo o email/teléfono
    let clienteQuery = supabase
      .from('clientes')
      .select('id')
      .ilike('nombre', `%${nombreCliente}%`);
    
    if (citaImportada.email) {
      clienteQuery = clienteQuery.or(`email.eq.${citaImportada.email}`);
    }
    if (citaImportada.telefono) {
      clienteQuery = clienteQuery.or(`telefono.eq.${citaImportada.telefono}`);
    }
    
    const { data: clienteExistente } = await clienteQuery.limit(1).single();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      // Crear nuevo cliente
      const { data: nuevoCliente, error: clienteInsertError } = await supabase
        .from('clientes')
        .insert({
          nombre: nombreCliente,
          apellidos: apellidosCliente,
          email: citaImportada.email,
          telefono: citaImportada.telefono,
          activo: true,
        })
        .select('id')
        .single();

      if (clienteInsertError) {
        console.error("Error creando cliente:", clienteInsertError);
        return new Response(JSON.stringify({ error: "Error creando cliente" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      clienteId = nuevoCliente.id;
    }

    // Buscar o crear profesional
    let empleadoId: number | null = null;
    if (citaImportada.profesional) {
      const profesionalParts = citaImportada.profesional.split(' ');
      const nombreProfesional = profesionalParts[0] || '';
      
      const { data: empleadoExistente } = await supabase
        .from('empleados')
        .select('id')
        .ilike('nombre', `%${nombreProfesional}%`)
        .eq('es_profesional', true)
        .eq('activo', true)
        .limit(1)
        .single();

      if (empleadoExistente) {
        empleadoId = empleadoExistente.id;
      }
    }

    // Buscar sucursal
    let sucursalId: number;
    const { data: sucursalExistente } = await supabase
      .from('sucursales')
      .select('id')
      .ilike('nombre', `%${citaImportada.sucursal}%`)
      .limit(1)
      .single();

    if (sucursalExistente) {
      sucursalId = sucursalExistente.id;
    } else {
      // Obtener la primera sucursal disponible
      const { data: primeraSucursal } = await supabase
        .from('sucursales')
        .select('id')
        .limit(1)
        .single();
      
      if (!primeraSucursal) {
        return new Response(JSON.stringify({ error: "No hay sucursales disponibles" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      sucursalId = primeraSucursal.id;
    }

    // Buscar servicio
    let servicioId: number | null = null;
    if (citaImportada.servicio) {
      const { data: servicioExistente } = await supabase
        .from('servicios')
        .select('id')
        .ilike('nombre', `%${citaImportada.servicio}%`)
        .limit(1)
        .single();

      if (servicioExistente) {
        servicioId = servicioExistente.id;
      }
    }

    // Mapear estados
    const estadoMap: Record<string, string> = {
      'reservada': 'agendada',
      'confirmada': 'confirmada',
      'llego_paciente': 'en_atencion',
      'asistida': 'finalizada',
      'no_show': 'no_asiste',
      'cancelada_cliente': 'cancelada',
      'cancelada_clinica': 'cancelada',
    };

    const estadoNuevo = estadoMap[citaImportada.estado.toLowerCase()] || 'agendada';

    // Crear cita en agendas
    const { data: nuevaCita, error: citaInsertError } = await supabase
      .from('agendas')
      .insert({
        id_cliente: clienteId,
        id_sucursal: sucursalId,
        id_empleado: empleadoId,
        id_servicio: servicioId,
        fecha: citaImportada.fecha,
        hora_inicio: citaImportada.hora_inicio,
        hora_fin: citaImportada.hora_fin,
        estado: estadoNuevo,
        observaciones: `Migrada de cita importada #${citaImportadaId}`,
        origen: 'migrada_importacion',
      })
      .select()
      .single();

    if (citaInsertError) {
      console.error("Error creando cita:", citaInsertError);
      return new Response(JSON.stringify({ error: "Error creando cita en agendas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Marcar la cita importada como migrada (eliminarla)
    await supabase
      .from('citas_agendadas')
      .delete()
      .eq('id', citaImportadaId);

    // Registrar en bitácora
    await supabase
      .from('bitacora_accion')
      .insert({
        entidad: 'agendas',
        accion: 'migrar_cita_importada',
        id_entidad: nuevaCita.id,
        usuario: user.id,
        detalle_json: {
          cita_importada_id: citaImportadaId,
          cliente_id: clienteId,
          nueva_cita_id: nuevaCita.id,
        },
      });

    return new Response(JSON.stringify({ 
      success: true, 
      nuevaCitaId: nuevaCita.id,
      mensaje: "Cita migrada exitosamente"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error en migrar-cita-importada:", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
