# Stherysholl

Stherysholl is a self-hosted AI coding studio that combines:

- a chat interface for questions and code generation
- a Monaco-based online editor
- direct browser access to external pages through the backend
- local LLM support via Ollama
- in-browser code execution for JavaScript and Python
- no image generation workflow

## Stack

- Frontend: React + Vite + Monaco Editor
- Backend: Node.js + Express + TypeScript
- Local AI: Ollama
- Execution: server-side Node/Python runtime
- Runtime support: Docker Compose

## Quick start

1. Copy `.env.example` to `.env`
2. Install dependencies:

```bash
npm install
```

3. Start all services:

```bash
npm run dev
```

4. Open http://localhost:5173

## Services

- Web frontend: http://localhost:5173
- API server: http://localhost:4000
- Ollama (if enabled): http://localhost:11434

## Features

- Ask coding questions and receive answers
- Generate code in any language
- Open and edit code files in-browser
- Run JavaScript and Python snippets on the server
- Fetch and summarize external web pages through the backend
- Run completely self-hosted without requiring external paid APIs

## Environment variables

See `.env.example` for configuration.

## Deployment

This project is ready for Docker deployment via `docker-compose.yml`.

## License

MIT
