"""Page routes rendering the dashboard."""

from fastapi import APIRouter, Request

from pinboard.shell import druids

pages = APIRouter()


@pages.get("/")
async def main_page(request: Request):
    return druids.templates.TemplateResponse(request, "main.jinja2", {})
