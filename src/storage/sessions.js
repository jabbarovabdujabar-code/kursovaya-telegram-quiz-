import fs from 'node:fs/promises';
import path from 'node:path';

const SESSIONS_PATH = path.resolve('src/data/sessions.json');

export async function loadSessions() {
  const raw = await fs.readFile(SESSIONS_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object') throw new Error('sessions.json должен быть объектом');
  if (!data.sessions || typeof data.sessions !== 'object') data.sessions = {};
  return data;
}

export async function saveSessions(data) {
  const raw = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(SESSIONS_PATH, raw, 'utf8');
}

export function getOrInitUserSession(data, userId) {
  const key = String(userId);
  if (!data.sessions[key]) {
    data.sessions[key] = {
      quiz: {
        currentIndex: 0,
        order: [],
        isActive: false
      },
      stats: {
        total: 0,
        correct: 0,
        streak: 0
      }
    };
  }
  return data.sessions[key];
}

export function resetUser(data, userId) {
  const key = String(userId);
  delete data.sessions[key];
}
