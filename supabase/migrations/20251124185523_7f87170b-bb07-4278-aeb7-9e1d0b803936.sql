-- Borrar datos operacionales de las tablas principales

-- Tablas relacionadas con citas y agenda
DELETE FROM notas_citas;
DELETE FROM citas_historial_estado;
DELETE FROM bloqueos_agenda;
DELETE FROM agendas;

-- Tablas relacionadas con ventas y pagos
DELETE FROM comisiones;
DELETE FROM aplicacion_anticipo;
DELETE FROM pagos;
DELETE FROM venta_items;
DELETE FROM ventas;

-- Tablas de anticipos y libro contable
DELETE FROM anticipos;
DELETE FROM libro_ingresos;
DELETE FROM libro_diferidos;

-- Tablas de clientes (solo datos, no estructura)
DELETE FROM tarjetas_regalo;
DELETE FROM clientes;

-- Tablas de marketing y CRM
DELETE FROM mensajes_enviados;
DELETE FROM lead_tags;
DELETE FROM leads;
DELETE FROM encuestas_satisfaccion;

-- Tablas de RRHH
DELETE FROM liquidacion_detalle;
DELETE FROM liquidacion_semanal;
DELETE FROM asistencias;
DELETE FROM permisos;

-- Tablas de finanzas
DELETE FROM gastos_sucursal;

-- Bitácora (opcional, pero recomendado limpiar)
DELETE FROM bitacora_accion;