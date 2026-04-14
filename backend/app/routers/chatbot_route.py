import os
from difflib import get_close_matches
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Docente, Grupo, Horario, Aula, Materia

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

# ─── Mapeo de días ────────────────────────────────────────────────────────────

DIAS = {
    0: "Lunes", 1: "Martes", 2: "Miércoles",
    3: "Jueves", 4: "Viernes", 5: "Sábado", 6: "Domingo"
}

DIAS_INVERSO = {
    "lunes": 0, "martes": 1, "miercoles": 2, "miércoles": 2,
    "jueves": 3, "viernes": 4, "sabado": 5, "sábado": 5, "domingo": 6
}

# ─── Keywords ─────────────────────────────────────────────────────────────────

KEYWORDS = {
    "saludo": [
        "hola", "ola", "buenas", "buenos", "saludos", "que onda", "quiubo",
        "hey", "hi", "epa", "buen dia", "buen día", "buenas tardes",
        "buenas noches", "buenos dias", "como estas", "q onda"
    ],
    "menu": [
        "menu", "menú", "opciones", "inicio", "start", "empezar",
        "que puedes hacer", "qué puedes hacer", "ayuda", "help",
        "como funciona", "cómo funciona", "que haces", "qué haces"
    ],
    "asistencia": [
        "asistencia", "asistir", "faltas", "falta", "presente", "ausente",
        "inasistencia", "pasar lista", "registrar asistencia", "tomar lista",
        "marcar asistencia", "como registro la asistencia", "cómo registro la asistencia"
    ],
    "horarios": [
        "horario", "horarios", "clase", "clases", "hora", "cuando",
        "que dia", "qué día", "a que hora", "schedule",
        "consultar horario", "ver horario", "horario del", "horario de",
        "como gestiono los horarios", "gestionar horario", "administrar horario"
    ],
    "reportes": [
        "reporte", "reportes", "sheet", "sheets", "excel", "exportar",
        "exportacion", "exportación", "descargar", "generar reporte",
        "como exporto", "cómo exporto", "google sheets", "como genero reportes"
    ],
    "usuarios": [
        "usuario", "usuarios", "rol", "roles", "admin", "administrador",
        "permisos", "accesos", "cuenta", "cuentas", "agregar usuario",
        "nuevo usuario", "roles del sistema", "usuarios y roles"
    ],
    "camaras": [
        "camara", "cámara", "camaras", "cámaras", "facial", "reconocimiento",
        "foto", "identificacion", "identificación", "configurar camara"
    ],
    "login": [
        "login", "contraseña", "password", "acceso", "entrar", "iniciar",
        "sesion", "sesión", "clave", "no puedo entrar", "olvide contraseña",
        "olvidé contraseña", "no recuerdo"
    ],
    "gestion": [
        "gestion", "gestión", "agregar", "agrego", "añadir", "añado",
        "registrar", "registro", "crear", "creo", "nuevo", "nueva",
        "modificar", "modifico", "editar", "edito", "actualizar", "actualizo",
        "eliminar", "elimino", "borrar", "borro", "dar de baja",
        "como agrego", "cómo agrego", "como registro", "cómo registro",
        "como creo", "cómo creo", "como modifico", "cómo modifico",
        "como edito", "cómo edito", "como elimino", "cómo elimino",
        "como borro", "cómo borro", "como añado", "cómo añado",
    ],
    "consultar": [
        "consultar", "consulta", "buscar", "busca", "mostrar", "muestra",
        "ver", "información de", "informacion de", "dime", "dame",
        "cuantos", "cuántos", "lista de", "quiero ver", "necesito ver",
        "consultar informacion", "consultar información"
    ],
    "info_entidad": [
        "informacion del docente", "información del docente",
        "informacion del grupo", "información del grupo",
        "informacion del aula", "información del aula",
        "informacion de la materia", "información de la materia",
        "datos del docente", "datos del grupo", "datos del aula", "datos de la materia",
        "info del docente", "info del grupo", "info del aula", "info de la materia",
        "quien es el docente", "quién es el docente",
        "que materias", "qué materias", "que grupos", "qué grupos",
    ],
    "despedida": [
        "adios", "adiós", "bye", "gracias", "hasta luego", "nos vemos",
        "chau", "chao", "hasta pronto"
    ],
}

QUICK_OPTIONS = [
    {"id": "asistencia", "label": "📋 Registro de Asistencia", "message": "como registro la asistencia"},
    {"id": "horarios",   "label": "📅 Gestión de Horarios",    "message": "como gestiono los horarios"},
    {"id": "reportes",   "label": "📊 Reportes y Sheets",      "message": "como genero reportes"},
    {"id": "usuarios",   "label": "👥 Usuarios y Roles",        "message": "usuarios y roles del sistema"},
    {"id": "gestion",    "label": "🗂️ Gestión de Registros",   "message": "como gestiono docentes materias grupos aulas"},
    {"id": "consultar",  "label": "🔍 Consultar Información",   "message": "consultar informacion"},
]

# ─── Detección de categoría ───────────────────────────────────────────────────

def detectar_categoria(texto: str) -> str:
    texto = texto.lower().strip()
    for categoria, palabras in KEYWORDS.items():
        if any(p in texto for p in palabras):
            return categoria
    todas = [(p, cat) for cat, lista in KEYWORDS.items() for p in lista]
    for token in texto.split():
        for palabra, categoria in todas:
            if get_close_matches(token, [palabra], n=1, cutoff=0.80):
                return categoria
    return "desconocido"

# ─── Detectar entidad mencionada (docente / grupo / aula / materia) ───────────

def detectar_entidad(msg: str) -> Optional[str]:
    if any(p in msg for p in ["docente", "maestro", "profesor", "maestra", "profesora"]):
        return "docente"
    if any(p in msg for p in ["grupo", "grupos"]):
        return "grupo"
    if any(p in msg for p in ["aula", "salon", "salón", "laboratorio"]):
        return "aula"
    if any(p in msg for p in ["materia", "asignatura", "curso", "materias"]):
        return "materia"
    return None

def detectar_accion(msg: str) -> Optional[str]:
    if any(p in msg for p in ["agregar", "agrego", "añadir", "añado", "registrar", "registro", "crear", "creo", "nuevo", "nueva", "como registro", "cómo registro", "como agrego", "cómo agrego", "como creo", "cómo creo", "como añado"]):
        return "agregar"
    if any(p in msg for p in ["modificar", "modifico", "editar", "edito", "actualizar", "actualizo", "como modifico", "cómo modifico", "como edito", "cómo edito"]):
        return "editar"
    if any(p in msg for p in ["eliminar", "elimino", "borrar", "borro", "dar de baja", "como elimino", "cómo elimino", "como borro", "cómo borro"]):
        return "eliminar"
    return None

# ─── Helpers de búsqueda en BDD ──────────────────────────────────────────────

def buscar_grupo(msg: str, db: Session):
    grupos = db.query(Grupo).all()
    for g in grupos:
        if g.nombre.lower() in msg:
            return g
    return None

def buscar_docente(msg: str, db: Session):
    docentes = db.query(Docente).all()
    for d in docentes:
        nombre_completo = f"{d.nombre} {d.apellido or ''}".lower()
        partes = [p for p in nombre_completo.split() if len(p) > 3]
        if any(p in msg for p in partes):
            return d
    return None

def buscar_materia(msg: str, db: Session):
    materias = db.query(Materia).all()
    for m in materias:
        if m.nombre.lower() in msg or m.codigo.lower() in msg:
            return m
    return None

def buscar_aula(msg: str, db: Session):
    aulas = db.query(Aula).all()
    for a in aulas:
        if a.nombre.lower() in msg:
            return a
    return None

def buscar_dia(msg: str):
    for nombre, numero in DIAS_INVERSO.items():
        if nombre in msg:
            return numero
    return None

def tiene_intencion_consulta(msg: str) -> bool:
    palabras_consulta = [
        "horario del", "horario de", "horario grupo", "horario aula",
        "horario docente", "horario profesor", "horario maestro",
        "del lunes", "del martes", "del miercoles", "del miércoles",
        "del jueves", "del viernes", "del sabado", "del sábado",
        "el lunes", "el martes", "el miercoles", "el jueves", "el viernes",
        "muéstrame", "muestrame", "dime el horario", "ver el horario",
        "consultar horario", "docentes registrados", "lista de docentes",
        "grupos registrados", "lista de grupos", "aulas disponibles",
        "materias disponibles", "cuantos grupos", "cuantos docentes",
        "cuántos grupos", "cuántos docentes", "informacion del grupo",
        "información del grupo", "info del grupo", "datos del grupo",
        "docente del grupo", "materias del grupo"
    ]
    return any(p in msg for p in palabras_consulta)

# ─── Formato de horario ───────────────────────────────────────────────────────

def formato_horario(h: Horario, db: Session) -> str:
    dia  = DIAS.get(h.dia_semana, str(h.dia_semana))
    mat  = db.query(Materia).filter(Materia.id == h.materia_id).first()
    doc  = db.query(Docente).filter(Docente.id == h.docente_id).first()
    aula = db.query(Aula).filter(Aula.id == h.aula_id).first()
    grp  = db.query(Grupo).filter(Grupo.id == h.grupo_id).first()

    nombre_mat  = mat.nombre if mat else "Sin materia"
    nombre_doc  = f"{doc.nombre} {doc.apellido or ''}".strip() if doc else "Sin docente"
    nombre_aula = aula.nombre if aula else "Sin aula"
    nombre_grp  = grp.nombre if grp else "Sin grupo"

    return (f"• **{dia}** {h.hora_inicio}–{h.hora_fin} | "
            f"{nombre_mat} | Grupo {nombre_grp} | "
            f"{nombre_doc} | Aula {nombre_aula}")

# ─── Respuestas de gestión CRUD ───────────────────────────────────────────────

GESTION_CRUD = {
    "docente": {
        "agregar": (
            "👨‍🏫 **Agregar un docente**\n\n"
            "1. Ve al menú → **Gestión → Docentes**.\n"
            "2. Haz clic en **➕ Nuevo docente**.\n"
            "3. Completa los campos:\n"
            "   - Nombre y apellido\n"
            "   - Correo electrónico\n"
            "4. Haz clic en **Guardar**.\n\n"
            "💡 *Una vez registrado, podrás asignarle horarios desde el módulo de Horarios.*"
        ),
        "editar": (
            "✏️ **Modificar un docente**\n\n"
            "1. Ve al menú → **Gestión → Docentes**.\n"
            "2. Busca al docente en la lista.\n"
            "3. Haz clic en el ícono ✏️ **Editar**.\n"
            "4. Modifica los campos que necesites:\n"
            "   - Nombre, apellido o correo\n"
            "5. Haz clic en **Guardar cambios**.\n\n"
            "💡 *Los cambios se reflejan de inmediato en los horarios asignados.*"
        ),
        "eliminar": (
            "🗑️ **Eliminar un docente**\n\n"
            "1. Ve al menú → **Gestión → Docentes**.\n"
            "2. Busca al docente en la lista.\n"
            "3. Haz clic en el ícono 🗑️ **Eliminar**.\n"
            "4. Confirma la acción en el cuadro de diálogo.\n\n"
            "⚠️ *Al eliminar un docente, sus horarios asociados quedarán sin docente asignado. "
            "Se recomienda reasignarlos antes de eliminar.*"
        ),
        "general": (
            "👨‍🏫 **Gestión de Docentes**\n\n"
            "Desde **Gestión → Docentes** puedes:\n\n"
            "- ➕ **Agregar** — Registrar un nuevo docente con nombre y correo.\n"
            "- ✏️ **Editar** — Modificar los datos de un docente existente.\n"
            "- 🗑️ **Eliminar** — Dar de baja a un docente del sistema.\n\n"
            "¿Qué acción necesitas realizar?\n"
            "Escribe: *agregar docente*, *editar docente* o *eliminar docente*."
        ),
    },
    "materia": {
        "agregar": (
            "📚 **Agregar una materia**\n\n"
            "1. Ve al menú → **Gestión → Materias**.\n"
            "2. Haz clic en **➕ Nueva materia**.\n"
            "3. Completa los campos:\n"
            "   - Nombre de la materia\n"
            "   - Código (ej. MAT101)\n"
            "   - Descripción (opcional)\n"
            "   - Color de identificación\n"
            "4. Haz clic en **Guardar**.\n\n"
            "💡 *El código debe ser único en el sistema.*"
        ),
        "editar": (
            "✏️ **Modificar una materia**\n\n"
            "1. Ve al menú → **Gestión → Materias**.\n"
            "2. Localiza la materia en la lista.\n"
            "3. Haz clic en ✏️ **Editar**.\n"
            "4. Modifica nombre, código, descripción o color.\n"
            "5. Haz clic en **Guardar cambios**.\n\n"
            "💡 *Si cambias el código, asegúrate de que no esté en uso por otra materia.*"
        ),
        "eliminar": (
            "🗑️ **Eliminar una materia**\n\n"
            "1. Ve al menú → **Gestión → Materias**.\n"
            "2. Localiza la materia en la lista.\n"
            "3. Haz clic en 🗑️ **Eliminar**.\n"
            "4. Confirma la acción.\n\n"
            "⚠️ *Eliminar una materia afecta los horarios que la tengan asignada. "
            "Se recomienda verificar y reasignar antes de eliminar.*"
        ),
        "general": (
            "📚 **Gestión de Materias**\n\n"
            "Desde **Gestión → Materias** puedes:\n\n"
            "- ➕ **Agregar** — Registrar una nueva materia con nombre, código y color.\n"
            "- ✏️ **Editar** — Modificar los datos de una materia existente.\n"
            "- 🗑️ **Eliminar** — Quitar una materia del sistema.\n\n"
            "¿Qué acción necesitas realizar?\n"
            "Escribe: *agregar materia*, *editar materia* o *eliminar materia*."
        ),
    },
    "grupo": {
        "agregar": (
            "👥 **Agregar un grupo**\n\n"
            "1. Ve al menú → **Gestión → Grupos**.\n"
            "2. Haz clic en **➕ Nuevo grupo**.\n"
            "3. Completa los campos:\n"
            "   - Nombre del grupo (ej. A1, 3B, Sistemas-2)\n"
            "   - Cantidad de estudiantes\n"
            "4. Haz clic en **Guardar**.\n\n"
            "💡 *Una vez creado el grupo, puedes asignarle horarios y docentes desde el módulo de Horarios.*"
        ),
        "editar": (
            "✏️ **Modificar un grupo**\n\n"
            "1. Ve al menú → **Gestión → Grupos**.\n"
            "2. Busca el grupo en la lista.\n"
            "3. Haz clic en ✏️ **Editar**.\n"
            "4. Modifica el nombre o la cantidad de estudiantes.\n"
            "5. Haz clic en **Guardar cambios**.\n\n"
            "💡 *Si cambias el nombre del grupo, se actualizará en todos los horarios asociados.*"
        ),
        "eliminar": (
            "🗑️ **Eliminar un grupo**\n\n"
            "1. Ve al menú → **Gestión → Grupos**.\n"
            "2. Busca el grupo en la lista.\n"
            "3. Haz clic en 🗑️ **Eliminar**.\n"
            "4. Confirma la acción.\n\n"
            "⚠️ *Al eliminar un grupo se eliminarán también sus horarios asignados. "
            "Esta acción no se puede deshacer.*"
        ),
        "general": (
            "👥 **Gestión de Grupos**\n\n"
            "Desde **Gestión → Grupos** puedes:\n\n"
            "- ➕ **Agregar** — Crear un nuevo grupo con nombre y cantidad de estudiantes.\n"
            "- ✏️ **Editar** — Modificar el nombre o datos de un grupo.\n"
            "- 🗑️ **Eliminar** — Dar de baja un grupo del sistema.\n\n"
            "¿Qué acción necesitas realizar?\n"
            "Escribe: *agregar grupo*, *editar grupo* o *eliminar grupo*."
        ),
    },
    "aula": {
        "agregar": (
            "🏫 **Agregar un aula**\n\n"
            "1. Ve al menú → **Gestión → Aulas**.\n"
            "2. Haz clic en **➕ Nueva aula**.\n"
            "3. Completa los campos:\n"
            "   - Nombre del aula (ej. Aula 12, Lab Redes)\n"
            "   - Capacidad (número de personas)\n"
            "   - Edificio y piso\n"
            "   - ¿Tiene cámara? (activar si aplica)\n"
            "4. Haz clic en **Guardar**.\n\n"
            "💡 *Si activas la cámara, recuerda configurarla en el módulo de Cámaras.*"
        ),
        "editar": (
            "✏️ **Modificar un aula**\n\n"
            "1. Ve al menú → **Gestión → Aulas**.\n"
            "2. Localiza el aula en la lista.\n"
            "3. Haz clic en ✏️ **Editar**.\n"
            "4. Modifica nombre, capacidad, edificio, piso o estado de cámara.\n"
            "5. Haz clic en **Guardar cambios**.\n\n"
            "💡 *Puedes activar o desactivar la cámara desde aquí sin perder la configuración.*"
        ),
        "eliminar": (
            "🗑️ **Eliminar un aula**\n\n"
            "1. Ve al menú → **Gestión → Aulas**.\n"
            "2. Localiza el aula en la lista.\n"
            "3. Haz clic en 🗑️ **Eliminar**.\n"
            "4. Confirma la acción.\n\n"
            "⚠️ *Los horarios asignados a esta aula quedarán sin aula. "
            "Se recomienda reasignarlos antes de eliminar.*"
        ),
        "general": (
            "🏫 **Gestión de Aulas**\n\n"
            "Desde **Gestión → Aulas** puedes:\n\n"
            "- ➕ **Agregar** — Registrar un aula nueva con capacidad, edificio y piso.\n"
            "- ✏️ **Editar** — Modificar los datos o activar/desactivar la cámara.\n"
            "- 🗑️ **Eliminar** — Quitar un aula del sistema.\n\n"
            "¿Qué acción necesitas realizar?\n"
            "Escribe: *agregar aula*, *editar aula* o *eliminar aula*."
        ),
    },
}

# ─── Respuesta de info de entidad desde BDD ───────────────────────────────────

def responder_info_entidad(msg: str, db: Session) -> Optional[str]:
    """Devuelve información detallada de un docente, grupo, aula o materia específico."""

    docente = buscar_docente(msg, db)
    if docente:
        horarios = db.query(Horario).filter(Horario.docente_id == docente.id).all()
        materias_ids = {h.materia_id for h in horarios}
        grupos_ids   = {h.grupo_id   for h in horarios}
        materias = db.query(Materia).filter(Materia.id.in_(materias_ids)).all()
        grupos   = db.query(Grupo).filter(Grupo.id.in_(grupos_ids)).all()
        nombre   = f"{docente.nombre} {docente.apellido or ''}".strip()
        return (
            f"👨‍🏫 **Docente: {nombre}**\n\n"
            f"📧 Email: {docente.email or 'No registrado'}\n"
            f"📚 Materias que imparte: {', '.join(m.nombre for m in materias) or 'Sin asignar'}\n"
            f"👥 Grupos asignados: {', '.join(g.nombre for g in grupos) or 'Sin asignar'}\n"
            f"📅 Total de clases registradas: {len(horarios)}"
        )

    grupo = buscar_grupo(msg, db)
    if grupo:
        horarios     = db.query(Horario).filter(Horario.grupo_id == grupo.id).all()
        docentes_ids = {h.docente_id for h in horarios}
        materias_ids = {h.materia_id for h in horarios}
        docentes = db.query(Docente).filter(Docente.id.in_(docentes_ids)).all()
        materias = db.query(Materia).filter(Materia.id.in_(materias_ids)).all()
        return (
            f"👥 **Grupo: {grupo.nombre}**\n\n"
            f"🎓 Estudiantes: {grupo.cantidad_estudiantes}\n"
            f"👨‍🏫 Docentes: {', '.join(f'{d.nombre} {d.apellido or ''}'.strip() for d in docentes) or 'Sin asignar'}\n"
            f"📚 Materias: {', '.join(m.nombre for m in materias) or 'Sin asignar'}\n"
            f"📅 Total de clases por semana: {len(horarios)}"
        )

    aula = buscar_aula(msg, db)
    if aula:
        camara   = "✅ Sí" if aula.tiene_camara else "❌ No"
        horarios = db.query(Horario).filter(Horario.aula_id == aula.id).all()
        return (
            f"🏫 **Aula: {aula.nombre}**\n\n"
            f"👥 Capacidad: {aula.capacidad} personas\n"
            f"🏢 Edificio: {aula.edificio or 'N/A'} | Piso {aula.piso}\n"
            f"📷 Cámara instalada: {camara}\n"
            f"📅 Clases asignadas por semana: {len(horarios)}"
        )

    materia = buscar_materia(msg, db)
    if materia:
        horarios   = db.query(Horario).filter(Horario.materia_id == materia.id).all()
        grupos_ids = {h.grupo_id   for h in horarios}
        docs_ids   = {h.docente_id for h in horarios}
        grupos   = db.query(Grupo).filter(Grupo.id.in_(grupos_ids)).all()
        docentes = db.query(Docente).filter(Docente.id.in_(docs_ids)).all()
        return (
            f"📚 **Materia: {materia.nombre}**\n\n"
            f"🔑 Código: {materia.codigo}\n"
            f"📝 Descripción: {materia.descripcion or 'Sin descripción'}\n"
            f"👥 Grupos que la cursan: {', '.join(g.nombre for g in grupos) or 'Ninguno'}\n"
            f"👨‍🏫 Docentes que la imparten: {', '.join(f'{d.nombre} {d.apellido or ''}'.strip() for d in docentes) or 'Ninguno'}"
        )

    return None

# ─── Consultas de listas desde BDD ───────────────────────────────────────────

def responder_consulta_bdd(msg: str, db: Session) -> Optional[str]:

    grupo   = buscar_grupo(msg, db)
    docente = buscar_docente(msg, db)
    aula    = buscar_aula(msg, db)
    materia = buscar_materia(msg, db)
    dia     = buscar_dia(msg)

    if any([grupo, docente, aula, materia, dia is not None]):
        query  = db.query(Horario)
        titulo = "📅 **Horarios**"

        if grupo:
            query  = query.filter(Horario.grupo_id == grupo.id)
            titulo = f"📅 **Horario del grupo {grupo.nombre}**"
        if docente:
            nombre_doc = f"{docente.nombre} {docente.apellido or ''}".strip()
            query  = query.filter(Horario.docente_id == docente.id)
            titulo = f"📅 **Horario del docente {nombre_doc}**"
        if aula:
            query  = query.filter(Horario.aula_id == aula.id)
            titulo = f"📅 **Horario del aula {aula.nombre}**"
        if materia:
            query  = query.filter(Horario.materia_id == materia.id)
            titulo = f"📅 **Horario de {materia.nombre}**"
        if dia is not None:
            query  = query.filter(Horario.dia_semana == dia)
            if titulo == "📅 **Horarios**":
                titulo = f"📅 **Horarios del {DIAS[dia]}**"
            else:
                titulo += f" — {DIAS[dia]}"

        horarios = query.order_by(Horario.dia_semana, Horario.hora_inicio).all()
        if not horarios:
            return f"{titulo}\n\nNo encontré horarios registrados para esa búsqueda."

        lineas    = [titulo + "\n"]
        dia_actual = None
        for h in horarios:
            if dia is None:
                if h.dia_semana != dia_actual:
                    dia_actual = h.dia_semana
                    lineas.append(f"\n**{DIAS.get(dia_actual, '')}**")
            lineas.append(formato_horario(h, db))
        return "\n".join(lineas)

    if any(p in msg for p in ["lista de docentes", "docentes registrados", "todos los docentes", "cuantos docentes", "cuántos docentes"]):
        docentes = db.query(Docente).all()
        if not docentes:
            return "No hay docentes registrados en el sistema."
        lineas = [f"👨‍🏫 **Docentes registrados ({len(docentes)}):**\n"]
        for d in docentes:
            nombre = f"{d.nombre} {d.apellido or ''}".strip()
            lineas.append(f"• {nombre} — {d.email or 'sin email'}")
        return "\n".join(lineas)

    if any(p in msg for p in ["lista de grupos", "grupos registrados", "todos los grupos", "cuantos grupos", "cuántos grupos"]):
        grupos = db.query(Grupo).all()
        if not grupos:
            return "No hay grupos registrados en el sistema."
        lineas = [f"👥 **Grupos registrados ({len(grupos)}):**\n"]
        for g in grupos:
            lineas.append(f"• **{g.nombre}** — {g.cantidad_estudiantes} estudiantes")
        return "\n".join(lineas)

    if any(p in msg for p in ["lista de aulas", "aulas disponibles", "todas las aulas", "cuantas aulas", "aulas registradas"]):
        aulas = db.query(Aula).all()
        if not aulas:
            return "No hay aulas registradas en el sistema."
        lineas = [f"🏫 **Aulas registradas ({len(aulas)}):**\n"]
        for a in aulas:
            camara = "📷" if a.tiene_camara else "  "
            lineas.append(f"• **{a.nombre}** {camara} — Cap. {a.capacidad} | Edif. {a.edificio or 'N/A'} Piso {a.piso}")
        return "\n".join(lineas)

    if any(p in msg for p in ["lista de materias", "materias disponibles", "todas las materias", "materias registradas"]):
        materias = db.query(Materia).all()
        if not materias:
            return "No hay materias registradas en el sistema."
        lineas = [f"📚 **Materias registradas ({len(materias)}):**\n"]
        for m in materias:
            lineas.append(f"• **{m.nombre}** ({m.codigo})")
        return "\n".join(lineas)

    return None

# ─── Respuestas estáticas ─────────────────────────────────────────────────────

RESPUESTAS_ESTATICAS = {

    "saludo": (
        "¡Hola! 👋 Soy el **Asistente de ClassTrack**.\n\n"
        "Estoy aquí para ayudarte a navegar el sistema y consultar información en tiempo real.\n\n"
        "¿Qué necesitas hoy? Elige una opción o escribe tu pregunta directamente."
    ),

    "menu": (
        "📌 **¿En qué puedo ayudarte?**\n\n"
        "📋 **Registro de Asistencia** — Cómo marcar asistencia manual o automáticamente\n"
        "📅 **Gestión de Horarios** — Crear, editar y visualizar horarios\n"
        "📊 **Reportes y Sheets** — Exportar datos a Google Sheets\n"
        "👥 **Usuarios y Roles** — Administrar cuentas y permisos\n"
        "🗂️ **Gestión de Registros** — Agregar, editar o eliminar docentes, materias, grupos y aulas\n"
        "🔍 **Consultar Información** — Ver horarios, docentes, grupos y aulas en tiempo real\n\n"
        "Escribe el tema que te interesa o haz clic en una opción."
    ),

    "asistencia": (
        "📋 **Registro de Asistencia**\n\n"
        "ClassTrack ofrece **dos métodos** para registrar asistencia:\n\n"
        "**① Método Manual**\n"
        "1. Ve a tu panel principal.\n"
        "2. Selecciona **Asistencia** en el menú lateral.\n"
        "3. Elige el **grupo** y la **fecha** correspondiente.\n"
        "4. Marca a cada alumno como ✅ Presente o ❌ Ausente.\n"
        "5. Haz clic en **Guardar** para confirmar.\n\n"
        "**② Método Automático (Reconocimiento Facial)**\n"
        "1. El alumno entra al aula con cámara configurada.\n"
        "2. El sistema detecta su rostro automáticamente.\n"
        "3. La asistencia se registra sin intervención del docente.\n\n"
        "💡 *El método automático requiere que el aula tenga cámara y que el alumno tenga foto registrada.*\n\n"
        "¿Tienes dudas sobre alguno de los dos métodos?"
    ),

    "horarios_gestion": (
        "📅 **Gestión de Horarios**\n\n"
        "Desde el panel de administrador puedes gestionar todos los horarios del plantel.\n\n"
        "**① Crear un horario nuevo**\n"
        "1. Ve al menú → **Horarios**.\n"
        "2. Haz clic en **Nuevo horario**.\n"
        "3. Selecciona: Docente, Materia, Grupo, Aula, Día y Hora.\n"
        "4. Confirma que no haya conflicto de aula o docente.\n"
        "5. Guarda el horario.\n\n"
        "**② Editar un horario existente**\n"
        "1. Busca el horario en la lista.\n"
        "2. Haz clic en ✏️ Editar.\n"
        "3. Modifica los campos y guarda.\n\n"
        "**③ Eliminar un horario**\n"
        "1. Selecciona el horario.\n"
        "2. Haz clic en 🗑️ Eliminar y confirma.\n\n"
        "**④ Visualizar horarios**\n"
        "Puedes verlos por **Grupo**, **Docente** o **Aula** en formato de tabla semanal.\n\n"
        "💡 *El sistema detecta automáticamente conflictos de horario al guardar.*"
    ),

    "reportes": (
        "📊 **Reportes y Google Sheets**\n\n"
        "**① Generar un reporte**\n"
        "1. Ve al menú → **Reportes**.\n"
        "2. Selecciona el **Grupo** y la **Materia**.\n"
        "3. Establece el **rango de fechas**.\n"
        "4. Haz clic en **Generar reporte**.\n\n"
        "**② Exportar a Google Sheets**\n"
        "1. Haz clic en **Exportar a Sheets**.\n"
        "2. La hoja incluirá:\n"
        "   - Lista completa de alumnos\n"
        "   - Registro por fecha (✅/❌)\n"
        "   - Porcentaje de asistencia por alumno\n"
        "   - Total de clases en el período\n\n"
        "**③ Descargar en Excel**\n"
        "También puedes descargar el reporte como archivo **.xlsx**.\n\n"
        "💡 *Configura la integración en Configuración → Sheets antes de exportar.*"
    ),

    "usuarios": (
        "👥 **Usuarios y Roles del Sistema**\n\n"
        "ClassTrack maneja **3 roles**:\n\n"
        "🔴 **Administrador** — Acceso completo. Gestiona todo el sistema.\n"
        "🟡 **Docente** — Ve sus grupos y registra asistencia de sus materias.\n"
        "🟢 **Laboratorio** — Gestión de recursos y asistencia en laboratorio.\n\n"
        "**Administrar usuarios**\n"
        "1. Ve a **Configuración → Usuarios**.\n"
        "2. ➕ **Agregar**: llena los datos y asigna el rol.\n"
        "3. ✏️ **Editar**: modifica datos o cambia el rol.\n"
        "4. 🚫 **Desactivar**: el usuario no podrá iniciar sesión.\n\n"
        "💡 *Solo los administradores pueden crear o modificar cuentas.*"
    ),

    "gestion": (
        "🗂️ **Gestión de Registros**\n\n"
        "Desde el módulo **Gestión** puedes administrar los elementos principales del sistema:\n\n"
        "👨‍🏫 **Docentes** — Agregar, editar o eliminar docentes\n"
        "📚 **Materias** — Registrar, modificar o quitar materias\n"
        "👥 **Grupos** — Crear, editar o eliminar grupos\n"
        "🏫 **Aulas** — Agregar, editar o eliminar aulas\n\n"
        "¿Con cuál quieres comenzar? Escribe por ejemplo:\n"
        "- *agregar docente*\n"
        "- *como elimino una materia*\n"
        "- *editar grupo*\n"
        "- *registrar aula*"
    ),

    "consultar": (
        "🔍 **Consultar Información**\n\n"
        "Puedo mostrarte datos en tiempo real del sistema:\n\n"
        "**📅 Horarios**\n"
        "- *horario del grupo A1*\n"
        "- *horario del lunes*\n"
        "- *horario del profesor García*\n"
        "- *horario del aula Lab1*\n"
        "- *horario del grupo B2 del viernes*\n\n"
        "**👨‍🏫 Docentes**\n"
        "- *lista de docentes*\n"
        "- *información del docente García*\n\n"
        "**👥 Grupos**\n"
        "- *lista de grupos*\n"
        "- *información del grupo A1*\n\n"
        "**🏫 Aulas**\n"
        "- *aulas disponibles*\n"
        "- *información del aula Lab1*\n\n"
        "**📚 Materias**\n"
        "- *materias disponibles*\n"
        "- *información de la materia Redes*"
    ),

    "camaras": (
        "📷 **Cámaras y Reconocimiento Facial**\n\n"
        "**① Configurar una cámara nueva**\n"
        "1. Panel de administrador → **Cámaras**.\n"
        "2. Haz clic en **Agregar cámara**.\n"
        "3. Ingresa la **IP** o selecciona el dispositivo.\n"
        "4. Asigna la cámara a un **aula** o **laboratorio**.\n"
        "5. Activa el **reconocimiento facial**.\n\n"
        "**② Registrar fotos de alumnos**\n"
        "1. Ve a **Gestión → Alumnos**.\n"
        "2. Selecciona el alumno y sube su foto.\n\n"
        "**③ Funcionamiento automático**\n"
        "- El alumno entra al aula → la cámara detecta su rostro → asistencia marcada.\n\n"
        "💡 *Se recomienda buena iluminación para mayor precisión.*"
    ),

    "login": (
        "🔐 **Acceso al Sistema**\n\n"
        "**① Iniciar sesión**\n"
        "1. Ingresa tu **correo institucional** y **contraseña**.\n"
        "2. Haz clic en **Entrar**.\n\n"
        "**② Olvidé mi contraseña**\n"
        "1. Haz clic en **¿Olvidaste tu contraseña?**\n"
        "2. Ingresa tu correo → recibirás un enlace para restablecerla.\n\n"
        "**③ No puedo entrar**\n"
        "- ❌ Contraseña incorrecta → restablécela.\n"
        "- ❌ Cuenta desactivada → contacta al administrador.\n"
        "- ❌ Correo no registrado → verifica que uses el correo institucional.\n\n"
        "💡 *Para cualquier problema de acceso, comunícate con el administrador del plantel.*"
    ),

    "despedida": (
        "¡Hasta luego! 👋 Fue un gusto ayudarte.\n"
        "Si necesitas algo más, aquí estaré. ¡Que tengas un excelente día!"
    ),

    "desconocido": (
        "No entendí muy bien tu pregunta 🤔\n\n"
        "Puedes preguntarme sobre:\n"
        "**asistencia · horarios · reportes · usuarios · gestión · consultar · cámaras · login**\n\n"
        "O escribe **menú** para ver todas las opciones."
    ),
}

# ─── Función principal ────────────────────────────────────────────────────────

def responder(mensaje: str, db: Session) -> str:
    msg       = mensaje.lower().strip()
    categoria = detectar_categoria(msg)
    entidad   = detectar_entidad(msg)
    accion    = detectar_accion(msg)

    # ── 1. Gestión CRUD (agregar/editar/eliminar docente/grupo/aula/materia) ──
    if categoria == "gestion" or (accion and entidad):
        if entidad and accion:
            return GESTION_CRUD[entidad][accion]
        if entidad:
            return GESTION_CRUD[entidad]["general"]
        return RESPUESTAS_ESTATICAS["gestion"]

    # ── 2. Info detallada de una entidad específica por nombre ────────────────
    if categoria == "info_entidad" or (
        categoria in ("docentes", "grupos", "aulas", "materias", "consultar")
        and any(buscar(msg, db) for buscar in [
            lambda m, d: buscar_docente(m, d),
            lambda m, d: buscar_grupo(m, d),
            lambda m, d: buscar_aula(m, d),
            lambda m, d: buscar_materia(m, d),
        ])
    ):
        resultado = responder_info_entidad(msg, db)
        if resultado:
            return resultado

    # ── 3. Consultas de horarios y listas desde BDD ───────────────────────────
    if categoria in ("horarios", "consultar", "docentes", "grupos", "aulas", "materias") \
            or tiene_intencion_consulta(msg):
        resultado = responder_consulta_bdd(msg, db)
        if resultado:
            return resultado

    # ── 4. Horarios sin filtro → pedir que especifique ────────────────────────
    if categoria == "horarios":
        grupos   = db.query(Grupo).all()
        docentes = db.query(Docente).all()
        nombres_grupos   = ", ".join(g.nombre for g in grupos) or "ninguno registrado"
        nombres_docentes = ", ".join(
            f"{d.nombre} {d.apellido or ''}".strip() for d in docentes
        ) or "ninguno registrado"
        return (
            "📅 **Consultar Horarios**\n\n"
            "Puedo mostrarte el horario filtrando por:\n\n"
            f"**👥 Grupos:** {nombres_grupos}\n"
            f"**👨‍🏫 Docentes:** {nombres_docentes}\n\n"
            "Escribe por ejemplo:\n"
            "- *horario del grupo A1*\n"
            "- *horario del lunes*\n"
            "- *horario del profesor García*\n"
            "- *horario del aula Lab1*"
        )

    # ── 5. Respuesta estática según categoría ─────────────────────────────────
    if categoria == "horarios":
        return RESPUESTAS_ESTATICAS["horarios_gestion"]

    return RESPUESTAS_ESTATICAS.get(categoria, RESPUESTAS_ESTATICAS["desconocido"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class HistoryItem(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[HistoryItem]] = []


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/options")
async def get_options():
    return {"options": QUICK_OPTIONS}


@router.post("/message")
async def send_message(body: ChatRequest, db: Session = Depends(get_db)):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío")
    respuesta = responder(body.message, db)
    return {"response": respuesta, "role": "assistant"}