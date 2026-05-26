import json
import os
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import HTMLResponse, JSONResponse
from starlette.routing import Mount, Route

PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")
PEXELS_BASE_URL = "https://api.pexels.com"

# Em Vercel/serverless, stateless_http evita depender de sessão persistente entre invocações.
try:
    mcp = FastMCP("Pexels MCP", stateless_http=True, json_response=True)
except TypeError:  # compatibilidade com versões antigas do SDK MCP
    mcp = FastMCP("Pexels MCP")


def _limit_per_page(value: int, default: int, max_value: int) -> int:
    try:
        value = int(value)
    except (TypeError, ValueError):
        value = default
    return max(1, min(value, max_value))


async def _pexels_get(path: str, params: dict[str, Any]) -> dict[str, Any]:
    """Chamada compartilhada pela API HTTP e pelas tools MCP."""
    if not PEXELS_API_KEY:
        return {
            "error": "PEXELS_API_KEY não configurada.",
            "how_to_fix": "Adicione PEXELS_API_KEY nas Environment Variables do projeto na Vercel.",
        }

    async with httpx.AsyncClient(timeout=25) as client:
        response = await client.get(
            f"{PEXELS_BASE_URL}{path}",
            params=params,
            headers={"Authorization": PEXELS_API_KEY},
        )

    try:
        payload: dict[str, Any] = response.json()
    except ValueError:
        payload = {"raw": response.text}

    if response.status_code >= 400:
        return {
            "error": "A API do Pexels retornou erro.",
            "status_code": response.status_code,
            "details": payload,
        }

    return payload


@mcp.tool()
async def buscar_fotos(query: str, per_page: int = 10) -> str:
    """Busca fotos de alta qualidade no Pexels."""
    data = await _pexels_get(
        "/v1/search",
        {"query": query, "per_page": _limit_per_page(per_page, 10, 80)},
    )
    return json.dumps(data, ensure_ascii=False)


@mcp.tool()
async def buscar_videos(query: str, per_page: int = 5) -> str:
    """Busca vídeos de B-roll gratuitos no Pexels."""
    data = await _pexels_get(
        "/videos/search",
        {"query": query, "per_page": _limit_per_page(per_page, 5, 80)},
    )
    return json.dumps(data, ensure_ascii=False)


async def home(_: Request) -> HTMLResponse:
    configured = "configurada" if bool(PEXELS_API_KEY) else "não configurada"
    html = f"""
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pexels MCP na Vercel</title>
        <style>
          :root {{ color-scheme: dark; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }}
          body {{ margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at top, #25324d, #0b1020 55%, #050816); color: #f8fafc; }}
          main {{ width: min(900px, calc(100vw - 32px)); padding: 42px; border: 1px solid rgba(255,255,255,.12); border-radius: 28px; background: rgba(15,23,42,.74); box-shadow: 0 30px 80px rgba(0,0,0,.35); }}
          h1 {{ font-size: clamp(2rem, 5vw, 4rem); line-height: 1; margin: 0 0 16px; }}
          p {{ color: #cbd5e1; font-size: 1.05rem; }}
          code, pre {{ background: rgba(148,163,184,.14); border: 1px solid rgba(148,163,184,.18); border-radius: 12px; }}
          code {{ padding: 2px 6px; }}
          pre {{ overflow: auto; padding: 16px; color: #e2e8f0; }}
          .status {{ display: inline-flex; gap: 8px; align-items: center; padding: 8px 12px; border-radius: 999px; background: rgba(34,197,94,.14); border: 1px solid rgba(34,197,94,.25); color: #bbf7d0; }}
          a {{ color: #93c5fd; }}
        </style>
      </head>
      <body>
        <main>
          <span class="status">PEXELS_API_KEY: {configured}</span>
          <h1>Pexels MCP</h1>
          <p>Servidor MCP hospedável na Vercel com duas tools: <code>buscar_fotos</code> e <code>buscar_videos</code>.</p>
          <p>Endpoint MCP Streamable HTTP:</p>
          <pre>{"/mcp"}</pre>
          <p>Endpoints HTTP para testar no navegador:</p>
          <pre>/fotos?query=natureza&per_page=5\n/videos?query=cidade&per_page=3</pre>
        </main>
      </body>
    </html>
    """
    return HTMLResponse(html)


async def fotos_http(request: Request) -> JSONResponse:
    query = request.query_params.get("query", "natureza")
    per_page = _limit_per_page(request.query_params.get("per_page", 10), 10, 80)
    data = await _pexels_get("/v1/search", {"query": query, "per_page": per_page})
    return JSONResponse(data)


async def videos_http(request: Request) -> JSONResponse:
    query = request.query_params.get("query", "natureza")
    per_page = _limit_per_page(request.query_params.get("per_page", 5), 5, 80)
    data = await _pexels_get("/videos/search", {"query": query, "per_page": per_page})
    return JSONResponse(data)


# O SDK MCP atual expõe streamable_http_app(). O fallback mantém o código útil em versões antigas.
if hasattr(mcp, "streamable_http_app"):
    mcp_asgi_app = mcp.streamable_http_app()
elif hasattr(mcp, "app"):
    mcp_asgi_app = mcp.app
else:
    raise RuntimeError("Esta versão do pacote mcp não expõe app ASGI/HTTP compatível.")

app = Starlette(
    routes=[
        Route("/", endpoint=home, methods=["GET"]),
        Route("/fotos", endpoint=fotos_http, methods=["GET"]),
        Route("/videos", endpoint=videos_http, methods=["GET"]),
        Mount("/", app=mcp_asgi_app),
    ]
)
