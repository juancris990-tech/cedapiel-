import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS',
};

// Función auxiliar para recalcular totales de venta
async function recalcularTotalesVenta(supabaseClient: any, idVenta: number) {
  const { data: items } = await supabaseClient
    .from('venta_items')
    .select('precio_original_mxn, precio_final_mxn, cantidad')
    .eq('id_venta', idVenta);

  if (!items || items.length === 0) {
    // Si no hay items, poner todos los totales en 0
    await supabaseClient
      .from('ventas')
      .update({
        monto_original_mxn: 0,
        monto_descuento_mxn: 0,
        monto_final_mxn: 0,
        saldo_pendiente_mxn: 0
      })
      .eq('id', idVenta);
    return;
  }

  const totalOriginal = items.reduce((sum: number, item: any) => {
    const precioOrig = Number(item.precio_original_mxn || item.precio_final_mxn || 0);
    return sum + (precioOrig * Number(item.cantidad || 1));
  }, 0);

  const totalFinal = items.reduce((sum: number, item: any) => {
    const precioFinal = Number(item.precio_final_mxn || item.precio_original_mxn || 0);
    return sum + (precioFinal * Number(item.cantidad || 1));
  }, 0);

  const totalDescuento = Math.round((totalOriginal - totalFinal) * 100) / 100;

  // Obtener pagos y anticipos actuales
  const { data: venta } = await supabaseClient
    .from('ventas')
    .select('total_pagado_mxn, anticipo_aplicado_mxn')
    .eq('id', idVenta)
    .single();

  const totalPagado = Number(venta?.total_pagado_mxn || 0);
  const anticipoAplicado = Number(venta?.anticipo_aplicado_mxn || 0);
  const saldoPendiente = Math.round((totalFinal - anticipoAplicado - totalPagado) * 100) / 100;

  await supabaseClient
    .from('ventas')
    .update({
      monto_original_mxn: Math.round(totalOriginal * 100) / 100,
      monto_descuento_mxn: totalDescuento,
      monto_final_mxn: Math.round(totalFinal * 100) / 100,
      saldo_pendiente_mxn: saldoPendiente
    })
    .eq('id', idVenta);

  console.log(`Totales recalculados para venta ${idVenta}:`, {
    original: totalOriginal,
    descuento: totalDescuento,
    final: totalFinal,
    saldoPendiente
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    console.log('URL pathname:', url.pathname);
    console.log('pathParts:', pathParts);
    console.log('Method:', req.method);
    
    // POST /pos-item - Agregar item al carrito
    if (req.method === 'POST' && pathParts.length === 1) {
      const body = await req.json();
      const { 
        id_venta, 
        tipo, 
        id_servicio, 
        id_producto, 
        id_empleado,
        nombre_personalizado,
        precio_personalizado,
        cantidad = 1,
        descuento_tipo = 'ninguno',
        descuento_valor = 0,
        codigo_promocion,
        notas_descuento
      } = body;

      if (!id_venta || !tipo) {
        return new Response(JSON.stringify({ error: 'id_venta y tipo requeridos' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let precioOriginal = 0;
      let itemData: any = {};

      if (tipo === 'servicio') {
        if (!id_servicio) {
          return new Response(JSON.stringify({ error: 'id_servicio requerido para tipo servicio' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: servicio, error } = await supabaseClient
          .from('servicios')
          .select('precio, id_categoria')
          .eq('id', id_servicio)
          .single();

        if (error || !servicio) {
          return new Response(JSON.stringify({ error: 'Servicio no encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        precioOriginal = Number(servicio.precio);
        itemData = {
          id_servicio,
          id_empleado
        };

      } else if (tipo === 'producto') {
        if (!id_producto) {
          return new Response(JSON.stringify({ error: 'id_producto requerido para tipo producto' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: producto, error } = await supabaseClient
          .from('productos')
          .select('*, precio_venta_mxn')
          .eq('id', id_producto)
          .single();

        if (error || !producto) {
          return new Response(JSON.stringify({ error: 'Producto no encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verificar stock disponible
        const { data: stockData, error: stockError } = await supabaseClient
          .from('stock_actual')
          .select('id_lote, id_ubicacion, cantidad_actual')
          .eq('id_producto', id_producto)
          .gt('cantidad_actual', 0)
          .order('cantidad_actual', { ascending: false })
          .limit(1)
          .single();

        if (stockError || !stockData || stockData.cantidad_actual < cantidad) {
          return new Response(JSON.stringify({ 
            error: 'Stock insuficiente', 
            stock_disponible: stockData?.cantidad_actual || 0 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Usar precio de venta del producto, si no tiene, usar costo del lote más reciente con precio válido
        let precioProducto = Number(producto.precio_venta_mxn || 0);
        
        if (!precioProducto || precioProducto === 0) {
          // Fallback: obtener precio del lote más reciente con costo > 0
          const { data: lote } = await supabaseClient
            .from('lotes_producto')
            .select('costo_unitario_mxn')
            .eq('id_producto', id_producto)
            .gt('costo_unitario_mxn', 0)
            .order('fecha_registro_lote', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          precioProducto = Number(lote?.costo_unitario_mxn || 0);
        }
        
        console.log(`Precio producto ${id_producto}: ${precioProducto} (precio_venta: ${producto.precio_venta_mxn})`);

        precioOriginal = precioProducto;
        itemData = { 
          id_producto,
          id_empleado, // Incluir empleado para productos también
          // Guardar info del lote para descontar stock después
          _lote_id: stockData.id_lote,
          _ubicacion_id: stockData.id_ubicacion
        };
        
      } else if (tipo === 'personalizado') {
        if (!nombre_personalizado || precio_personalizado === undefined) {
          return new Response(JSON.stringify({ error: 'nombre_personalizado y precio_personalizado requeridos para tipo personalizado' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        precioOriginal = Number(precio_personalizado);
        itemData = {
          notas_descuento: `Ítem personalizado: ${nombre_personalizado}`
        };
      }

      // Calcular precio final
      let precioFinal = precioOriginal;
      if (descuento_tipo === 'porcentaje') {
        const pct = Math.min(Math.max(Number(descuento_valor), 0), 100);
        precioFinal = Math.round(precioOriginal * (1 - pct / 100) * 100) / 100;
      } else if (descuento_tipo === 'monto') {
        precioFinal = Math.max(0, Math.round((precioOriginal - Number(descuento_valor)) * 100) / 100);
      }

      const subtotalFinal = Math.round(precioFinal * Number(cantidad) * 100) / 100;

      // Guardar info del lote antes de quitarla de itemData
      const loteId = itemData._lote_id;
      const ubicacionId = itemData._ubicacion_id;
      
      // Quitar campos temporales que no van a la BD
      delete itemData._lote_id;
      delete itemData._ubicacion_id;

      const { data: item, error: itemError } = await supabaseClient
        .from('venta_items')
        .insert({
          id_venta,
          ...itemData,
          cantidad: Number(cantidad),
          precio_unitario: precioOriginal,
          precio_original_mxn: precioOriginal,
          precio_final_mxn: precioFinal,
          descuento_tipo,
          descuento_valor: Number(descuento_valor),
          subtotal: subtotalFinal,
          codigo_promocion,
          notas_descuento
        })
        .select()
        .single();

      if (itemError) {
        console.error('Error agregando item:', itemError);
        return new Response(JSON.stringify({ error: itemError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Si es producto, registrar movimiento de inventario (venta)
      if (tipo === 'producto' && loteId && ubicacionId) {
        const { error: movError } = await supabaseClient
          .from('movimientos_inventario')
          .insert({
            id_producto: id_producto,
            id_lote: loteId,
            id_origen: ubicacionId,
            id_destino: null, // NULL para ventas
            tipo_movimiento: 'venta',
            cantidad: Number(cantidad),
            costo_unitario_mxn: precioOriginal,
            nota: `Venta POS - Item ${item.id}`,
            creado_por: user.id
          });

        if (movError) {
          console.error('Error registrando movimiento de inventario:', movError);
          // No fallar la venta por esto, solo logear
        } else {
          console.log('Movimiento de inventario registrado para producto', id_producto);
        }
      }

      await supabaseClient
        .from('bitacora_accion')
        .insert({
          entidad: 'venta_items',
          accion: 'agregar_item',
          id_entidad: item.id,
          usuario: user.id,
          detalle_json: { id_venta, tipo, cantidad, precio_original: precioOriginal, precio_final: precioFinal }
        });

      console.log('Item agregado:', item.id);

      // Recalcular totales de la venta
      await recalcularTotalesVenta(supabaseClient, id_venta);

      return new Response(JSON.stringify({ item }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /pos-item/{id} - Actualizar item
    if (req.method === 'PUT') {
      // El ID puede estar en pathParts[0] o pathParts[1] dependiendo de cómo llegue la ruta
      const idItem = parseInt(pathParts[pathParts.length - 1]);
      console.log('Actualizando item ID:', idItem);
      const body = await req.json();
      const { cantidad, precio_original_mxn, descuento_tipo, descuento_valor, codigo_promocion, notas_descuento, id_empleado } = body;

      const { data: itemActual, error: fetchError } = await supabaseClient
        .from('venta_items')
        .select('*')
        .eq('id', idItem)
        .single();

      if (fetchError || !itemActual) {
        return new Response(JSON.stringify({ error: 'Item no encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const precioOriginal = precio_original_mxn !== undefined ? Number(precio_original_mxn) : Number(itemActual.precio_unitario);
      const nuevaCantidad = cantidad !== undefined ? Number(cantidad) : Number(itemActual.cantidad);
      const nuevoDescuentoTipo = descuento_tipo || itemActual.descuento_tipo;
      const nuevoDescuentoValor = descuento_valor !== undefined ? Number(descuento_valor) : Number(itemActual.descuento_valor);

      let precioFinal = precioOriginal;
      if (nuevoDescuentoTipo === 'porcentaje') {
        const pct = Math.min(Math.max(nuevoDescuentoValor, 0), 100);
        precioFinal = Math.round(precioOriginal * (1 - pct / 100) * 100) / 100;
      } else if (nuevoDescuentoTipo === 'monto') {
        precioFinal = Math.max(0, Math.round((precioOriginal - nuevoDescuentoValor) * 100) / 100);
      }

      const subtotalFinal = Math.round(precioFinal * nuevaCantidad * 100) / 100;

      const updateData: any = {
        cantidad: nuevaCantidad,
        precio_unitario: precioOriginal,
        descuento_tipo: nuevoDescuentoTipo,
        descuento_valor: nuevoDescuentoValor,
        precio_final_mxn: precioFinal,
        subtotal: subtotalFinal
      };

      if (precio_original_mxn !== undefined) updateData.precio_original_mxn = precioOriginal;
      if (codigo_promocion !== undefined) updateData.codigo_promocion = codigo_promocion;
      if (notas_descuento !== undefined) updateData.notas_descuento = notas_descuento;
      if (id_empleado !== undefined) updateData.id_empleado = id_empleado;

      const { data: item, error: updateError } = await supabaseClient
        .from('venta_items')
        .update(updateData)
        .eq('id', idItem)
        .select()
        .single();

      if (updateError) {
        console.error('Error actualizando item:', updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Item actualizado exitosamente:', item.id);

      await supabaseClient
        .from('bitacora_accion')
        .insert({
          entidad: 'venta_items',
          accion: 'editar_item',
          id_entidad: item.id,
          usuario: user.id,
          detalle_json: { 
            cantidad: nuevaCantidad, 
            precio_original_mxn: precioOriginal,
            descuento_tipo: nuevoDescuentoTipo, 
            descuento_valor: nuevoDescuentoValor 
          }
        });

      // Recalcular totales de la venta
      await recalcularTotalesVenta(supabaseClient, itemActual.id_venta);

      console.log('Totales recalculados, enviando respuesta');

      return new Response(JSON.stringify({ item }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /pos-item/{id} - Eliminar item
    if (req.method === 'DELETE') {
      const idItem = parseInt(pathParts[pathParts.length - 1]);

      // Obtener id_venta antes de eliminar
      const { data: itemData } = await supabaseClient
        .from('venta_items')
        .select('id_venta')
        .eq('id', idItem)
        .single();

      const { error: deleteError } = await supabaseClient
        .from('venta_items')
        .delete()
        .eq('id', idItem);

      if (deleteError) {
        console.error('Error eliminando item:', deleteError);
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabaseClient
        .from('bitacora_accion')
        .insert({
          entidad: 'venta_items',
          accion: 'eliminar_item',
          id_entidad: idItem,
          usuario: user.id,
          detalle_json: {}
        });

      // Recalcular totales de la venta
      if (itemData?.id_venta) {
        await recalcularTotalesVenta(supabaseClient, itemData.id_venta);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en pos-item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
