from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import bcrypt
import jwt
import os

from ..database import get_db
from ..models import User

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = "HS256"

# ─── Schemas ──────────────────────────────────────────────────────────────────

class InfoUpdate(BaseModel):
    nombre_completo: str
    correo:          str

class PasswordUpdate(BaseModel):
    password: str

# ─── Helper: decodificar token y obtener usuario ──────────────────────────────

def get_usuario_desde_request(request: Request, db: Session) -> User:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")

    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token sin usuario")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return user

# ─── PUT /api/me/info — actualizar nombre y correo ────────────────────────────

@router.put("/api/me/info")
def actualizar_info(
    data: InfoUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_usuario_desde_request(request, db)

    # Verificar que el correo no esté en uso por otro usuario
    existente = db.query(User).filter(
        User.correo == data.correo,
        User.id != user.id
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El correo ya está en uso")

    user.nombre_completo = data.nombre_completo.strip()
    user.correo          = data.correo.strip()
    db.commit()
    db.refresh(user)

    return JSONResponse(content={
        "ok": True,
        "usuario": {
            "id":     user.id,
            "nombre": user.nombre_completo,
            "correo": user.correo,
        }
    })

# ─── PUT /api/me/password — cambiar contraseña ────────────────────────────────

@router.put("/api/me/password")
def cambiar_password(
    data: PasswordUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_usuario_desde_request(request, db)

    if not data.password or len(data.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user.password = hashed
    db.commit()

    return JSONResponse(content={"ok": True, "mensaje": "Contraseña actualizada"})