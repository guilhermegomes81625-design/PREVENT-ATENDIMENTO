const initial = [{ id: 'att-1', name: 'Atendimento Geral', phone: '5511966604328', active: true }];
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { ...headers, ...extra } });
const hash = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');

export async function onRequest({ request, env }) {
  const path = new URL(request.url).pathname;
  const method = request.method;
  if (!env.DB) return json({ error: 'Banco de dados ainda não configurado.' }, 503);
  try {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS atendimento_state (id INTEGER PRIMARY KEY, data TEXT NOT NULL, rotation INTEGER NOT NULL DEFAULT 0)').run();
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS atendimento_sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL)').run();
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS atendimento_attempts (ip TEXT PRIMARY KEY, count INTEGER NOT NULL, reset INTEGER NOT NULL)').run();
    await env.DB.prepare('INSERT OR IGNORE INTO atendimento_state (id,data) VALUES (1,?)').bind(JSON.stringify({ attendants: initial, version: 1, updatedAt: new Date().toISOString() })).run();
    const now = Date.now();
    const cookie = request.headers.get('Cookie')?.match(/(?:^|;\s*)atendimento_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    const session = cookie ? await env.DB.prepare('SELECT expires FROM atendimento_sessions WHERE token=? AND expires>?').bind(await hash(cookie), now).first() : null;
    const authenticated = Boolean(session);
    if (!['GET', 'HEAD'].includes(method)) {
      if (request.headers.get('Origin') !== new URL(request.url).origin) return json({ error: 'Origem inválida.' }, 403);
    }
    if (path === '/api/session') {
      if (method === 'GET') return json({ authenticated });
      if (method === 'DELETE') {
        if (cookie) await env.DB.prepare('DELETE FROM atendimento_sessions WHERE token=?').bind(await hash(cookie)).run();
        return json({ authenticated: false }, 200, { 'Set-Cookie': 'atendimento_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0' });
      }
      if (method === 'POST') {
        if (!env.ADMIN_PASSWORD) return json({ error: 'Configure ADMIN_PASSWORD nos segredos do Cloudflare para ativar o painel.' }, 503);
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        await env.DB.prepare('INSERT INTO atendimento_attempts (ip,count,reset) VALUES (?,1,?) ON CONFLICT(ip) DO UPDATE SET count=CASE WHEN reset<? THEN 1 ELSE count+1 END, reset=CASE WHEN reset<? THEN excluded.reset ELSE reset END').bind(ip, now + 900000, now, now).run();
        const attempt = await env.DB.prepare('SELECT count FROM atendimento_attempts WHERE ip=?').bind(ip).first();
        if (attempt.count > 10) return json({ error: 'Muitas tentativas. Aguarde 15 minutos.' }, 429);
        const body = await request.json();
        if (typeof body.password !== 'string' || await hash(body.password) !== await hash(env.ADMIN_PASSWORD)) return json({ error: 'Senha incorreta.' }, 401);
        const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
        await env.DB.batch([
          env.DB.prepare('DELETE FROM atendimento_sessions WHERE expires<?').bind(now),
          env.DB.prepare('INSERT INTO atendimento_sessions (token,expires) VALUES (?,?)').bind(await hash(token), now + 28800000),
          env.DB.prepare('DELETE FROM atendimento_attempts WHERE ip=?').bind(ip),
        ]);
        return json({ authenticated: true }, 200, { 'Set-Cookie': `atendimento_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800` });
      }
    }
    if (path === '/api/admin') {
      if (!authenticated) return json({ error: 'Não autorizado.' }, 401);
      if (method === 'GET') {
        const row = await env.DB.prepare('SELECT data FROM atendimento_state WHERE id=1').first();
        return json(JSON.parse(row.data));
      }
      if (method === 'PUT') {
        const body = await request.json();
        const list = body.attendants;
        if (!Array.isArray(list) || list.length > 100 || list.some(a => !a || typeof a.id !== 'string' || a.id.length > 100 || typeof a.name !== 'string' || !a.name.trim() || a.name.length > 80 || typeof a.phone !== 'string' || !/^55[1-9]{2}9\d{8}$/.test(a.phone) || typeof a.active !== 'boolean') || new Set(list.map(a => a.id)).size !== list.length) return json({ error: 'Dados de atendentes inválidos.' }, 400);
        const cleaned = list.map(({ id, name, phone, active }) => ({ id, name: name.trim(), phone, active }));
        const result = await env.DB.prepare("UPDATE atendimento_state SET data=json_set(data,'$.attendants',json(?),'$.version',json_extract(data,'$.version')+1,'$.updatedAt',?), rotation=0 WHERE id=1 AND json_extract(data,'$.version')=? RETURNING data").bind(JSON.stringify(cleaned), new Date().toISOString(), body.version).first();
        return result ? json(JSON.parse(result.data)) : json({ error: 'A lista mudou. Recarregue o painel antes de salvar.' }, 409);
      }
    }
    if ((path === '/api/availability' && method === 'GET') || (path === '/api/route' && method === 'POST')) {
      const row = path === '/api/route'
        ? await env.DB.prepare('UPDATE atendimento_state SET rotation=rotation+1 WHERE id=1 RETURNING data,rotation').first()
        : await env.DB.prepare('SELECT data,rotation FROM atendimento_state WHERE id=1').first();
      const active = JSON.parse(row.data).attendants.filter(a => a.active);
      if (!active.length) return json({ error: 'Nenhum atendente disponível no momento.' }, 503);
      const selected = active[path === '/api/route' ? (row.rotation - 1) % active.length : 0];
      return json({ phone: selected.phone, name: selected.name });
    }
    return json({ error: 'Rota ou método não encontrado.' }, 404);
  } catch {
    return json({ error: 'Não foi possível concluir a solicitação.' }, 500);
  }
}
