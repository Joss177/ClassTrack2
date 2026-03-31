from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from pathlib import Path

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

@router.get("/docente/home")
def docente_home(request: Request):
    return templates.TemplateResponse(request=request, name="docente/home.html",
        context={"seccion": "home"})