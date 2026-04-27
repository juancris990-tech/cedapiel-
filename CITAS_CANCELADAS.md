# Módulo de Citas Canceladas

## 📋 Descripción

Módulo completo para visualizar y analizar citas canceladas con importación CSV, filtros avanzados y estadísticas en tiempo real.

## 🗄️ Estructura de Base de Datos

### Tabla: `citas_canceladas`

Campos principales:
- `id`: Identificador único (auto-incremental)
- `fecha_cita`: Fecha de la cita cancelada
- `cliente`: Nombre del cliente
- `email`: Email del cliente
- `telefono`: Teléfono del cliente
- `numero_sms`: Número de SMS
- `sucursal`: Sucursal donde se canceló
- `estado`: Estado de la cancelación
- `fecha_creacion`: Fecha de creación del registro
- `staff_registro`: Staff que registró
- `hora_inicio`: Hora de inicio programada
- `hora_fin`: Hora de fin programada
- `profesional`: Profesional asignado
- `servicio`: Servicio cancelado
- `equipo`: Equipo/recurso asignado
- `retenido`: Si el cliente fue retenido (boolean)
- `reagendado`: Si se reagendó (boolean)
- `facturado`: Si se facturó (boolean)
- `valor_mxn`: Valor en pesos mexicanos

### Índices
- `idx_citas_canceladas_fecha`: Índice por fecha
- `idx_citas_canceladas_sucursal`: Índice por sucursal
- `idx_citas_canceladas_profesional`: Índice por profesional
- `idx_citas_canceladas_cliente`: Índice por cliente
- `idx_citas_canceladas_estado`: Índice por estado

### RLS (Row Level Security)
- ✅ Usuarios autenticados pueden leer
- ✅ Admin, gerencia y dirección pueden crear/actualizar
- ✅ Solo admin puede eliminar

## 🔌 API Endpoints

### Base URL
```
{SUPABASE_URL}/functions/v1/citas-canceladas
```

### Endpoints Disponibles

#### 1. Listar todas las citas canceladas (GET)
```
GET /citas-canceladas?page=1&limit=50&sucursal=X&profesional=Y
```

**Query Parameters:**
- `sucursal` - Filtrar por sucursal
- `profesional` - Filtrar por profesional
- `estado` - Filtrar por estado
- `servicio` - Buscar por servicio (LIKE)
- `fecha_inicio` - Fecha desde (YYYY-MM-DD)
- `fecha_fin` - Fecha hasta (YYYY-MM-DD)
- `search` - Búsqueda global (cliente, profesional, servicio, email)
- `order_by` - Campo para ordenar (default: fecha_cita)
- `order_dir` - Dirección (asc/desc, default: desc)
- `page` - Número de página (default: 1)
- `limit` - Registros por página (default: 50)

**Respuesta:**
```json
{
  "data": [...],
  "count": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

#### 2. Obtener por ID (GET)
```
GET /citas-canceladas/{id}
```

#### 3. Crear registro (POST)
```
POST /citas-canceladas
Content-Type: application/json

{
  "fecha_cita": "2025-11-20",
  "cliente": "Juan Pérez",
  "sucursal": "Cedapiel Cumbres",
  ...
}
```

#### 4. Actualizar registro (PUT)
```
PUT /citas-canceladas/{id}
Content-Type: application/json

{
  "estado": "Reagendado",
  ...
}
```

#### 5. Eliminar registro (DELETE)
```
DELETE /citas-canceladas/{id}
```

## 📤 Importación de CSV

### Endpoint de Importación
```
POST {SUPABASE_URL}/functions/v1/citas-canceladas-importar
Content-Type: application/json
Authorization: Bearer {token}

{
  "data": [...]
}
```

### Formato CSV Esperado

El CSV debe tener las siguientes columnas (extraídas del archivo de ejemplo):

- `Date` - Fecha (formato: "20 Nov 2025")
- `Customer` - Nombre del cliente
- `Email` - Email del cliente
- `Telephone` - Teléfono
- `SmsNumber` - Número SMS
- `Location` - Sucursal
- `Status` - Estado de cancelación
- `DateCreated` - Fecha de creación
- `StaffAdded` - Staff que registró
- `StartDate` - Hora inicio (formato: "10:00 AM")
- `EndDate` - Hora fin (formato: "11:00 AM")
- `StaffName` - Nombre del profesional
- `ServiceName` - Nombre del servicio
- `Textbox8` - Equipo/recurso
- `Retained` - Retenido (Y/N)
- `Rebooked` - Reagendado (Y/N)
- `Invoiced` - Facturado (Y/N)
- `Value` - Valor en MXN

### Conversiones Automáticas

El sistema convierte automáticamente:
- **Fechas**: "20 Nov 2025" → "2025-11-20"
- **Horas**: "10:00 AM" → "10:00:00"
- **Booleanos**: "Y" → true, "N" → false
- **Números**: "1,700.00" → 1700.00

## 🎨 Interfaz de Usuario

### Características

1. **Estadísticas en Tiempo Real**
   - Total de citas canceladas
   - Profesional con más cancelaciones
   - Sucursal con más cancelaciones
   - Estado más común
   - Valor total perdido

2. **Filtros Avanzados**
   - Búsqueda global (cliente, profesional, servicio)
   - Filtro por sucursal
   - Filtro por profesional
   - Filtro por estado
   - Rango de fechas

3. **Tabla Interactiva**
   - Visualización clara de todos los campos
   - Paginación (50 registros por página)
   - Badges para estados
   - Formato de moneda

4. **Acciones**
   - 📤 Importar CSV/Excel
   - 📥 Exportar a Excel
   - 🔍 Búsqueda en tiempo real
   - 🗑️ Limpiar filtros

## 🚀 Cómo Usar

### 1. Acceder al Módulo

Navega desde el menú lateral:
```
Menú → Citas Canceladas
```

O directamente:
```
/citas-canceladas
```

### 2. Importar Datos

1. Clic en **"Importar CSV"**
2. Selecciona tu archivo CSV o Excel
3. El sistema procesará automáticamente:
   - Conversión de fechas
   - Conversión de horas
   - Validación de datos
   - Inserción en lote
4. Verás un mensaje de confirmación con estadísticas

### 3. Visualizar y Filtrar

- Usa los filtros para segmentar datos
- Búsqueda global para encontrar clientes específicos
- Ordena por cualquier columna
- Navega entre páginas

### 4. Exportar Resultados

- Clic en **"Exportar"** para descargar Excel
- El archivo incluirá todos los registros filtrados

## 📊 Ejemplo de Uso

```typescript
// Importar desde frontend
const importar = async (archivo: File) => {
  const workbook = XLSX.read(await archivo.arrayBuffer());
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[0]);
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/citas-canceladas-importar`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data })
    }
  );
  
  return await response.json();
};
```

## 🔒 Seguridad

- ✅ Autenticación requerida para todas las operaciones
- ✅ RLS habilitado en la tabla
- ✅ Validación de roles para importación
- ✅ Solo admin puede eliminar registros
- ✅ Logs automáticos de cambios

## 📝 Notas Importantes

1. **Archivos CSV**: Deben mantener el formato de columnas especificado
2. **Fechas**: El sistema reconoce formatos en español (Nov, Dic, etc.)
3. **Valores Nulos**: Campos vacíos se guardan como NULL
4. **Batch Processing**: Los datos se insertan en lotes de 100 para optimizar rendimiento
5. **Validación**: Solo se importan registros con fecha_cita, cliente y sucursal válidos

## 🐛 Troubleshooting

### Error: "No se encontraron registros válidos"
- Verifica que el CSV tenga las columnas: Date, Customer, Location
- Asegúrate de que las fechas estén en formato: "DD MMM YYYY"

### Error: "No tiene permisos para importar"
- Solo usuarios con rol admin, gerencia o dirección pueden importar
- Contacta al administrador del sistema

### Error: "Batch X: error message"
- Algunos registros pueden fallar por datos inválidos
- El resto se importa correctamente
- Revisa el mensaje de error para identificar el problema

## 🎯 Mejoras Futuras

- [ ] Notificaciones automáticas por email
- [ ] Gráficas de tendencias
- [ ] Exportar a PDF
- [ ] Integración con sistema de reagendamiento
- [ ] Dashboard ejecutivo
- [ ] Alertas de cancelaciones repetitivas

---

**Versión:** 1.0.0  
**Última actualización:** Noviembre 2025