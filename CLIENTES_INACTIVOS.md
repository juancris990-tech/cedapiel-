# Módulo de Clientes Inactivos

## Descripción
Este módulo permite gestionar y analizar clientes que no han regresado, importando datos desde archivos CSV y visualizándolos con filtros avanzados.

## Estructura de Datos

### Tabla: `clientes_inactivos`

Campos:
- **id**: Identificador único (autogenerado)
- **profesional**: Nombre del profesional que atendió (requerido)
- **cliente**: Nombre del cliente (requerido)
- **email**: Correo electrónico
- **numero_sms**: Número de SMS
- **telefono**: Número de teléfono
- **ultima_cita**: Fecha y hora de la última cita
- **dias_sin_volver**: Días transcurridos desde la última cita
- **ultimo_servicio**: Último servicio recibido
- **estado**: Estado de la cita (Confirmed, Pencilled-in, etc.)
- **gasto_total_mxn**: Gasto total del cliente en MXN
- **created_at**: Fecha de creación del registro
- **updated_at**: Fecha de última actualización

## Endpoints API

### Base URL
`/functions/v1/clientes-inactivos`

### 1. Listar Clientes (GET)
```
GET /clientes-inactivos?page=1&limit=50&order_by=dias_sin_volver&order_dir=desc
```

**Parámetros opcionales:**
- `profesional`: Filtrar por profesional
- `dias_min`: Días mínimos sin volver
- `dias_max`: Días máximos sin volver
- `ultimo_servicio`: Buscar por servicio (coincidencia parcial)
- `estado`: Filtrar por estado
- `search`: Búsqueda global en nombre, email y teléfono
- `order_by`: Campo de ordenamiento (dias_sin_volver, ultima_cita, cliente, profesional)
- `order_dir`: Dirección (asc o desc)
- `page`: Número de página (default: 1)
- `limit`: Registros por página (default: 50)

**Respuesta:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 9379,
    "pages": 188
  }
}
```

### 2. Obtener Cliente por ID (GET)
```
GET /clientes-inactivos/{id}
```

### 3. Crear Cliente (POST)
```
POST /clientes-inactivos
Content-Type: application/json

{
  "profesional": "Nombre del Profesional",
  "cliente": "Nombre del Cliente",
  "email": "email@example.com",
  ...
}
```

### 4. Actualizar Cliente (PUT)
```
PUT /clientes-inactivos/{id}
Content-Type: application/json

{
  "estado": "Nuevo Estado",
  ...
}
```

### 5. Eliminar Cliente (DELETE)
```
DELETE /clientes-inactivos/{id}
```

### 6. Importar CSV (POST)
```
POST /clientes-inactivos-importar
Content-Type: application/json

{
  "data": [
    {
      "StaffName1": "Adriana Mariel Oropeza Garza",
      "CustomerName": "Deyanira Medrano Martinez",
      "Email": "",
      "SmsNumber": "+528117497905",
      "Telephone": "",
      "LastBookingDate": "23 Oct 2023 6:00 PM",
      "DaysSinceLastBooking": "760",
      "ServiceName": "Media cara",
      "Textbox4": "Confirmed",
      "TotalSpend": "0.00"
    },
    ...
  ]
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Importación completada: 9379 registros insertados",
  "total": 9379,
  "valid": 9379,
  "inserted": 9379
}
```

## Formato del CSV

El archivo CSV debe tener las siguientes columnas:

| Columna CSV | Campo DB | Tipo | Descripción |
|-------------|----------|------|-------------|
| StaffName1 | profesional | Texto | Nombre del profesional |
| CustomerName | cliente | Texto | Nombre del cliente |
| Email | email | Texto | Email del cliente |
| SmsNumber | numero_sms | Texto | Número de SMS |
| Telephone | telefono | Texto | Teléfono |
| LastBookingDate | ultima_cita | Timestamp | Última cita (formato: "DD MMM YYYY hh:mm AM/PM") |
| DaysSinceLastBooking | dias_sin_volver | Entero | Días desde última cita |
| ServiceName | ultimo_servicio | Texto | Último servicio |
| Textbox4 | estado | Texto | Estado de la cita |
| TotalSpend | gasto_total_mxn | Decimal | Gasto total |

### Ejemplo de formato de fecha
- Entrada: `"23 Oct 2023 6:00 PM"`
- Salida: `"2023-10-23 18:00:00"`

## Cómo Usar el Módulo

### 1. Acceder a la Vista
Navega a **Clientes Inactivos** desde el menú lateral de la aplicación.

### 2. Importar CSV
1. Clic en el botón **"Importar CSV"**
2. Selecciona tu archivo CSV o Excel (.csv, .xlsx, .xls)
3. El sistema procesará automáticamente el archivo
4. Verás un mensaje de confirmación con el número de registros importados

### 3. Filtrar Datos
Utiliza los filtros disponibles:
- **Búsqueda**: Busca por nombre, email o teléfono
- **Profesional**: Filtra por profesional específico
- **Días sin volver**: Define rango mínimo y máximo
- **Servicio**: Busca por servicio recibido
- **Estado**: Filtra por estado de la cita

### 4. Ordenar Resultados
Selecciona el campo de ordenamiento:
- Días sin volver (por defecto, descendente)
- Última cita
- Nombre del cliente
- Profesional

### 5. Exportar Datos
Clic en el botón **"Exportar"** para descargar los datos filtrados en formato Excel.

## Permisos Requeridos

### Lectura
- Todos los usuarios autenticados pueden **leer** los registros

### Escritura (Crear/Actualizar)
- Admin
- Gerencia
- Dirección

### Eliminar
- Solo Admin

## Características Visuales

- **Color coding** por días sin volver:
  - 🔴 Rojo: Más de 365 días
  - 🟠 Naranja: Entre 180-365 días
  - 🟡 Amarillo: Menos de 180 días

- **Paginación**: 50 registros por página (configurable)
- **Búsqueda en tiempo real**
- **Filtros múltiples combinables**

## Integración en el Proyecto

### Archivos Creados

1. **Backend (Edge Functions)**:
   - `supabase/functions/clientes-inactivos/index.ts` - API CRUD
   - `supabase/functions/clientes-inactivos-importar/index.ts` - Importación CSV

2. **Frontend**:
   - `src/pages/ClientesInactivos.tsx` - Interfaz de usuario

3. **Base de Datos**:
   - Tabla `clientes_inactivos` con índices optimizados
   - Políticas RLS configuradas

4. **Rutas**:
   - Ruta `/clientes-inactivos` agregada en `src/App.tsx`
   - Menú "Clientes Inactivos" en `src/components/layout/AppSidebar.tsx`

### Dependencias
- `xlsx`: Para procesamiento de archivos Excel/CSV (ya instalada)
- Supabase client (incluido)
- React Query (incluido)

## Casos de Uso

1. **Campaña de Reactivación**: Identifica clientes que llevan más de X días sin regresar
2. **Análisis por Profesional**: Revisa qué profesionales tienen más clientes inactivos
3. **Segmentación por Servicio**: Enfoca campañas según el último servicio recibido
4. **Gestión de Retención**: Monitorea métricas de retención de clientes

## Mantenimiento

### Actualizar Datos Regularmente
- Importa el CSV actualizado periódicamente
- El sistema insertará nuevos registros automáticamente
- No hay problema con duplicados, cada importación agrega registros nuevos

### Limpiar Registros Antiguos
Si necesitas limpiar la base de datos antes de una nueva importación completa:

```sql
TRUNCATE TABLE clientes_inactivos RESTART IDENTITY;
```

⚠️ **Advertencia**: Esto eliminará todos los registros. Asegúrate de tener respaldo.

## Soporte

Para reportar problemas o solicitar mejoras, contacta al equipo de desarrollo.
