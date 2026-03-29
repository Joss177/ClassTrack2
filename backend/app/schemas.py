from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    correo: EmailStr
    password: str