# 📖 Sistema Natillera - README

## 🎯 Descripción

Sistema web de gestión de Natillera (ahorro comunitario colombiano) con las siguientes características:

- Gestión de participantes
- Registro de aportes periódicos
- Registro de actividades generadoras de ganancias
- Manejo de préstamos con intereses
- Distribución equitativa de ganancias
- Dashboard con estadísticas en tiempo real

---

## 🏗️ Arquitectura

```
Frontend (HTML/CSS/JS) → Backend (API REST) → Google Sheets (Base de Datos)
```

---

## 📁 Estructura del Proyecto

```
natillera/
├── login.html              # Página de inicio de sesión
├── index.html              # Dashboard principal (antes dashboard.html)
├── css/
│   └── styles.css         # Estilos del sistema
├── js/
│   ├── auth.js            # Autenticación
│   └── app.js             # Lógica principal
└── assets/                # Recursos (imágenes, etc.)
```

---

## 🚀 Cómo Usar

### 1. Configuración Inicial (Primera Vez)

**IMPORTANTE:** Antes de usar el sistema por primera vez, debes inicializar la base de datos:

1. Abre `setup.html` en tu navegador
2. Haz clic en **"Inicializar Base de Datos"**
3. Espera a que se creen todas las tablas
4. Guarda las credenciales que aparecen:
   - **Email:** admin@natillera.com
   - **Contraseña:** admin123
5. Haz clic en **"Ir al Login"**

### 2. Uso Normal

1. Abrir `login.html` en un navegador web
2. Ingresar credenciales:
   - Email: admin@natillera.com
   - Contraseña: admin123
3. Acceder al dashboard

### 2. Navegación

- **Dashboard**: Ver resumen general del ciclo
- **Participantes**: Gestionar miembros de la natillera
- **Aportes**: Registrar contribuciones
- **Actividades**: Registrar actividades que generan ganancias
- **Préstamos**: Gestionar préstamos con intereses

---

## 🎨 Características de Diseño

- ✅ Diseño minimalista y limpio
- ✅ Colores neutros y profesionales
- ✅ Responsive (funciona en móviles y tablets)
- ✅ Sin frameworks pesados (HTML/CSS/JS puro)
- ✅ Navegación intuitiva

---

## 📊 Funcionalidades Actuales (Fase 2)

### ✅ Implementado
- Interfaz de usuario completa
- Sistema de autenticación básico
- Navegación entre secciones
- Formularios de registro
- Tablas de visualización
- Diseño responsive

### ⏳ Pendiente (Fase 3 en adelante)
- Conexión con API REST
- Almacenamiento en Google Sheets
- Cálculos automáticos
- Validaciones de servidor
- Cierre de ciclo

---

## 🔐 Seguridad

- Autenticación requerida para acceder al dashboard
- Sesión almacenada en `sessionStorage`
- Validación de formularios en frontend
- (Fase 3) Validación en backend
- (Fase 3) Hash de contraseñas

---

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend** (Fase 3): Node.js o Python
- **Base de Datos**: Google Sheets API
- **Autenticación**: Session-based

---

## 📝 Fases del Proyecto

- ✅ **Fase 1**: Análisis y Modelo de Datos
- ✅ **Fase 2**: Frontend (HTML + CSS)
- ⏳ **Fase 3**: Backend (API REST)
- ⏳ **Fase 4**: Conexión con Google Sheets
- ⏳ **Fase 5**: Login y Seguridad
- ⏳ **Fase 6**: Cálculos y Cierre de Ciclo

---

## 👥 Contribuir

Este es un proyecto educativo y de código abierto. Las contribuciones son bienvenidas.

---

## 📄 Licencia

MIT License

---

## 📞 Soporte

Para preguntas o soporte, contactar al equipo de desarrollo.

---

**Versión**: 1.0 (Fase 2 completada)  
**Última actualización**: 2026-01-20
