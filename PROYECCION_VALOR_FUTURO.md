# Módulo de Proyección Valor Futuro

## Descripción General

Este módulo permite visualizar y analizar la proyección de ingresos futuros basados en las citas que ya están agendadas en el sistema. Los datos se organizan en **tres categorías**: profesionales, sucursales y servicios. Es una herramienta esencial para planificación financiera y gestión de recursos.

## Características Principales

### 1. Importación de Datos

**Cómo cargar un archivo:**
1. Ve a la página "Proyección Valor Futuro" en el menú lateral
2. Haz clic en el botón "Importar CSV"
3. Selecciona el archivo CSV/Excel con el reporte de valor futuro
4. El sistema procesará automáticamente las 3 secciones del archivo

**Formato del archivo:**
El sistema espera un CSV con **3 secciones distintas**:

#### Sección 1: Por Profesional (StaffFirstName)
- StaffFirstName (Profesional)
- CustomerCount5 (Cantidad de clientes)
- ServiceCount (Cantidad de servicios)
- TotalBookingValue3 (Valor futuro en MXN)
- NewCustomerCount (Nuevos clientes)
- TotalBookingValue (Valor total agendado en MXN)

#### Sección 2: Por Sucursal (StaffFirstName3)
- StaffFirstName3 (Nombre de sucursal)
- CustomerCount9 (Cantidad de clientes)
- ServiceCount4 (Cantidad de servicios)
- TotalBookingValue5 (Valor futuro en MXN)
- NewCustomerCount2 (Nuevos clientes)

#### Sección 3: Por Servicio (StaffFirstName2)
- StaffFirstName2 (Nombre del servicio)
- CustomerCount6 (Cantidad de clientes)
- ServiceCount2 (Cantidad de servicios)
- TotalBookingValue4 (Valor futuro en MXN)
- NewCustomerCount3 (Nuevos clientes)

**Notas importantes:**
- Los valores monetarios pueden tener formato con comas (15,600.00)
- Los campos vacíos se convierten automáticamente en NULL
- El sistema procesa automáticamente las 3 secciones y asigna el tipo correspondiente
- Las secciones están separadas por líneas vacías en el CSV

### 2. Estadísticas Globales (KPIs)

El panel superior muestra 5 indicadores clave combinando las 3 categorías:

1. **Total Proyectado**: Suma total del valor futuro (todas las categorías)
2. **Servicios Agendados**: Cantidad total de servicios programados
3. **Clientes Totales**: Número total de clientes involucrados
4. **Nuevos Clientes**: Cantidad de nuevos clientes proyectados
5. **Top Profesional/Sucursal/Servicio**: El registro con mayor valor futuro

### 3. Filtros y Búsqueda

**Búsqueda por Nombre:**
- Campo de búsqueda en tiempo real
- Busca en profesionales, sucursales y servicios (no sensible a mayúsculas)

**Filtro por Tipo:**
- Todos los tipos (predeterminado)
- Solo Profesionales
- Solo Sucursales
- Solo Servicios

**Ordenamiento:**
Puedes ordenar la tabla por:
- Mayor Valor Futuro (predeterminado)
- Mayor Servicios
- Mayor Clientes
- Más Nuevos Clientes

### 4. Tabla Detallada

La tabla principal muestra para cada registro:
- **Tipo**: Icono indicando si es profesional (👤), sucursal (🏢) o servicio (💼)
- **Nombre**: Nombre del profesional, sucursal o servicio
- **Servicios**: Cantidad de servicios agendados
- **Clientes**: Cantidad de clientes únicos
- **Nuevos**: Cantidad de nuevos clientes
- **Valor Futuro**: Valor futuro proyectado (MXN)
- **Total Agendado**: Valor total de lo agendado (MXN)
- **Reservas Online**: Cantidad de reservas hechas online

## Cálculo del Total Proyectado

El **Total Proyectado** se calcula sumando la columna `valor_futuro_mxn` de todos los registros (profesionales, sucursales y servicios).

**Columnas utilizadas como valor futuro:**
- Profesionales: `TotalBookingValue3`
- Sucursales: `TotalBookingValue5`
- Servicios: `TotalBookingValue4`

Estas columnas representan el valor futuro proyectado basado en las citas agendadas.

## API REST Endpoints

El módulo expone los siguientes endpoints para integraciones:

### GET /proyeccion-futuro
Obtiene la lista completa de proyecciones ordenada por valor futuro.

**Query params opcionales:**
- `tipo`: Filtrar por 'profesional', 'sucursal' o 'servicio'

### GET /proyeccion-futuro/profesional/{nombre}
Busca proyecciones por nombre (búsqueda parcial en todas las categorías).

**Ejemplo:**
```
GET /proyeccion-futuro/profesional/Liliana
```

### GET /proyeccion-futuro/top/valor
Obtiene los top 10 registros con mayor valor futuro.

### GET /proyeccion-futuro/nuevos-clientes
Obtiene todas las proyecciones ordenadas por cantidad de nuevos clientes.

### DELETE /proyeccion-futuro/{id}
Elimina una proyección específica (solo administradores).

## Casos de Uso

### 1. Análisis por Profesional
Identifica qué profesionales tendrán mayor demanda y asegura recursos necesarios.

### 2. Análisis por Sucursal
Compara el desempeño proyectado entre diferentes sucursales para optimizar recursos.

### 3. Análisis por Servicio
Identifica qué servicios son más demandados para ajustar inventarios y capacitación.

### 4. Planificación de Nuevos Clientes
Identifica dónde se concentran los nuevos clientes para replicar estrategias exitosas.

### 5. Proyección Financiera Global
Usa el total proyectado para estimar ingresos futuros y planificar inversiones.

### 6. Optimización de Capacidad
Identifica cuellos de botella por profesional, sucursal o tipo de servicio.

## Actualización de Datos

Para actualizar los datos:
1. Exporta un nuevo reporte de valor futuro desde tu sistema de gestión de citas
2. Importa el nuevo archivo usando el botón "Importar CSV"
3. El sistema eliminará automáticamente los datos anteriores y cargará los nuevos

**Nota:** Se recomienda hacer actualizaciones semanales o según la frecuencia de cambios en tu agenda.

## Permisos

- **Ver datos**: Todos los usuarios autenticados
- **Importar datos**: Administradores, Gerencia y Dirección
- **Eliminar registros**: Solo Administradores

## Soporte Técnico

Si tienes problemas con la importación:
1. Verifica que el archivo contenga las 3 secciones (profesionales, sucursales y servicios)
2. Asegúrate de que las columnas tengan los nombres correctos
3. Revisa que los valores monetarios estén en formato numérico
4. Verifica que las secciones estén separadas por líneas vacías
5. Contacta al equipo técnico si el problema persiste