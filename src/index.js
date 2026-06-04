import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';

import { loadQuestions, saveQuestions, buildQuestionFromAddCommand } from './storage/questions.js';
import { loadSessions, saveSessions, getOrInitUserSession, resetUser } from './storage/sessions.js';
import { startQuizForUser, getCurrentQuestion, applyAnswer, finishQuiz } from './bot/quiz.js';
import { formatStats } from './utils/format.js';

const token = process.env.BOT_TOKEN;
const adminId = process.env.ADMIN_ID ? String(process.env.ADMIN_ID) : '';

if (!token) {
  // eslint-disable-next-line no-console
  console.error('Не задан BOT_TOKEN. Создайте .env (см. README).');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

function isAdmin(msg) {
  return adminId && String(msg.from?.id) === adminId;
}

function buildOptionsKeyboard(question) {
  return {
    reply_markup: {
      inline_keyboard: question.options.map((opt, idx) => ([
        {
          text: opt,
          callback_data: `ans:${idx}`
        }
      ]))
    }
  };
}

async function sendCurrentQuestion(chatId, userSession) {
  const q = await getCurrentQuestion(userSession);
  if (!q) {
    finishQuiz(userSession);
    return { done: true };
  }

  const text = `Вопрос ${userSession.quiz.currentIndex + 1}/${userSession.quiz.order.length}:\n\n${q.question}`;
  await bot.sendMessage(chatId, text, buildOptionsKeyboard(q));
  return { done: false };
}

bot.onText(/^\/start$/i, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    [
      'Привет! Я бот-викторина по философии.',
      '',
      'Команды:',
      '/quiz — начать или продолжить викторину',
      '/stats — статистика',
      '/reset — сброс прогресса',
      '',
      'Если ты админ, можно добавлять вопросы командой /add_question ... (см. README).'
    ].join('\n')
  );
});

bot.onText(/^\/quiz$/i, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const sessionsData = await loadSessions();
  const userSession = getOrInitUserSession(sessionsData, userId);

  if (!userSession.quiz.isActive) {
    const { questionsCount } = await startQuizForUser(userSession);
    await bot.sendMessage(chatId, `Старт! В базе сейчас ${questionsCount} вопросов. Удачи!`);
  } else {
    await bot.sendMessage(chatId, 'Продолжаем викторину.');
  }

  await sendCurrentQuestion(chatId, userSession);
  await saveSessions(sessionsData);
});

bot.onText(/^\/stats$/i, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const sessionsData = await loadSessions();
  const userSession = getOrInitUserSession(sessionsData, userId);
  await bot.sendMessage(chatId, formatStats(userSession.stats));
});

bot.onText(/^\/reset$/i, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const sessionsData = await loadSessions();
  resetUser(sessionsData, userId);
  await saveSessions(sessionsData);
  await bot.sendMessage(chatId, 'Прогресс сброшен. Можно начинать заново: /quiz');
});

bot.onText(/^\/add_question\b/i, async (msg) => {
  const chatId = msg.chat.id;

  if (!isAdmin(msg)) {
    await bot.sendMessage(chatId, 'Команда доступна только администратору.');
    return;
  }

  const parsed = buildQuestionFromAddCommand(msg.text ?? '');
  if (!parsed.ok) {
    await bot.sendMessage(chatId, `Ошибка: ${parsed.error}`);
    return;
  }

  const questions = await loadQuestions();
  questions.push(parsed.value);
  await saveQuestions(questions);

  await bot.sendMessage(chatId, `Вопрос добавлен. Теперь в базе ${questions.length} вопросов.`);
});

bot.on('callback_query', async (query) => {
  try {
    const data = query.data ?? '';
    if (!data.startsWith('ans:')) return;

    const chatId = query.message.chat.id;
    const userId = query.from.id;

    const sessionsData = await loadSessions();
    const userSession = getOrInitUserSession(sessionsData, userId);

    if (!userSession.quiz.isActive) {
      await bot.answerCallbackQuery(query.id, { text: 'Викторина не запущена. Нажми /quiz' });
      return;
    }

    const q = await getCurrentQuestion(userSession);
    if (!q) {
      finishQuiz(userSession);
      await saveSessions(sessionsData);
      await bot.answerCallbackQuery(query.id, { text: 'Викторина завершена. /quiz чтобы начать заново' });
      return;
    }

    const picked = Number(data.split(':')[1]);
    const isCorrect = picked === q.correctAnswer;

    applyAnswer(userSession, isCorrect);
    await saveSessions(sessionsData);

    const feedback = isCorrect
      ? `Верно! +1\n\n${q.explanation}`
      : `Неверно. Правильный ответ: ${q.options[q.correctAnswer]}\n\n${q.explanation}`;

    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, feedback);

    const next = await sendCurrentQuestion(chatId, userSession);
    if (next.done) {
      await bot.sendMessage(chatId, `Готово!\n\n${formatStats(userSession.stats)}\n\nНапиши /quiz чтобы сыграть ещё раз.`);
      await saveSessions(sessionsData);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
});

// eslint-disable-next-line no-console
console.log('Бот запущен.');
