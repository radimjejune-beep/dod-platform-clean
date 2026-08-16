// backend/lib/reportGenerator.js

import { Pool } from 'pg';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import fs from 'fs';

let poolInstance = null;

export const initReportGenerator = (pool) => {
  poolInstance = pool;
};

// ============================================================
// 1. СБОР ДАННЫХ ДЛЯ ОТЧЁТА
// ============================================================
export const collectReportData = async (clubId, reportMonth) => {
  if (!poolInstance) {
    throw new Error('Report generator not initialized');
  }

  const [month, year] = reportMonth.split('-');
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Получаем данные клуба
  const clubResult = await poolInstance.query(
    'SELECT id, name, city, school, leader_name, contact_email, contact_phone FROM clubs WHERE id = $1',
    [clubId]
  );
  const club = clubResult.rows[0] || {};

  // Получаем координатора
  const coordinatorResult = await poolInstance.query(
    `SELECT u.full_name FROM club_coordinators cc 
     LEFT JOIN users u ON cc.profile_id = u.id 
     WHERE cc.club_id = $1 LIMIT 1`,
    [clubId]
  );
  const coordinator = coordinatorResult.rows[0] || {};

  // Получаем президента
  const presidentResult = await poolInstance.query(
    'SELECT full_name FROM users WHERE club_id = $1 AND is_president = true LIMIT 1',
    [clubId]
  );
  const president = presidentResult.rows[0] || {};

  // Получаем участников
  const participantsResult = await poolInstance.query(
    `SELECT id, full_name, school, class_name, status, created_at 
     FROM users WHERE club_id = $1 AND role = 'participant'`,
    [clubId]
  );
  const participants = participantsResult.rows || [];

  // Новые участники за месяц
  const newParticipants = participants.filter(p => {
    const d = new Date(p.created_at);
    return d >= startDate && d <= endDate;
  });

  // Активные участники
  const activeParticipants = participants.filter(p => p.status === 'active');

  // Мероприятия за месяц
  const eventsResult = await poolInstance.query(
    `SELECT id, title, description, location, event_date, status 
     FROM events WHERE club_id = $1 AND event_date >= $2 AND event_date <= $3`,
    [clubId, startDate, endDate]
  );
  const events = eventsResult.rows || [];

  // Достижения за месяц
  const achievementsResult = await poolInstance.query(
    `SELECT a.id, a.title, a.description, a.achievement_date, u.full_name as participant_name
     FROM achievements a
     LEFT JOIN users u ON a.participant_id = u.id
     WHERE u.club_id = $1 AND a.achievement_date >= $2 AND a.achievement_date <= $3`,
    [clubId, startDate, endDate]
  );
  const achievements = achievementsResult.rows || [];

  // Топ-3 участников по рейтингу
  const topParticipantsResult = await poolInstance.query(
    `SELECT u.id, u.full_name, u.school, u.class_name,
            COUNT(DISTINCT r.event_id) as events_count,
            COUNT(DISTINCT a.id) as achievements_count,
            (COUNT(DISTINCT r.event_id) * 2 + COUNT(DISTINCT a.id) * 5) as rating_points
     FROM users u
     LEFT JOIN registrations r ON u.id = r.user_id AND r.status = 'confirmed'
     LEFT JOIN achievements a ON u.id = a.participant_id
     WHERE u.club_id = $1 AND u.role = 'participant'
     GROUP BY u.id, u.full_name, u.school, u.class_name
     ORDER BY rating_points DESC
     LIMIT 3`,
    [clubId]
  );
  const topParticipants = topParticipantsResult.rows || [];

  // Предстоящие мероприятия
  const upcomingEventsResult = await poolInstance.query(
    `SELECT id, title, event_date, location 
     FROM events WHERE club_id = $1 AND event_date > NOW() AND status = 'approved'
     ORDER BY event_date ASC LIMIT 5`,
    [clubId]
  );
  const upcomingEvents = upcomingEventsResult.rows || [];

  // Тьюторы
  const tutorsResult = await poolInstance.query(
    `SELECT DISTINCT u.full_name 
     FROM event_tutor_assignments eta
     LEFT JOIN users u ON eta.tutor_id = u.id
     LEFT JOIN events e ON eta.event_id = e.id
     WHERE e.club_id = $1 AND eta.status = 'accepted'`,
    [clubId]
  );
  const tutors = tutorsResult.rows || [];

  // Рейтинг клуба (средний рейтинг участников)
  const ratingResult = await poolInstance.query(
    `SELECT AVG(rating_points) as avg_rating
     FROM (
       SELECT u.id, (COUNT(DISTINCT r.event_id) * 2 + COUNT(DISTINCT a.id) * 5) as rating_points
       FROM users u
       LEFT JOIN registrations r ON u.id = r.user_id AND r.status = 'confirmed'
       LEFT JOIN achievements a ON u.id = a.participant_id
       WHERE u.club_id = $1 AND u.role = 'participant'
       GROUP BY u.id
     ) as ratings`,
    [clubId]
  );
  const clubRating = ratingResult.rows[0]?.avg_rating || 0;

  // Формируем данные для шаблона
  return {
    club_name: club.name || 'Клуб',
    club_city: club.city || 'Город не указан',
    club_school: club.school || 'Школа не указана',
    club_leader: club.leader_name || 'Не указан',
    club_email: club.contact_email || 'Не указан',
    club_phone: club.contact_phone || 'Не указан',
    report_month: reportMonth,
    report_month_name: new Date(year, month - 1).toLocaleString('ru-RU', { month: 'long', year: 'numeric' }),
    participants_count: participants.length,
    new_participants: newParticipants.length,
    active_participants: activeParticipants.length,
    events_count: events.length,
    achievements_count: achievements.length,
    coordinator_name: coordinator.full_name || 'Не назначен',
    president_name: president.full_name || 'Не назначен',
    club_rating: Math.round(clubRating * 10) / 10,
    top_participants: topParticipants.map(p => ({
      name: p.full_name,
      school: p.school || '—',
      class: p.class_name || '—',
      events: parseInt(p.events_count) || 0,
      achievements: parseInt(p.achievements_count) || 0,
      rating: parseInt(p.rating_points) || 0
    })),
    upcoming_events: upcomingEvents.map(e => ({
      title: e.title,
      date: e.event_date ? new Date(e.event_date).toLocaleDateString('ru-RU') : '—',
      location: e.location || '—'
    })),
    tutors_list: tutors.map(t => t.full_name).join(', ') || 'Нет тьюторов',
    events: events.map(e => ({
      title: e.title,
      date: e.event_date ? new Date(e.event_date).toLocaleDateString('ru-RU') : '—',
      location: e.location || '—',
      status: e.status || '—'
    })),
    achievements: achievements.map(a => ({
      title: a.title,
      participant: a.participant_name || '—',
      date: a.achievement_date ? new Date(a.achievement_date).toLocaleDateString('ru-RU') : '—',
      description: a.description || ''
    })),
    current_date: new Date().toLocaleDateString('ru-RU'),
    generated_at: new Date().toLocaleString('ru-RU')
  };
};

// ============================================================
// 2. ЗАМЕНА ПЛЕЙСХОЛДЕРОВ В ТЕКСТЕ
// ============================================================
export const replacePlaceholders = (template, data) => {
  let result = template;

  // Простые плейсхолдеры
  const simplePlaceholders = {
    '{club_name}': data.club_name,
    '{club_city}': data.club_city,
    '{club_school}': data.club_school,
    '{club_leader}': data.club_leader,
    '{club_email}': data.club_email,
    '{club_phone}': data.club_phone,
    '{report_month}': data.report_month,
    '{report_month_name}': data.report_month_name,
    '{participants_count}': data.participants_count,
    '{new_participants}': data.new_participants,
    '{active_participants}': data.active_participants,
    '{events_count}': data.events_count,
    '{achievements_count}': data.achievements_count,
    '{coordinator_name}': data.coordinator_name,
    '{president_name}': data.president_name,
    '{club_rating}': data.club_rating,
    '{tutors_list}': data.tutors_list,
    '{current_date}': data.current_date,
    '{generated_at}': data.generated_at
  };

  for (const [key, value] of Object.entries(simplePlaceholders)) {
    result = result.replaceAll(key, value || '—');
  }

  // Сложные плейсхолдеры (списки)
  if (data.top_participants && data.top_participants.length > 0) {
    let topList = '';
    data.top_participants.forEach((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      topList += `${medal} **${p.name}** — ${p.rating} баллов (мероприятий: ${p.events}, достижений: ${p.achievements})\n`;
    });
    result = result.replace('{top_participants}', topList || 'Нет данных');
  } else {
    result = result.replace('{top_participants}', 'Нет данных');
  }

  if (data.upcoming_events && data.upcoming_events.length > 0) {
    let eventsList = '';
    data.upcoming_events.forEach(e => {
      eventsList += `• **${e.title}** — ${e.date} (${e.location})\n`;
    });
    result = result.replace('{upcoming_events}', eventsList || 'Нет предстоящих мероприятий');
  } else {
    result = result.replace('{upcoming_events}', 'Нет предстоящих мероприятий');
  }

  // Список мероприятий за период
  if (data.events && data.events.length > 0) {
    let eventsList = '';
    data.events.forEach(e => {
      eventsList += `• ${e.title} — ${e.date} (${e.location})\n`;
    });
    result = result.replace('{events_list}', eventsList || 'Нет мероприятий');
  } else {
    result = result.replace('{events_list}', 'Нет мероприятий за период');
  }

  // Список достижений
  if (data.achievements && data.achievements.length > 0) {
    let achievementsList = '';
    data.achievements.forEach(a => {
      achievementsList += `• **${a.title}** — ${a.participant} (${a.date})\n`;
      if (a.description) achievementsList += `  ${a.description}\n`;
    });
    result = result.replace('{achievements_list}', achievementsList || 'Нет достижений');
  } else {
    result = result.replace('{achievements_list}', 'Нет достижений за период');
  }

  return result;
};

// ============================================================
// 3. ЭКСПОРТ В PDF
// ============================================================
export const exportToPDF = async (content, title) => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: { Title: title }
  });

  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {});

  // Заголовок
  doc.fontSize(24).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown();

  // Линия
  doc.strokeColor('#C9A227').lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // Дата генерации
  doc.fontSize(10).font('Helvetica').text(`Сгенерировано: ${new Date().toLocaleString('ru-RU')}`, { align: 'right' });
  doc.moveDown();

  // Контент
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim() === '') {
      doc.moveDown(0.5);
      continue;
    }

    // Заголовки (начинаются с ###)
    if (line.trim().startsWith('###')) {
      doc.fontSize(14).font('Helvetica-Bold').text(line.trim().replace('###', '').trim());
      doc.moveDown(0.5);
      continue;
    }

    // Жирный текст (**текст**)
    if (line.includes('**')) {
      const parts = line.split('**');
      let formattedLine = '';
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
          formattedLine += parts[i];
        } else {
          formattedLine += parts[i];
        }
      }
      doc.fontSize(12).font('Helvetica').text(formattedLine);
      doc.moveDown(0.5);
      continue;
    }

    // Обычный текст
    doc.fontSize(12).font('Helvetica').text(line);
    doc.moveDown(0.5);
  }

  // Подпись внизу
  doc.moveDown();
  doc.strokeColor('#C9A227').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.fontSize(10).font('Helvetica').text('ДОД «Дипломаты будущего» • Официальный отчёт', { align: 'center' });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
};

// ============================================================
// 4. ЭКСПОРТ В DOCX
// ============================================================
export const exportToDOCX = async (content, title) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: title,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: `Сгенерировано: ${new Date().toLocaleString('ru-RU')}`,
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 }
        })
      ]
    }]
  });

  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim() === '') {
      doc.addSection({
        children: [new Paragraph({ text: ' ', spacing: { after: 100 } })]
      });
      continue;
    }

    if (line.trim().startsWith('###')) {
      doc.addSection({
        children: [new Paragraph({
          text: line.trim().replace('###', '').trim(),
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 }
        })]
      });
      continue;
    }

    // Обработка жирного текста
    if (line.includes('**')) {
      const parts = line.split('**');
      const children = [];
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
          children.push(new TextRun({ text: parts[i], bold: true }));
        } else if (parts[i]) {
          children.push(new TextRun({ text: parts[i] }));
        }
      }
      doc.addSection({
        children: [new Paragraph({ children, spacing: { after: 100 } })]
      });
      continue;
    }

    doc.addSection({
      children: [new Paragraph({ text: line, spacing: { after: 100 } })]
    });
  }

  return await Packer.toBuffer(doc);
};

// ============================================================
// 5. ЭКСПОРТ В HTML
// ============================================================
export const exportToHTML = (content, title) => {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { text-align: center; color: #0B1F3A; border-bottom: 3px solid #C9A227; padding-bottom: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header .date { color: #667085; font-size: 12px; }
        .footer { margin-top: 40px; border-top: 1px solid #C9A227; padding-top: 10px; text-align: center; color: #667085; font-size: 12px; }
        h3 { color: #0B1F3A; margin-top: 20px; }
        ul { list-style-type: none; padding: 0; }
        li { padding: 4px 0; }
        .highlight { background: #FBF4DC; padding: 2px 6px; border-radius: 4px; }
        hr { border: none; border-top: 1px solid #E2E7EF; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p class="date">📅 Сгенерировано: ${new Date().toLocaleString('ru-RU')}</p>
      </div>
      <hr>
      <div class="content">
  `;

  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim() === '') {
      html += '<br>';
      continue;
    }

    if (line.trim().startsWith('###')) {
      html += `<h3>${line.trim().replace('###', '').trim()}</h3>`;
      continue;
    }

    if (line.includes('**')) {
      let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `<p>${processed}</p>`;
      continue;
    }

    if (line.trim().startsWith('•')) {
      html += `<li>${line.trim().replace('•', '').trim()}</li>`;
      continue;
    }

    html += `<p>${line}</p>`;
  }

  html += `
      </div>
      <div class="footer">
        ДОД «Дипломаты будущего» • Официальный отчёт
      </div>
    </body>
    </html>
  `;

  return html;
};

// ============================================================
// 6. ЭКСПОРТ В CSV
// ============================================================
export const exportToCSV = (data, title) => {
  const rows = [
    ['Показатель', 'Значение'],
    ['Название клуба', data.club_name],
    ['Город', data.club_city],
    ['Школа', data.club_school],
    ['Отчётный период', data.report_month_name],
    ['Всего участников', data.participants_count],
    ['Новые участники', data.new_participants],
    ['Активные участники', data.active_participants],
    ['Мероприятий проведено', data.events_count],
    ['Достижений получено', data.achievements_count],
    ['Координатор', data.coordinator_name],
    ['Президент', data.president_name],
    ['Рейтинг клуба', data.club_rating],
    ['Тьюторы', data.tutors_list],
    ['Дата генерации', data.current_date],
    ['', ''],
    ['ТОП-3 УЧАСТНИКОВ', ''],
    ['Место', 'Участник', 'Баллы', 'Мероприятия', 'Достижения']
  ];

  data.top_participants.forEach((p, i) => {
    rows.push([`#${i + 1}`, p.name, p.rating, p.events, p.achievements]);
  });

  rows.push(['', '']);
  rows.push(['ПРЕДСТОЯЩИЕ МЕРОПРИЯТИЯ', '']);
  rows.push(['Название', 'Дата', 'Место']);
  data.upcoming_events.forEach(e => {
    rows.push([e.title, e.date, e.location]);
  });

  let csv = '';
  for (const row of rows) {
    const escaped = row.map(cell => {
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    });
    csv += escaped.join(',') + '\n';
  }

  return csv;
};