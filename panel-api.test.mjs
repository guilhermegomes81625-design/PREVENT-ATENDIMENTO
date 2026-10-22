import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { onRequest } from './functions/api/[[path]].js';

function setup() {
  const db = new DatabaseSync(':memory:');
  const wrap = (sql, args = []) => ({
    bind: (...values) => wrap(sql, values),
    run: async () => db.prepare(sql).run(...args),
    first: async () => db.prepare(sql).get(...args),
  });
  const env = { ADMIN_PASSWORD: 'test-password-only', DB: { prepare: wrap, batch: async list => Promise.all(list.map(q => q.run())) } };
  const call = (path, method = 'GET', body, cookie) => onRequest({ env, request: new Request(`https://test.example/api/${path}`, { method, headers: { Origin: 'https://test.example', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }) });
  return { call, env };
}

test('panel requires a per-browser session and rejects default passwords', async () => {
  const { call } = setup();
  assert.equal((await call('admin')).status, 401);
  assert.equal((await call('session', 'POST', { password: 'admin' })).status, 401);
  const login = await call('session', 'POST', { password: 'test-password-only' });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await call('admin', 'GET', null, cookie)).status, 200);
  assert.equal((await call('admin')).status, 401);
  await call('session', 'DELETE', null, cookie);
  assert.equal((await call('admin', 'GET', null, cookie)).status, 401);
});

test('shared data persists, routes in order, validates input and detects conflicting saves', async () => {
  const { call } = setup();
  const login = await call('session', 'POST', { password: 'test-password-only' });
  const cookie = login.headers.get('Set-Cookie').split(';')[0];
  const data = await (await call('admin', 'GET', null, cookie)).json();
  const attendants = [...data.attendants, { id: 'second', name: 'Second', phone: '5511999999999', active: true }];
  assert.equal((await call('admin', 'PUT', { attendants, version: data.version }, cookie)).status, 200);
  assert.equal((await call('admin', 'PUT', { attendants, version: data.version }, cookie)).status, 409);
  assert.equal((await (await call('route', 'POST', {})).json()).phone, attendants[0].phone);
  assert.equal((await (await call('route', 'POST', {})).json()).phone, attendants[1].phone);
  assert.equal((await call('admin', 'PUT', { attendants: [{ ...attendants[0], phone: 'bad' }], version: 2 }, cookie)).status, 400);
  assert.equal((await call('admin', 'PUT', { attendants: [], version: 2 }, cookie)).status, 200);
  assert.equal((await call('availability')).status, 503);
  assert.equal((await call('route', 'POST', {})).status, 503);
});

test('missing secret blocks login and repeated incorrect attempts are limited', async () => {
  const { call, env } = setup();
  env.ADMIN_PASSWORD = '';
  assert.equal((await call('session', 'POST', { password: 'admin' })).status, 503);
  env.ADMIN_PASSWORD = 'test-password-only';
  for (let i = 0; i < 10; i++) assert.equal((await call('session', 'POST', { password: 'wrong' })).status, 401);
  assert.equal((await call('session', 'POST', { password: 'wrong' })).status, 429);
});
