export function escapeMd(text) {
  if (typeof text !== 'string') return '';
  // Telegram MarkdownV2 requires escaping these characters
  return text.replace(/([_\*\[\]\(\)~`>#+\-=|{}.!\\])/g, '\\$1');
}

export function formatStats(stats) {
  const total = stats.total ?? 0;
  const correct = stats.correct ?? 0;
  const streak = stats.streak ?? 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return [
    `Всего ответов: ${total}`,
    `Правильных: ${correct}`,
    `Точность: ${accuracy}%`,
    `Текущая серия: ${streak}`
  ].join('\n');
}
