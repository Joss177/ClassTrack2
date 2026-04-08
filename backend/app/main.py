import os
from pathlib import Path
from dotenv import load_dotenv

# ─── Cargar .env PRIMERO, antes de importar routers ──────────────────────────
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent.parent / ".env")

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.routers.chatbot_route import router as chatbot_router
from .routers import admin, auth, lab, docente, horario

app = FastAPI()

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# ─── Páginas públicas ─────────────────────────────────────────────────────────

@app.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse(request=request, name="login.html")

@app.get("/register")
def register_page(request: Request):
    return templates.TemplateResponse(request=request, name="register.html")

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(chatbot_router)
app.include_router(auth.router)
app.include_router(horario.router)
app.include_router(admin.router)
app.include_router(lab.router)
app.include_router(docente.router)