import { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';

const initialFiles = {
  'app.js': `console.log('Hello from Stherysholl!');\n`,
  'main.py': `print('Hello from Python!')\n`,
  'README.md': `# Stherysholl\n\nSelf-hosted AI coding studio.\n`
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function App() {
  const [files, setFiles] = useState<Record<string, string>>(initialFiles);
  const [activeFile, setActiveFile] = useState('app.js');
  const [prompt, setPrompt] = useState('Create a REST API in Node.js that returns a greeting.');
  const [language, setLanguage] = useState('javascript');
  const [chat, setChat] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const activeCode = files[activeFile] ?? '';

  const fileNames = useMemo(() => Object.keys(files), [files]);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        const json = await res.json();
        console.log('API health:', json);
      } catch (error) {
        console.warn('API not available yet:', error);
      }
    }

    void checkHealth();
  }, []);

  const updateActiveFile = (nextCode: string) => {
    setFiles((prev) => ({ ...prev, [activeFile]: nextCode }));
  };

  const generateCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, language })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to generate code.');
      }

      const code = json.code || '';
      const nextName = language === 'python' ? 'main.py' : 'app.js';

      setFiles((prev) => ({ ...prev, [nextName]: code }));
      setActiveFile(nextName);
      setChat((prev) => [...prev, { role: 'assistant', text: code }]);
    } catch (error) {
      setChat((prev) => [...prev, { role: 'assistant', text: error instanceof Error ? error.message : 'Unexpected error' }]);
    } finally {
      setLoading(false);
    }
  };

  const runCode = async () => {
    setLoading(true);
    setOutput('Running...');

    try {
      const res = await fetch(`${API_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activeCode, language: activeFile.endsWith('.py') ? 'python' : 'javascript' })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Execution failed.');
      }

      setOutput(`${json.stdout || ''}${json.stderr ? `\nERROR:\n${json.stderr}` : ''}`);
    } catch (error) {
      setOutput(error instanceof Error ? error.message : 'Execution error');
    } finally {
      setLoading(false);
    }
  };

  const askQuestion = async () => {
    setLoading(true);
    setChat((prev) => [...prev, { role: 'user', text: prompt }]);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context: 'Answer as a senior developer and be concise.' })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch answer.');
      setChat((prev) => [...prev, { role: 'assistant', text: json.answer || 'No answer.' }]);
    } catch (error) {
      setChat((prev) => [...prev, { role: 'assistant', text: error instanceof Error ? error.message : 'Unexpected error' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Stherysholl</div>
        <div className="nav-label">Files</div>
        <ul className="file-list">
          {fileNames.map((fileName) => (
            <li key={fileName}>
              <button className={fileName === activeFile ? 'active' : ''} onClick={() => setActiveFile(fileName)}>
                {fileName}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="badge">Online coding workspace</span>
          </div>
          <div className="toolbar-actions">
            <button onClick={runCode} disabled={loading}>Run</button>
            <button className="primary" onClick={generateCode} disabled={loading}>Generate</button>
          </div>
        </header>

        <div className="editor-panel">
          <Editor
            height="420px"
            defaultLanguage={activeFile.endsWith('.py') ? 'python' : 'javascript'}
            language={activeFile.endsWith('.py') ? 'python' : 'javascript'}
            theme="vs-dark"
            value={activeCode}
            onChange={(value) => updateActiveFile(value ?? '')}
          />
        </div>

        <div className="panels">
          <section className="panel prompt-panel">
            <h3>Prompt</h3>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} />
            <div className="prompt-row">
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="bash">Bash</option>
              </select>
              <button onClick={askQuestion} disabled={loading}>Ask</button>
            </div>
          </section>

          <section className="panel output-panel">
            <h3>Console</h3>
            <pre>{output || 'No output yet.'}</pre>
          </section>
        </div>

        <section className="panel chat-panel">
          <h3>Chat</h3>
          <div className="chat-list">
            {chat.length === 0 && <p>No messages yet.</p>}
            {chat.map((entry, idx) => (
              <div key={`${entry.role}-${idx}`} className={`chat-bubble ${entry.role}`}>
                {entry.text}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
