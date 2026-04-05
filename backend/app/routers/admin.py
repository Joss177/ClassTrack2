from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from pathlib import Path

from ..database import get_db
from ..models import Docente, Materia, Grupo, Aula, Horario
from ..schemas import (
    DocenteCreate,  DocenteResponse,
    MateriaCreate,  MateriaResponse,
    GrupoCreate,    GrupoResponse,
    AulaCreate,     AulaResponse,
    HorarioCreate,  HorarioResponse,
)

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# ─── Vistas ───────────────────────────────────────────────────────────────────

@router.get("/admin/home")
def admin_home(request: Request):
    return templates.TemplateResponse(request=request, name="admin/home.html",
        context={"seccion": "home"})

@router.get("/admin/horarios")
def admin_horarios(request: Request):
    return RedirectResponse(url="/admin/horarios/aulas")

@router.get("/admin/horarios/aulas")
def admin_horario_aulas(request: Request):
    return templates.TemplateResponse(request=request, name="admin/horario/horario_aula.html",
        context={"seccion": "horarios", "subseccion": "horario_aulas"})

@router.get("/admin/horarios/docentes")
def admin_horario_docentes(request: Request):
    return templates.TemplateResponse(request=request, name="admin/horario/horario_docente.html",
        context={"seccion": "horarios", "subseccion": "horario_docentes"})

@router.get("/admin/horarios/grupos")
def admin_horario_grupos(request: Request):
    return templates.TemplateResponse(request=request, name="admin/horario/horario_grupo.html",
        context={"seccion": "horarios", "subseccion": "horario_grupos"})

@router.get("/admin/sheets")
def admin_sheets(request: Request):
    return templates.TemplateResponse(request=request, name="admin/sheets.html",
        context={"seccion": "sheets"})

@router.get("/admin/camaras")
def admin_camaras(request: Request):
    return templates.TemplateResponse(request=request, name="admin/camaras.html",
        context={"seccion": "camaras"})

@router.get("/admin/configuracion")
def admin_configuracion(request: Request):
    return templates.TemplateResponse(request=request, name="admin/configuracion.html",
        context={"seccion": "configuracion"})

@router.get("/admin/gestion")
def admin_gestion(request: Request):
    return RedirectResponse(url="/admin/gestion/docentes")

@router.get("/admin/gestion/docentes")
def admin_gestion_docentes(request: Request, db: Session = Depends(get_db)):
    docentes = db.query(Docente).all()
    return templates.TemplateResponse(request=request, name="admin/gestion/docentes.html",
        context={"seccion": "gestion", "subseccion": "docentes", "docentes": docentes})

@router.get("/admin/gestion/materias")
def admin_gestion_materias(request: Request, db: Session = Depends(get_db)):
    materias = db.query(Materia).all()
    return templates.TemplateResponse(request=request, name="admin/gestion/materias.html",
        context={"seccion": "gestion", "subseccion": "materias", "materias": materias})

@router.get("/admin/gestion/grupos")
def admin_gestion_grupos(request: Request, db: Session = Depends(get_db)):
    grupos = db.query(Grupo).all()
    return templates.TemplateResponse(request=request, name="admin/gestion/grupos.html",
        context={"seccion": "gestion", "subseccion": "grupos", "grupos": grupos})

@router.get("/admin/gestion/aulas")
def admin_gestion_aulas(request: Request, db: Session = Depends(get_db)):
    aulas = db.query(Aula).all()
    return templates.TemplateResponse(request=request, name="admin/gestion/aulas.html",
        context={"seccion": "gestion", "subseccion": "aulas", "aulas": aulas})

# ─── API Docentes ─────────────────────────────────────────────────────────────

@router.get("/api/docentes", response_model=list[DocenteResponse])
def get_docentes(db: Session = Depends(get_db)):
    return db.query(Docente).all()

@router.post("/api/docentes", response_model=DocenteResponse)
def crear_docente(data: DocenteCreate, db: Session = Depends(get_db)):
    docente = Docente(**data.model_dump())
    db.add(docente)
    db.commit()
    db.refresh(docente)
    return docente

@router.put("/api/docentes/{id}", response_model=DocenteResponse)
def editar_docente(id: int, data: DocenteCreate, db: Session = Depends(get_db)):
    docente = db.query(Docente).filter(Docente.id == id).first()
    if not docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    for k, v in data.model_dump().items():
        setattr(docente, k, v)
    db.commit()
    db.refresh(docente)
    return docente

@router.delete("/api/docentes/{id}")
def eliminar_docente(id: int, db: Session = Depends(get_db)):
    docente = db.query(Docente).filter(Docente.id == id).first()
    if not docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    db.delete(docente)
    db.commit()
    return JSONResponse(content={"ok": True})

# ─── API Materias ─────────────────────────────────────────────────────────────

@router.get("/api/materias", response_model=list[MateriaResponse])
def get_materias(db: Session = Depends(get_db)):
    return db.query(Materia).all()

@router.post("/api/materias", response_model=MateriaResponse)
def crear_materia(data: MateriaCreate, db: Session = Depends(get_db)):
    materia = Materia(**data.model_dump())
    db.add(materia)
    db.commit()
    db.refresh(materia)
    return materia

@router.put("/api/materias/{id}", response_model=MateriaResponse)
def editar_materia(id: int, data: MateriaCreate, db: Session = Depends(get_db)):
    materia = db.query(Materia).filter(Materia.id == id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    for k, v in data.model_dump().items():
        setattr(materia, k, v)
    db.commit()
    db.refresh(materia)
    return materia

@router.delete("/api/materias/{id}")
def eliminar_materia(id: int, db: Session = Depends(get_db)):
    materia = db.query(Materia).filter(Materia.id == id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    db.delete(materia)
    db.commit()
    return JSONResponse(content={"ok": True})

# ─── API Grupos ───────────────────────────────────────────────────────────────

@router.get("/api/grupos", response_model=list[GrupoResponse])
def get_grupos(db: Session = Depends(get_db)):
    return db.query(Grupo).all()

@router.post("/api/grupos", response_model=GrupoResponse)
def crear_grupo(data: GrupoCreate, db: Session = Depends(get_db)):
    grupo = Grupo(**data.model_dump())
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    return grupo

@router.put("/api/grupos/{id}", response_model=GrupoResponse)
def editar_grupo(id: int, data: GrupoCreate, db: Session = Depends(get_db)):
    grupo = db.query(Grupo).filter(Grupo.id == id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    for k, v in data.model_dump().items():
        setattr(grupo, k, v)
    db.commit()
    db.refresh(grupo)
    return grupo

@router.delete("/api/grupos/{id}")
def eliminar_grupo(id: int, db: Session = Depends(get_db)):
    grupo = db.query(Grupo).filter(Grupo.id == id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    db.delete(grupo)
    db.commit()
    return JSONResponse(content={"ok": True})

# ─── API Aulas ────────────────────────────────────────────────────────────────

@router.get("/api/aulas", response_model=list[AulaResponse])
def get_aulas(db: Session = Depends(get_db)):
    return db.query(Aula).all()

@router.post("/api/aulas", response_model=AulaResponse)
def crear_aula(data: AulaCreate, db: Session = Depends(get_db)):
    aula = Aula(**data.model_dump())
    db.add(aula)
    db.commit()
    db.refresh(aula)
    return aula

@router.put("/api/aulas/{id}", response_model=AulaResponse)
def editar_aula(id: int, data: AulaCreate, db: Session = Depends(get_db)):
    aula = db.query(Aula).filter(Aula.id == id).first()
    if not aula:
        raise HTTPException(status_code=404, detail="Aula no encontrada")
    for k, v in data.model_dump().items():
        setattr(aula, k, v)
    db.commit()
    db.refresh(aula)
    return aula

@router.delete("/api/aulas/{id}")
def eliminar_aula(id: int, db: Session = Depends(get_db)):
    aula = db.query(Aula).filter(Aula.id == id).first()
    if not aula:
        raise HTTPException(status_code=404, detail="Aula no encontrada")
    db.delete(aula)
    db.commit()
    return JSONResponse(content={"ok": True})

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