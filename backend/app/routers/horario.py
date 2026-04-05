from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Horario
from ..schemas import HorarioCreate, HorarioResponse

router = APIRouter()

# ─── API Horarios ─────────────────────────────────────────────────────────────

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