from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP, text
from .database import Base

class User(Base):
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String(200), nullable=False)
    correo       = Column(String(150), unique=True, nullable=False, index=True)
    password     = Column(String(255), nullable=False)
    group_id     = Column(Integer, ForeignKey("groups.id"), nullable=False, default=0)
    created      = Column(TIMESTAMP, server_default=text('now()'))
    modified     = Column(TIMESTAMP, server_default=text('now()'), onupdate=text('now()'))
    tema         = Column(String(20), default='claro')
    token        = Column(String(255), nullable=True)
    token_expira = Column(String(50), nullable=True)