import { loadQuestions } from '../storage/questions.js';

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function startQuizForUser(userSession) {
  const questions = await loadQuestions();
  const order = shuffle(questions.map((_, idx) => idx));

  userSession.quiz.order = order;
  userSession.quiz.currentIndex = 0;
  userSession.quiz.isActive = true;

  return { questionsCount: questions.length };
}

export async function getCurrentQuestion(userSession) {
  const questions = await loadQuestions();
  if (!userSession.quiz.isActive) return null;

  const pos = userSession.quiz.currentIndex;
  if (pos >= userSession.quiz.order.length) return null;

  const idx = userSession.quiz.order[pos];
  return questions[idx] ?? null;
}

export function applyAnswer(userSession, isCorrect) {
  userSession.stats.total += 1;
  if (isCorrect) {
    userSession.stats.correct += 1;
    userSession.stats.streak += 1;
  } else {
    userSession.stats.streak = 0;
  }

  userSession.quiz.currentIndex += 1;
}

export function finishQuiz(userSession) {
  userSession.quiz.isActive = false;
}
