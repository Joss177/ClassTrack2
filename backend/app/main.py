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
from .models import User
from .schemas import LoginRequest

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = "HS256"
TOKEN_DAYS = 7

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

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

def get_current_user_from_cookie_or_header(request: Request) -> dict | None:
    # Intentar desde header Authorization
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1]
        return decode_token(token)
    # Intentar desde cookie HttpOnly
    token = request.cookies.get("access_token")
    if token:
        return decode_token(token)
    return None

def require_auth(request: Request) -> dict:
    user = get_current_user_from_cookie_or_header(request)
    if not user:
        raise HTTPException(
            status_code=302,
            headers={"Location": "/login"}
        )
    return user

# ─── Páginas públicas ─────────────────────────────────────────────────────────

@app.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse(request=request, name="login.html")

@app.get("/register")
def register_page(request: Request):
    return templates.TemplateResponse(request=request, name="register.html")

# ─── Páginas protegidas ───────────────────────────────────────────────────────

@app.get("/admin/home")
def admin_home(request: Request, user: dict = Depends(require_auth)):
    return templates.TemplateResponse(request=request, name="admin/home.html")

@app.get("/lab/home")
def lab_home(request: Request, user: dict = Depends(require_auth)):
    return templates.TemplateResponse(request=request, name="lab/home.html")

@app.get("/docente/home")
def docente_home(request: Request, user: dict = Depends(require_auth)):
    return templates.TemplateResponse(request=request, name="docente/home.html")

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

    response = JSONResponse(content={
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

    # Guardar token en cookie HttpOnly para que el servidor pueda proteger rutas
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=TOKEN_DAYS * 24 * 3600,
        samesite="lax"
    )

    return response

@app.post("/api/logout")
def api_logout():
    response = JSONResponse(content={"ok": True, "mensaje": "Sesión cerrada"})
    response.delete_cookie("access_token")
    return response

@app.get("/api/me")
def api_me(request: Request):
    user = get_current_user_from_cookie_or_header(request)
    if not user:
        raise HTTPException(status_code=401, detail="No autenticado")
    return JSONResponse(content={"ok": True, "usuario": user})