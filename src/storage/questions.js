import fs from 'node:fs/promises';
import path from 'node:path';

const QUESTIONS_PATH = path.resolve('src/data/questions.json');

export async function loadQuestions() {
  const raw = await fs.readFile(QUESTIONS_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('questions.json должен быть массивом');
  return data;
}

export async function saveQuestions(questions) {
  if (!Array.isArray(questions)) throw new Error('questions must be array');
  const raw = JSON.stringify(questions, null, 2) + '\n';
  await fs.writeFile(QUESTIONS_PATH, raw, 'utf8');
}

export function buildQuestionFromAddCommand(text) {
  // /add_question Q | o1 | o2 | o3 | o4 | 2 | explanation
  const withoutCmd = text.replace(/^\/add_question\s*/i, '').trim();
  const parts = withoutCmd.split('|').map(s => s.trim()).filter(Boolean);

  if (parts.length < 7) {
    return {
      ok: false,
      error: 'Неверный формат. Нужно: вопрос | 4 варианта | номер_правильного(1..4) | пояснение'
    };
  }

  const question = parts[0];
  const options = parts.slice(1, 5);
  const correctStr = parts[5];
  const explanation = parts.slice(6).join(' | ');

  const correctNum = Number(correctStr);
  if (!Number.isInteger(correctNum) || correctNum < 1 || correctNum > 4) {
    return { ok: false, error: 'Номер правильного ответа должен быть целым 1..4' };
  }

  const id = `custom-${Date.now()}`;

  return {
    ok: true,
    value: {
      id,
      question,
      options,
      correctAnswer: correctNum - 1,
      explanation,
      tags: ['пользовательский']
    }
  };
}
