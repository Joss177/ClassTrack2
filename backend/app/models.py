from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP, Text, Boolean, text
from .database import Base

class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String(200), nullable=False)
    correo          = Column(String(150), unique=True, nullable=False, index=True)
    password        = Column(String(255), nullable=False)
    group_id        = Column(Integer, ForeignKey("groups.id"), nullable=False, default=0)
    created         = Column(TIMESTAMP, server_default=text('now()'))
    modified        = Column(TIMESTAMP, server_default=text('now()'), onupdate=text('now()'))
    tema            = Column(String(20), default='claro')
    token           = Column(String(255), nullable=True)
    token_expira    = Column(String(50), nullable=True)

class Materia(Base):
    __tablename__ = "materias"

    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String(150), nullable=False)
    codigo      = Column(String(50), nullable=False)
    descripcion = Column(Text, nullable=True)
    color       = Column(String(7), default='#3b82f6')
    created     = Column(TIMESTAMP, server_default=text('now()'))
    modified    = Column(TIMESTAMP, server_default=text('now()'))

class Aula(Base):
    __tablename__ = "aulas"

    id           = Column(Integer, primary_key=True, index=True)
    nombre       = Column(String(100), nullable=False)
    capacidad    = Column(Integer, default=0)
    piso         = Column(Integer, default=0)
    edificio     = Column(String(50), default='')
    tiene_camara = Column(Boolean, nullable=False, default=False)
    created      = Column(TIMESTAMP, server_default=text('now()'))
    modified     = Column(TIMESTAMP, server_default=text('now()'))

class Docente(Base):
    __tablename__ = "docentes"

    id       = Column(Integer, primary_key=True, index=True)
    nombre   = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=True)
    email    = Column(String(150), nullable=True)

class Grupo(Base):
    __tablename__ = "grupos"

    id                   = Column(Integer, primary_key=True, index=True)
    nombre               = Column(String(50), nullable=False)
    cantidad_estudiantes = Column(Integer, default=0)
    created              = Column(TIMESTAMP, server_default=text('now()'))
    modified             = Column(TIMESTAMP, server_default=text('now()'))