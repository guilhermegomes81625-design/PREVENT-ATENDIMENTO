import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // In-memory data store for the server instance
  let attendantsData = {
    attendants: [
      { id: 'att-1', name: 'Atendimento Geral', phone: '5511966604328', active: true },
      { id: 'att-2', name: 'Central de Agendamento', phone: '5511977771234', active: true },
      { id: 'att-3', name: 'Suporte & Dúvidas', phone: '5511988885678', active: true },
    ],
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  let rotationIndex = 0;
  let sessionAuthed = false;

  // Availability endpoint
  app.get('/api/availability', (_req, res) => {
    const active = attendantsData.attendants.filter((a) => a.active);
    if (active.length === 0) {
      return res.status(503).json({ error: 'Nenhum atendente disponível no momento.' });
    }
    res.json({ phone: active[0].phone });
  });

  // Dynamic Round-robin routing endpoint
  app.post('/api/route', (_req, res) => {
    const active = attendantsData.attendants.filter((a) => a.active);
    if (active.length === 0) {
      return res.status(503).json({ error: 'Nenhum atendente ativo no momento.' });
    }
    const selected = active[rotationIndex % active.length];
    rotationIndex = (rotationIndex + 1) % active.length;
    res.json({ phone: selected.phone, name: selected.name });
  });

  // Session endpoints
  app.get('/api/session', (_req, res) => {
    res.json({ authenticated: sessionAuthed });
  });

  app.post('/api/session', (req, res) => {
    const { password } = req.body || {};
    // Accept "admin", "admin123", "prevent", or "prevent2026"
    if (
      password === 'admin' ||
      password === 'admin123' ||
      password === 'prevent' ||
      password === 'prevent2026'
    ) {
      sessionAuthed = true;
      return res.json({ authenticated: true });
    }
    return res.status(401).json({ error: 'Senha incorreta. Tente "admin" ou "admin123".' });
  });

  app.delete('/api/session', (_req, res) => {
    sessionAuthed = false;
    res.json({ authenticated: false });
  });

  // Admin attendants management endpoints
  app.get('/api/admin', (_req, res) => {
    if (!sessionAuthed) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }
    res.json(attendantsData);
  });

  app.put('/api/admin', (req, res) => {
    if (!sessionAuthed) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }
    const { attendants } = req.body || {};
    if (Array.isArray(attendants)) {
      attendantsData = {
        attendants,
        version: (attendantsData.version || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      return res.json(attendantsData);
    }
    return res.status(400).json({ error: 'Dados inválidos.' });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
