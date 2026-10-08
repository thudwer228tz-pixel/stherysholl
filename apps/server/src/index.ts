import 'dotenv/config';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const app = express();
const port = Number(process.env.PORT || 4000);
const run = promisify(exec);

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'stherysholl-api', timestamp: new Date().toISOString() });
});

app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { prompt, context = '' } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const model = process.env.OLLAMA_MODEL || 'llama3.1';
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    const payload = {
      model,
      stream: false,
      prompt: `${context ? `Context:\n${context}\n\n` : ''}User question:\n${prompt}`
    };

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'Local LLM is unavailable.', details: text });
    }

    const data = (await response.json()) as { response?: string };

    res.json({
      answer: data.response || 'I did not get a response from the model.',
      source: 'ollama'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to answer the prompt.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/generate-code', async (req: Request, res: Response) => {
  try {
    const { prompt, language = 'javascript' } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const model = process.env.OLLAMA_MODEL || 'llama3.1';
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    const system = `You are a senior software engineer. Generate code only. Do not include Markdown fences, explanations, or comments unless the user explicitly asks. Use the language: ${language}.`;

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        system,
        prompt
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'Code generation failed.', details: text });
    }

    const data = (await response.json()) as { response?: string };
    res.json({ code: data.response || '', language });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to generate code.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/run', async (req: Request, res: Response) => {
  try {
    const { language = 'javascript', code } = req.body ?? {};

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code is required.' });
    }

    const timeoutMs = Number(process.env.CODE_TIMEOUT_MS || 15000);

    if (language === 'python') {
      const { stdout, stderr } = await run(`python - <<'PY'\n${code}\nPY`, { timeout: timeoutMs });
      return res.json({ stdout: stdout || '', stderr: stderr || '', language });
    }

    if (language === 'javascript') {
      const { stdout, stderr } = await run(`node - <<'JS'\n${code}\nJS`, { timeout: timeoutMs });
      return res.json({ stdout: stdout || '', stderr: stderr || '', language });
    }

    return res.status(400).json({ error: `Language '${language}' is not supported yet.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Execution failed.', details: message });
  }
});

app.post('/api/fetch-page', async (req: Request, res: Response) => {
  try {
    const { url } = req.body ?? {};

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required.' });
    }

    const allowed = (process.env.ALLOWED_FETCH_DOMAINS || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const hostname = new URL(url).hostname.toLowerCase();
    const isAllowed = allowed.length === 0 || allowed.includes(hostname) || allowed.some((domain) => hostname.endsWith(`.${domain}`));

    if (!isAllowed) {
      return res.status(403).json({ error: 'Domain is not allowed by the self-hosted policy.' });
    }

    const response = await fetch(url, { headers: { 'User-Agent': 'stherysholl/1.0' } });
    const html = await response.text();

    res.json({
      title: html.match(/<title>(.*?)<\/title>/i)?.[1] || 'Untitled page',
      url,
      text: html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' '),
      status: response.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch the page.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.listen(port, () => {
  console.log(`Stherysholl API is running on http://localhost:${port}`);
});
