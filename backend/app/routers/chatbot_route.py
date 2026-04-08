import os
from difflib import get_close_matches
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

# ─── Palabras clave por categoría ────────────────────────────────────────────

KEYWORDS = {
    "saludo": [
        "hola", "ola", "jola", "hola!", "buenas", "buenos", "saludos",
        "que onda", "que ondas", "que xonda", "quiubo", "quiubole",
        "hey", "hi", "epa", "ey", "buen dia", "buen día", "buenas tardes",
        "buenas noches", "buenos dias", "buenos días", "como estas", "q onda"
    ],
    "asistencia": [
        "asistencia", "asistir", "faltas", "registrar", "falta", "presente",
        "ausente", "inasistencia", "pasar lista"
    ],
    "horarios": [
        "horario", "horarios", "schedule", "clase", "clases", "hora",
        "tiempo", "cuando", "dias", "días"
    ],
    "reportes": [
        "reporte", "reportes", "sheet", "sheets", "excel", "exportar",
        "exportacion", "exportación", "descargar", "generar reporte"
    ],
    "usuarios": [
        "usuario", "usuarios", "rol", "roles", "admin", "laboratorio",
        "permisos", "accesos", "cuenta", "cuentas"
    ],
    "camaras": [
        "camara", "cámara", "camaras", "cámaras", "facial", "reconocimiento",
        "foto", "identificacion", "identificación"
    ],
    "login": [
        "login", "contraseña", "password", "acceso", "entrar", "iniciar",
        "sesion", "sesión", "clave", "no puedo entrar", "olvide contraseña"
    ],
    "grupos": [
        "grupo", "grupos", "crear grupo", "eliminar grupo", "nuevo grupo"
    ],
    "docentes": [
        "docente", "docentes", "maestro", "profesor", "maestra", "profesora",
        "teacher"
    ],
    "ayuda": [
        "ayuda", "menu", "menú", "opciones", "help", "que puedes hacer",
        "qué puedes hacer", "como funciona", "cómo funciona"
    ],
    "despedida": [
        "adios", "adiós", "bye", "gracias", "hasta luego", "nos vemos",
        "chau", "chao", "hasta pronto", "gracias!"
    ],
}

def detectar_categoria(texto: str) -> str:
    """Detecta la categoría del mensaje por coincidencia exacta o aproximada."""
    texto = texto.lower().strip()

    # 1. Coincidencia exacta o por substring
    for categoria, palabras in KEYWORDS.items():
        if any(p in texto for p in palabras):
            return categoria

    # 2. Coincidencia aproximada (errores de tipeo)
    palabras_todas = [(p, cat) for cat, lista in KEYWORDS.items() for p in lista]
    tokens = texto.split()
    for token in tokens:
        for palabra, categoria in palabras_todas:
            similares = get_close_matches(token, [palabra], n=1, cutoff=0.75)
            if similares:
                return categoria

    return "desconocido"

QUICK_OPTIONS = [
    {"id": "asistencia", "label": "📋 Registro de Asistencia", "message": "asistencia"},
    {"id": "horarios",   "label": "📅 Gestión de Horarios",    "message": "horarios"},
    {"id": "reportes",   "label": "📊 Reportes y Sheets",      "message": "reportes"},
    {"id": "usuarios",   "label": "👥 Usuarios y Roles",        "message": "usuarios"},
]

# ─── Respuestas predefinidas ──────────────────────────────────────────────────

def responder(mensaje: str) -> str:
    categoria = detectar_categoria(mensaje)

    respuestas = {
        "saludo": (
            "¡Hola! 👋 Soy el Asistente de ClassTrack.\n\n"
            "Puedo ayudarte con:\n"
            "- 📋 Registro de asistencia\n"
            "- 📅 Horarios\n"
            "- 📊 Reportes y Sheets\n"
            "- 👥 Usuarios y roles\n"
            "- 📷 Cámaras\n\n"
            "Escribe una palabra clave o elige una opción."
        ),
        "asistencia": (
            "📋 **Registro de Asistencia**\n\n"
            "ClassTrack permite dos métodos:\n\n"
            "1. **Manual**: Ve a tu panel → Asistencia → selecciona grupo y fecha → marca cada alumno.\n"
            "2. **Automático**: Mediante reconocimiento facial con cámara configurada.\n\n"
            "¿Tienes alguna duda sobre alguno de los dos métodos?"
        ),
        "horarios": (
            "📅 **Gestión de Horarios**\n\n"
            "Para crear un horario:\n\n"
            "1. Ve al panel de administrador.\n"
            "2. Selecciona **Horarios** en el menú.\n"
            "3. Elige el docente, grupo y aula.\n"
            "4. Asigna los días y horas.\n"
            "5. Guarda los cambios.\n\n"
            "También puedes visualizarlos en formato de tabla semanal."
        ),
        "reportes": (
            "📊 **Reportes y Google Sheets**\n\n"
            "Para generar un reporte:\n\n"
            "1. Ve a **Reportes** en el menú.\n"
            "2. Selecciona el grupo, materia y rango de fechas.\n"
            "3. Haz clic en **Exportar a Sheets**.\n\n"
            "El reporte incluye lista de alumnos, fechas y porcentaje de asistencia."
        ),
        "usuarios": (
            "👥 **Usuarios y Roles**\n\n"
            "ClassTrack tiene 3 roles:\n\n"
            "- **Administrador**: Acceso completo al sistema.\n"
            "- **Docente**: Ve sus grupos y registra asistencia.\n"
            "- **Laboratorio**: Gestión de recursos de laboratorio.\n\n"
            "Para registrar un usuario nuevo, ve a **Configuración → Usuarios → Agregar**."
        ),
        "camaras": (
            "📷 **Configuración de Cámaras**\n\n"
            "Para configurar una cámara:\n\n"
            "1. Ve a **Cámaras** en el panel de administrador.\n"
            "2. Agrega la IP o dispositivo de la cámara.\n"
            "3. Asígnala a un aula o laboratorio.\n"
            "4. Activa el reconocimiento facial.\n\n"
            "El sistema identificará automáticamente a los alumnos al entrar."
        ),
        "login": (
            "🔐 **Acceso al Sistema**\n\n"
            "Para iniciar sesión:\n\n"
            "1. Ve a la página de login.\n"
            "2. Ingresa tu correo institucional y contraseña.\n"
            "3. Haz clic en **Entrar**.\n\n"
            "Si olvidaste tu contraseña, contacta al administrador del sistema."
        ),
        "grupos": (
            "👨‍🎓 **Gestión de Grupos**\n\n"
            "Desde el panel de administrador puedes:\n\n"
            "1. **Crear** un grupo: Gestión → Grupos → Nuevo.\n"
            "2. **Asignar** docentes y alumnos al grupo.\n"
            "3. **Editar** o **eliminar** grupos existentes."
        ),
        "docentes": (
            "👨‍🏫 **Gestión de Docentes**\n\n"
            "Desde el panel de administrador puedes:\n\n"
            "1. **Registrar** nuevos docentes en Gestión → Docentes.\n"
            "2. **Asignar** materias y grupos.\n"
            "3. **Editar** o dar de baja a un docente."
        ),
        "ayuda": (
            "🆘 **¿En qué puedo ayudarte?**\n\n"
            "Escribe alguna de estas palabras clave:\n\n"
            "- **asistencia** — Registro de asistencia\n"
            "- **horarios** — Gestión de horarios\n"
            "- **reportes** — Exportar a Sheets\n"
            "- **usuarios** — Roles y accesos\n"
            "- **cámaras** — Reconocimiento facial\n"
            "- **grupos** — Gestión de grupos\n"
            "- **docentes** — Gestión de docentes\n"
            "- **login** — Problemas de acceso"
        ),
        "despedida": "¡Hasta luego! 👋 Quedo a tus órdenes si necesitas más ayuda.",
        "desconocido": (
            "No entendí tu pregunta 🤔\n\n"
            "Intenta con palabras clave como:\n"
            "**asistencia, horarios, reportes, usuarios, cámaras, grupos, docentes, login**\n\n"
            "O escribe **ayuda** para ver todas las opciones."
        ),
    }

    return respuestas.get(categoria, respuestas["desconocido"])

# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/options")
async def get_options():
    return {"options": QUICK_OPTIONS}


@router.post("/message")
async def send_message(body: ChatRequest):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío")

    respuesta = responder(body.message)
    return {"response": respuesta, "role": "assistant"}