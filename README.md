# O Código da Agulha — Curso de Bordado com OpenAI

Site criado a partir do HTML de referência enviado, com módulos expandidos de bordado, leitor de voz, simulador em canvas e OpenAI Lab.

## Recursos

- Curso expandido com módulos de bordado do básico ao avançado.
- Leitor de voz no navegador usando Web Speech API.
- Pesquisa e navegação lateral.
- Simulador visual de pontos em canvas.
- OpenAI Lab com geração de projeto, diagnóstico técnico, plano de estudo, quiz e expansão de módulos.
- Backend seguro para não expor `OPENAI_API_KEY` no navegador.
- Compatível com execução local em Node.js e deploy na Vercel.

## Rodar localmente

```bash
cp .env.example .env
npm start
```

Abra:

```text
http://localhost:3000
```

## Variáveis de ambiente

```bash
OPENAI_API_KEY="sua_chave_aqui"
OPENAI_MODEL="gpt-5.5"
```

## Deploy na Vercel

Configure `OPENAI_API_KEY` e `OPENAI_MODEL` nas variáveis de ambiente da Vercel. A função serverless fica em `api/atelier.js`.

Último disparo de deploy via Git: 2026-05-25.

## Segurança

Nunca coloque a chave da OpenAI no `index.html` ou em JavaScript público. Todas as chamadas passam pelo backend.
