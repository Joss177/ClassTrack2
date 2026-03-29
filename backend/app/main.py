import os
import bcrypt
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .schemas import LoginRequest

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

ROLES = {
    1: "Administrador",
    2: "Laboratorista",
    3: "Docente",
}

# ─── Páginas ────────────────────────────────────────────────────────────────

@app.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse(request=request, name="login.html")

@app.get("/register")
def register_page(request: Request):
    return templates.TemplateResponse(request=request, name="register.html")

@app.get("/admin/home")
def admin_home(request: Request):
    return templates.TemplateResponse(request=request, name="admin/home.html")

@app.get("/lab/home")
def lab_home(request: Request):
    return templates.TemplateResponse(request=request, name="lab/home.html")

@app.get("/docente/home")
def docente_home(request: Request):
    return templates.TemplateResponse(request=request, name="docente/home.html")

# ─── API Login ──────────────────────────────────────────────────────────────

@app.post("/api/login")
def api_login(data: LoginRequest, db: Session = Depends(get_db)):
    # 1. Buscar usuario por correo
    user = db.query(User).filter(User.correo == data.correo).first()

    # 2. Verificar existencia y contraseña
    #    Usamos el mismo mensaje genérico para no revelar si el correo existe
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    # 3. Obtener nombre del rol
    rol = ROLES.get(user.group_id, "Desconocido")

    # 4. Respuesta (sin exponer la contraseña)
    return JSONResponse(content={
        "ok": True,
        "mensaje": f"Bienvenido, {user.nombre_completo}",
        "usuario": {
            "id": user.id,
            "nombre": user.nombre_completo,
            "correo": user.correo,
            "rol": rol,
            "tema": user.tema,
        }
    })