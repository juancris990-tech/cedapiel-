# Módulo de Análisis de Ventas por Categoría

## Descripción General

Este módulo permite analizar la distribución de ventas por categoría de servicio, proporcionando estadísticas detalladas sobre qué categorías se venden más y su porcentaje de participación en el total de ventas.

## Estructura de Datos

### Tabla: `ventas_por_categoria_servicio`

La tabla almacena información resumida de ventas por categoría:

- **id**: Identificador único (auto-generado)
- **categoria_servicio**: Nombre de la categoría (ej: "Depilacion laser", "Faciales", "Corporales")
- **cantidad_servicios**: Número total de servicios vendidos en esa categoría
- **porcentaje_participacion**: Porcentaje que representa del total de ventas (valor decimal, ej: 86.57)
- **created_at**: Fecha de creación del registro
- **updated_at**: Fecha de última actualización

## Formato del Archivo CSV

El archivo de importación debe tener la siguiente estructura:

### Sección de Resumen (líneas 1-6)

```csv
ServiceCategory,Quantity,Textbox41
Depilacion laser,116,86.57%
Faciales,12,8.96%
Corporales,3,2.24%
Valoracion,2,1.49%
Garantia,1,0.75%
```

**Importante:**
- El separador puede ser coma (,) o punto y coma (;)
- La columna `Textbox41` contiene porcentajes con el símbolo "%"
- El sistema automáticamente limpia el símbolo "%" y convierte a número decimal
- Después de esta sección hay una línea vacía que indica el fin de los datos de resumen

### Sección Detallada (líneas 8+)

El archivo puede contener información detallada adicional que será ignorada por el importador. Solo se procesa la sección de resumen.

## API REST Endpoints

### 1. Listar todas las categorías
```
GET /ventas-categorias
```
Retorna todas las categorías ordenadas por cantidad de servicios (descendente).

**Respuesta:**
```json
[
  {
    "id": 1,
    "categoria_servicio": "Depilacion laser",
    "cantidad_servicios": 116,
    "porcentaje_participacion": 86.57,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  },
  ...
]
```

### 2. Top categorías
```
GET /ventas-categorias/top?limit=10
```
Retorna las categorías con mayor cantidad de servicios vendidos.

**Parámetros:**
- `limit` (opcional): Número de registros a retornar (default: 10)

### 3. Buscar categoría específica
```
GET /ventas-categorias/{categoria}
```
Busca categorías que coincidan con el término de búsqueda (búsqueda parcial insensible a mayúsculas).

**Ejemplo:**
```
GET /ventas-categorias/laser
```

### 4. Importar archivo CSV
```
POST /ventas-categorias-importar
```
Importa un archivo CSV con datos de ventas por categoría.

**Body:** FormData con archivo CSV
**Headers:** Authorization con token de sesión

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Se importaron 5 categorías correctamente",
  "registros_importados": 5
}
```

### 5. Eliminar todos los registros
```
DELETE /ventas-categorias
```
Elimina todos los registros de la tabla. **Solo administradores**.

### 6. Eliminar registro específico
```
DELETE /ventas-categorias/{id}
```
Elimina un registro específico por ID. **Solo administradores**.

## Vista Frontend

### Ruta
```
/ventas-categorias
```

### Funcionalidades

#### 1. **Estadísticas Rápidas**
Tres tarjetas superiores muestran:
- **Total de Servicios**: Suma total de todos los servicios vendidos
- **Categoría Más Vendida**: La categoría con mayor cantidad de servicios
- **Menor Participación**: La categoría con menor porcentaje

#### 2. **Importación de Datos**
- Botón "Importar CSV" para subir archivos
- Acepta archivos `.csv` y `.xlsx`
- Validación automática de formato
- Limpia datos anteriores antes de importar nuevos

#### 3. **Exportación**
- Botón "Exportar" para descargar datos en formato CSV
- Incluye todas las categorías con sus datos actuales

#### 4. **Filtros**
- **Búsqueda por texto**: Filtra categorías por nombre
- Botón "Limpiar" para resetear filtros

#### 5. **Tabla de Datos**
Muestra todas las categorías con:
- Nombre de la categoría
- Cantidad de servicios vendidos
- Porcentaje de participación
- Estado visual (Alta/Media/Baja) según el porcentaje:
  - **Alta**: ≥ 50%
  - **Media**: ≥ 10% y < 50%
  - **Baja**: < 10%

## Cómo Usar el Módulo

### 1. Importar un Nuevo Reporte

1. Ve a la ruta `/ventas-categorias`
2. Haz clic en el botón "Importar CSV"
3. Selecciona tu archivo CSV o Excel
4. El sistema procesará el archivo automáticamente
5. Verás un mensaje de éxito indicando cuántos registros se importaron

**Nota:** Cada importación elimina los datos anteriores y los reemplaza con los nuevos.

### 2. Analizar los Datos

Una vez importados los datos:

- **Revisa las estadísticas rápidas** en las tarjetas superiores
- **Usa el filtro de búsqueda** para encontrar categorías específicas
- **Ordena la tabla** haciendo clic en los encabezados de columna
- **Identifica categorías de alto rendimiento** mediante los badges de estado

### 3. Exportar Resultados

Para compartir o analizar los datos externamente:
1. Haz clic en el botón "Exportar"
2. Se descargará un archivo CSV con todos los datos actuales
3. El archivo incluye: categoría, cantidad y porcentaje

## Cálculos Importantes

### Total de Servicios
```
Suma de todos los valores en cantidad_servicios
```

### Categoría Más Vendida
```
La categoría con el valor más alto en cantidad_servicios
```

### Porcentaje de Participación
```
Este valor viene directamente del reporte importado
Representa: (Servicios de la categoría / Total de servicios) × 100
```

## Permisos de Seguridad

- **Lectura**: Todos los usuarios autenticados
- **Importación**: Admin, Gerencia, Dirección
- **Eliminación**: Solo Administradores

## Preguntas Frecuentes

**P: ¿Qué pasa con los datos anteriores al importar un nuevo archivo?**  
R: Se eliminan automáticamente antes de insertar los nuevos datos.

**P: ¿Puedo importar archivos Excel?**  
R: Sí, el sistema acepta tanto CSV como XLSX.

**P: ¿Qué significa el porcentaje de participación?**  
R: Es el porcentaje que representa esa categoría del total de servicios vendidos.

**P: ¿Puedo editar manualmente un registro?**  
R: No directamente desde la interfaz. Debes modificar el CSV y reimportarlo.

**P: ¿Con qué frecuencia debo actualizar estos datos?**  
R: Depende de tus necesidades de análisis. Se recomienda importar reportes mensuales o semanales.

## Integración con Otros Módulos

Este módulo se complementa con:
- **Ventas Detalle**: Para análisis más profundo de servicios específicos
- **Productividad**: Para relacionar categorías con desempeño de profesionales
- **Reportes**: Para exportaciones y análisis avanzados

## Acceso Rápido

Para acceder al módulo:
1. Ingresa a la aplicación
2. Navega a `/ventas-categorias` o
3. Usa el menú de navegación (si está configurado)
