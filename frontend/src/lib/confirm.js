// frontend/src/lib/confirm.js
//
// Подтверждение действия — одной строкой в любом месте кода.
//
// По проекту было рассыпано около полусотни confirm() и prompt() браузера.
// Переписывать каждую страницу на собственное окно с состоянием — долго и
// каждый раз по-разному. Поэтому окно живёт одно, смонтированное в App, а
// сюда приходит запрос и возвращается ответ:
//
//   if (!await confirmAction({ title: 'Удалить участника?' })) return;
//   const comment = await askComment({ title: 'Вернуть на доработку?' });
//
// Запасной путь на confirm() браузера оставлен намеренно: если окно по
// какой-то причине не смонтировано, действие всё равно спросит человека,
// а не выполнится молча.

let listener = null;

// Вызывается один раз из ConfirmHost
export function registerConfirmHost(fn) {
  listener = fn;
  return () => { if (listener === fn) listener = null; };
}

// Да или нет. Возвращает true, если человек подтвердил.
export function confirmAction(options = {}) {
  if (!listener) {
    return Promise.resolve(window.confirm(options.title || 'Подтвердить действие?'));
  }
  return new Promise((resolve) => {
    listener({ ...options, mode: 'confirm', resolve });
  });
}

// Подтверждение с текстом. Возвращает строку или null, если отменили.
export function askComment(options = {}) {
  if (!listener) {
    return Promise.resolve(window.prompt(options.commentLabel || options.title || ''));
  }
  return new Promise((resolve) => {
    listener({ ...options, mode: 'comment', resolve });
  });
}
