from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# ─── Auth ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    correo: EmailStr
    password: str

# ─── Materias ─────────────────────────────────────────────────────────────────

class MateriaBase(BaseModel):
    nombre:      str
    codigo:      str
    descripcion: Optional[str] = None
    color:       Optional[str] = '#3b82f6'

class MateriaCreate(MateriaBase):
    pass

class MateriaResponse(MateriaBase):
    id:       int
    created:  Optional[datetime] = None
    modified: Optional[datetime] = None

    class Config:
        from_attributes = True

# ─── Aulas ───────────────────────────────────────────────────────────────────

class AulaBase(BaseModel):
    nombre:       str
    capacidad:    Optional[int]  = 0
    piso:         Optional[int]  = 0
    edificio:     Optional[str]  = ''
    tiene_camara: Optional[bool] = False

class AulaCreate(AulaBase):
    pass

class AulaResponse(AulaBase):
    id:       int
    created:  Optional[datetime] = None
    modified: Optional[datetime] = None

    class Config:
        from_attributes = True

# ─── Docentes ─────────────────────────────────────────────────────────────────

class DocenteBase(BaseModel):
    nombre:   str
    apellido: Optional[str] = None
    email:    Optional[str] = None

class DocenteCreate(DocenteBase):
    pass

class DocenteResponse(DocenteBase):
    id: int

    class Config:
        from_attributes = True

# ─── Grupos ───────────────────────────────────────────────────────────────────

class GrupoBase(BaseModel):
    nombre:               str
    cantidad_estudiantes: Optional[int] = 0

class GrupoCreate(GrupoBase):
    pass

class GrupoResponse(GrupoBase):
    id:       int
    created:  Optional[datetime] = None
    modified: Optional[datetime] = None

    class Config:
        from_attributes = True