from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from ..services.horario_automatic import procesar_pdf

from ..database import get_db
from ..models import Horario, Docente, Materia, Grupo, Aula
from ..schemas import HorarioCreate, HorarioResponse

router = APIRouter()

# ─── Endpoints filtrados (deben ir ANTES de /{id}) ────────────────────────────

@router.get("/api/horarios/aula/{aula_id}")
def get_horarios_por_aula(aula_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(Horario, Docente, Materia, Grupo, Aula)
        .outerjoin(Docente,  Horario.docente_id == Docente.id)
        .outerjoin(Materia,  Horario.materia_id == Materia.id)
        .outerjoin(Grupo,    Horario.grupo_id   == Grupo.id)
        .outerjoin(Aula,     Horario.aula_id    == Aula.id)
        .filter(Horario.aula_id == aula_id)
        .all()
    )
    return [_serializar(h, d, m, g, a) for h, d, m, g, a in rows]


@router.get("/api/horarios/docente/{docente_id}")
def get_horarios_por_docente(docente_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(Horario, Docente, Materia, Grupo, Aula)
        .outerjoin(Docente,  Horario.docente_id == Docente.id)
        .outerjoin(Materia,  Horario.materia_id == Materia.id)
        .outerjoin(Grupo,    Horario.grupo_id   == Grupo.id)
        .outerjoin(Aula,     Horario.aula_id    == Aula.id)
        .filter(Horario.docente_id == docente_id)
        .all()
    )
    return [_serializar(h, d, m, g, a) for h, d, m, g, a in rows]


@router.get("/api/horarios/grupo/{grupo_id}")
def get_horarios_por_grupo(grupo_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(Horario, Docente, Materia, Grupo, Aula)
        .outerjoin(Docente,  Horario.docente_id == Docente.id)
        .outerjoin(Materia,  Horario.materia_id == Materia.id)
        .outerjoin(Grupo,    Horario.grupo_id   == Grupo.id)
        .outerjoin(Aula,     Horario.aula_id    == Aula.id)
        .filter(Horario.grupo_id == grupo_id)
        .all()
    )
    return [_serializar(h, d, m, g, a) for h, d, m, g, a in rows]


def _serializar(h, d, m, g, a):
    return {
        "id":             h.id,
        "dia_semana":     h.dia_semana,
        "hora_inicio":    h.hora_inicio,
        "hora_fin":       h.hora_fin,
        "docente_id":     h.docente_id,
        "materia_id":     h.materia_id,
        "grupo_id":       h.grupo_id,
        "aula_id":        h.aula_id,
        "docente_nombre": f"{d.nombre} {d.apellido or ''}".strip() if d else "—",
        "materia_nombre": m.nombre if m else "—",
        "materia_clave":  m.codigo if m else "—",
        "materia_color":  m.color  if m else "#3b82f6",
        "grupo_nombre":   g.nombre if g else "—",
        "aula_nombre":    a.nombre if a else "—",
    }


# ─── CRUD genérico ────────────────────────────────────────────────────────────

@router.get("/api/horarios", response_model=list[HorarioResponse])
def get_horarios(db: Session = Depends(get_db)):
    return db.query(Horario).all()


@router.get("/api/horarios/{id}", response_model=HorarioResponse)
def get_horario(id: int, db: Session = Depends(get_db)):
    horario = db.query(Horario).filter(Horario.id == id).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return horario


@router.post("/api/horarios", response_model=HorarioResponse)
def crear_horario(data: HorarioCreate, db: Session = Depends(get_db)):
    horario = Horario(**data.model_dump())
    db.add(horario)
    db.commit()
    db.refresh(horario)
    return horario


@router.put("/api/horarios/{id}", response_model=HorarioResponse)
def editar_horario(id: int, data: HorarioCreate, db: Session = Depends(get_db)):
    horario = db.query(Horario).filter(Horario.id == id).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    for k, v in data.model_dump().items():
        setattr(horario, k, v)
    db.commit()
    db.refresh(horario)
    return horario


@router.delete("/api/horarios/{id}")
def eliminar_horario(id: int, db: Session = Depends(get_db)):
    horario = db.query(Horario).filter(Horario.id == id).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    db.delete(horario)
    db.commit()
    return JSONResponse(content={"ok": True})





@router.post("/api/horarios/subir-pdf")
async def subir_pdf_horario(
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not archivo.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF")

    contenido = await archivo.read()
    datos = procesar_pdf(contenido)

    COLORES = [
        "#f87171", "#34d399", "#fbbf24", "#60a5fa",
        "#a78bfa", "#f472b6", "#22d3ee", "#0ea5e9",
        "#10b981", "#ef4444", "#d97706", "#4b5563",
        "#16a34a", "#3b82f6", "#e879f9", "#f97316",
    ]

    # ── Pre-calcular mapa de materias con colores en orden de aparición ──
    mapa_materias_colores = {}
    idx_color = 0
    for aula in datos["aulas"]:
        for h in aula["horarios"]:
            cod = h["codigo"]
            if cod not in mapa_materias_colores:
                mapa_materias_colores[cod] = {
                    "nombre": h["materia"],
                    "color":  COLORES[idx_color % len(COLORES)],
                    "docente": h["docente"],
                }
                idx_color += 1

    insertados = 0
    creados    = {"aulas": 0, "grupos": 0, "materias": 0, "docentes": 0}

    cache_aulas    = {}
    cache_grupos   = {}
    cache_materias = {}
    cache_docentes = {}

    def get_or_create_aula(nombre):
        if nombre in cache_aulas:
            return cache_aulas[nombre]
        obj = db.query(Aula).filter(Aula.nombre == nombre).first()
        if not obj:
            obj = Aula(nombre=nombre)
            db.add(obj)
            db.flush()
            creados["aulas"] += 1
        cache_aulas[nombre] = obj
        return obj

    def get_or_create_grupo(nombre):
        if nombre in cache_grupos:
            return cache_grupos[nombre]
        obj = db.query(Grupo).filter(Grupo.nombre == nombre).first()
        if not obj:
            obj = Grupo(nombre=nombre)
            db.add(obj)
            db.flush()
            creados["grupos"] += 1
        cache_grupos[nombre] = obj
        return obj

    def get_or_create_materia(codigo):
        if codigo in cache_materias:
            return cache_materias[codigo]
        obj = db.query(Materia).filter(Materia.codigo == codigo).first()
        if not obj:
            info  = mapa_materias_colores.get(codigo, {})
            obj   = Materia(
                codigo  = codigo,
                nombre  = info.get("nombre", "MATERIA NO REGISTRADA"),
                color   = info.get("color",  "#3b82f6"),
            )
            db.add(obj)
            db.flush()
            creados["materias"] += 1
        cache_materias[codigo] = obj
        return obj

    def get_or_create_docente(nombre_completo):
        if not nombre_completo or nombre_completo == "Sin asignar":
            return None
        if nombre_completo in cache_docentes:
            return cache_docentes[nombre_completo]
        obj = (
            db.query(Docente)
            .filter(
                (Docente.nombre + " " + Docente.apellido).ilike(f"%{nombre_completo}%")
            )
            .first()
        )
        if not obj:
            partes   = nombre_completo.strip().split()
            apellido = " ".join(partes[-2:]) if len(partes) >= 2 else ""
            nombre   = " ".join(partes[:-2]) if len(partes) >= 2 else nombre_completo
            obj      = Docente(nombre=nombre, apellido=apellido)
            db.add(obj)
            db.flush()
            creados["docentes"] += 1
        cache_docentes[nombre_completo] = obj
        return obj

    for aula_data in datos["aulas"]:
        aula = get_or_create_aula(aula_data["nombre"])

        for h in aula_data["horarios"]:
            grupo   = get_or_create_grupo(h["grupo"])
            materia = get_or_create_materia(h["codigo"])
            docente = get_or_create_docente(h.get("docente", ""))

            existe = db.query(Horario).filter(
                Horario.aula_id     == aula.id,
                Horario.dia_semana  == h["dia_semana"],
                Horario.hora_inicio == h["hora_inicio"],
            ).first()

            if existe:
                continue

            nuevo = Horario(
                dia_semana  = h["dia_semana"],
                hora_inicio = h["hora_inicio"],
                hora_fin    = h["hora_fin"],
                grupo_id    = grupo.id,
                materia_id  = materia.id,
                aula_id     = aula.id,
                docente_id  = docente.id if docente else None,
            )
            db.add(nuevo)
            insertados += 1

    db.commit()

    return JSONResponse(content={
        "ok":         True,
        "insertados": insertados,
        "creados":    creados,
    })