from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import bcrypt
import jwt
import os
from datetime import datetime, timedelta, timezone

from ..database import get_db
from ..models import User
from ..schemas import LoginRequest

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = "HS256"
TOKEN_DAYS = 7

ROLES = {
    1: "Administrador",
    2: "Laboratorista",
    3: "Docente",
}

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

@router.post("/api/login")
def api_login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.correo == data.correo).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    rol   = ROLES.get(user.group_id, "Desconocido")
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

@router.post("/api/logout")
def api_logout():
    return JSONResponse(content={"ok": True, "mensaje": "Sesión cerrada"})

@router.get("/api/me")
def api_me(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")
    token = auth.split(" ", 1)[1]
    user  = decode_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return JSONResponse(content={"ok": True, "usuario": user})