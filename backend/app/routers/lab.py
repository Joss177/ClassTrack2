from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from pathlib import Path

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

@router.get("/lab/home")
def lab_home(request: Request):
    return templates.TemplateResponse(request=request, name="lab/home.html",
        context={"seccion": "home"})