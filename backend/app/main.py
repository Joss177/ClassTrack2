import os
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, Docente
from .schemas import LoginRequest, DocenteCreate, DocenteResponse

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR.parent.parent / ".env")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = "HS256"
TOKEN_DAYS = 7

app = FastAPI()

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

ROLES = {
    1: "Administrador",
    2: "Laboratorista",
    3: "Docente",
}

# ─── Utilidades ──────────────────────────────────────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# ─── Páginas públicas ─────────────────────────────────────────────────────────

@app.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse(request=request, name="login.html")

@app.get("/register")
def register_page(request: Request):
    return templates.TemplateResponse(request=request, name="register.html")

# ─── Admin ───────────────────────────────────────────────────────────────────

@app.get("/admin/home")
def admin_home(request: Request):
    return templates.TemplateResponse(request=request, name="admin/home.html",
        context={"seccion": "home"})

@app.get("/admin/horarios")
def admin_horarios(request: Request):
    return templates.TemplateResponse(request=request, name="admin/horarios.html",
        context={"seccion": "horarios"})

@app.get("/admin/sheets")
def admin_sheets(request: Request):
    return templates.TemplateResponse(request=request, name="admin/sheets.html",
        context={"seccion": "sheets"})

@app.get("/admin/camaras")
def admin_camaras(request: Request):
    return templates.TemplateResponse(request=request, name="admin/camaras.html",
        context={"seccion": "camaras"})

@app.get("/admin/configuracion")
def admin_configuracion(request: Request):
    return templates.TemplateResponse(request=request, name="admin/configuracion.html",
        context={"seccion": "configuracion"})

# ─── Admin / Gestión ──────────────────────────────────────────────────────────

@app.get("/admin/gestion")
def admin_gestion(request: Request):
    return RedirectResponse(url="/admin/gestion/docentes")

@app.get("/admin/gestion/docentes")
def admin_gestion_docentes(request: Request):
    return templates.TemplateResponse(request=request, name="admin/gestion/docentes.html",
        context={"seccion": "gestion", "subseccion": "docentes"})

@app.get("/admin/gestion/materias")
def admin_gestion_materias(request: Request):
    return templates.TemplateResponse(request=request, name="admin/gestion/materias.html",
        context={"seccion": "gestion", "subseccion": "materias"})

@app.get("/admin/gestion/grupos")
def admin_gestion_grupos(request: Request):
    return templates.TemplateResponse(request=request, name="admin/gestion/grupos.html",
        context={"seccion": "gestion", "subseccion": "grupos"})

@app.get("/admin/gestion/aulas")
def admin_gestion_aulas(request: Request):
    return templates.TemplateResponse(request=request, name="admin/gestion/aulas.html",
        context={"seccion": "gestion", "subseccion": "aulas"})

# ─── Lab ─────────────────────────────────────────────────────────────────────

@app.get("/lab/home")
def lab_home(request: Request):
    return templates.TemplateResponse(request=request, name="lab/home.html",
        context={"seccion": "home"})

# ─── Docente ─────────────────────────────────────────────────────────────────

@app.get("/docente/home")
def docente_home(request: Request):
    return templates.TemplateResponse(request=request, name="docente/home.html",
        context={"seccion": "home"})

# ─── API ──────────────────────────────────────────────────────────────────────

@app.post("/api/login")
def api_login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.correo == data.correo).first()

    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    rol = ROLES.get(user.group_id, "Desconocido")

    token = create_token({
        "sub":    str(user.id),
        "correo": user.correo,
        "rol":    rol,
        "nombre": user.nombre_completo,
    })

    return JSONResponse(content={
        "ok":    True,
        "token": token,
        "usuario": {
            "id":     user.id,
            "nombre": user.nombre_completo,
            "correo": user.correo,
            "rol":    rol,
            "tema":   user.tema,
        }
    })

@app.post("/api/logout")
def api_logout():
    return JSONResponse(content={"ok": True, "mensaje": "Sesión cerrada"})

@app.get("/api/me")
def api_me(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")
    token = auth.split(" ", 1)[1]
    user = decode_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return JSONResponse(content={"ok": True, "usuario": user})

# ─── API Docentes ─────────────────────────────────────────────────────────────

@app.get("/api/docentes", response_model=list[DocenteResponse])
def get_docentes(db: Session = Depends(get_db)):
    return db.query(Docente).all()

@app.post("/api/docentes", response_model=DocenteResponse)
def crear_docente(data: DocenteCreate, db: Session = Depends(get_db)):
    docente = Docente(**data.model_dump())
    db.add(docente)
    db.commit()
    db.refresh(docente)
    return docente

@app.delete("/api/docentes/{docente_id}")
def eliminar_docente(docente_id: int, db: Session = Depends(get_db)):
    docente = db.query(Docente).filter(Docente.id == docente_id).first()
    if not docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    db.delete(docente)
    db.commit()
    return JSONResponse(content={"ok": True, "mensaje": "Docente eliminado"})

@app.put("/api/docentes/{docente_id}", response_model=DocenteResponse)
def editar_docente(docente_id: int, data: DocenteCreate, db: Session = Depends(get_db)):
    docente = db.query(Docente).filter(Docente.id == docente_id).first()
    if not docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    for key, value in data.model_dump().items():
        setattr(docente, key, value)
    db.commit()
    db.refresh(docente)
    return docente