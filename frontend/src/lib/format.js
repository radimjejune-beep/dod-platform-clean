// frontend/src/lib/format.js
//
// Мелочи, из-за которых интерфейс выглядит машинным: «1 участников»,
// «Отчёт за 2026-09». По отдельности каждая ерунда, вместе — ощущение,
// что платформу собрали на коленке.

// Склонение существительного при числе: plural(1, 'участник', 'участника',
// 'участников') → 'участник'
export function plural(count, one, few, many) {
  const n = Math.abs(Number(count) || 0) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

// Число вместе с существительным: countOf(3, 'участник', ...) → '3 участника'
export function countOf(count, one, few, many) {
  const value = Number(count) || 0;
  return `${value} ${plural(value, one, few, many)}`;
}

const MONTHS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
];

const MONTHS_IN = [
  'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
  'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'
];

// Отчётный месяц хранится как 2026-09 — в таком виде он и попадал на
// экран. Человеку нужен «сентябрь 2026».
export function monthLabel(value, { form = 'nominative' } = {}) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return value || '';
  const year = match[1];
  const index = parseInt(match[2], 10) - 1;
  const names = form === 'in' ? MONTHS_IN : MONTHS;
  if (index < 0 || index > 11) return value;
  return `${names[index]} ${year}`;
}

export default { plural, countOf, monthLabel };
