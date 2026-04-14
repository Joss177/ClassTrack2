from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import CamaraCreate
from app.models import Camara, Aula

app = FastAPI()

templates = Jinja2Templates(directory="app/templates")


# ─── Vista de Cámaras ────────────────────────────────────────────────
@app.get("/camaras", response_class=HTMLResponse)
async def camaras_index(request: Request, db: Session = Depends(get_db)):

    camaras = db.query(Camara).all()
    aulas = db.query(Aula).all()

    return templates.TemplateResponse("admin/camaras.html", {
        "request": request,
        "camaras": camaras,
        "aulas": aulas
    })
    

@app.post("/api/camaras")
async def crear_camara(camara: CamaraCreate, db: Session = Depends(get_db)):

    aula = db.query(Aula).filter(Aula.id == camara.aula_id).first()
    if not aula:
        raise HTTPException(status_code=404, detail="El aula no existe")

    nueva = Camara(
        aula_id=camara.aula_id,
        estado=camara.estado or "activa"
    )

    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    return {
        "id":     nueva.id,
        "estado": nueva.estado,
        "aula": {
            "nombre":    aula.nombre,
            "edificio":  aula.edificio,
            "piso":      aula.piso,
            "capacidad": aula.capacidad
        }
    }