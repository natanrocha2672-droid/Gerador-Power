# Pexels MCP na Vercel

Servidor MCP em Python para buscar fotos e vídeos no Pexels, pronto para deploy na Vercel.

## Arquivos principais

- `api/index.py`: app ASGI com servidor MCP e endpoints HTTP de teste.
- `requirements.txt`: dependências Python.
- `vercel.json`: configuração de função/rewrite para Vercel.
- `.env.example`: exemplo da variável de ambiente necessária.

## Variável obrigatória

Configure `PEXELS_API_KEY` no projeto da Vercel.

## Endpoints

- Página inicial: `/`
- MCP Streamable HTTP: `/mcp`
- Teste de fotos: `/fotos?query=natureza&per_page=5`
- Teste de vídeos: `/videos?query=cidade&per_page=3`

## Tools MCP

- `buscar_fotos(query: str, per_page: int = 10)`
- `buscar_videos(query: str, per_page: int = 5)`

## Deploy via GitHub

Este branch pode ser importado/conectado na Vercel. Se o projeto já estiver conectado ao GitHub, cada push gera Preview Deploy automaticamente.
