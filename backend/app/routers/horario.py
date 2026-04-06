from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

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