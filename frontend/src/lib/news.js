// frontend/src/lib/news.js
//
// Общие мелочи для новостей: адрес картинки и дата.
//
// Сервер не отдаёт фото новости внутри списка (в базе оно лежит строкой
// base64 и весило бы мегабайты на каждый заход на главную), а даёт признак
// has_image. Сама картинка берётся отдельным запросом и кэшируется;
// ?v=<время правки> меняет адрес при замене фото, чтобы кэш не держал старое.

const API_ORIGIN = 'https://dod-backend.relaxdev.ru';

export function newsImageSrc(item) {
  if (!item) return '';
  if (item.image_url) return item.image_url; // внешняя https-ссылка
  if (!item.has_image) return '';
  const version = item.updated_at ? new Date(item.updated_at).getTime() : 0;
  return `${API_ORIGIN}/api/news/${item.id}/image?v=${version}`;
}

export function formatNewsDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export { API_ORIGIN };
