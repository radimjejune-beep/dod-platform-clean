// frontend/src/pages/Terms.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navigation from '../components/Navigation';

export default function Terms() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.getMe()
        .then(user => setProfile(user))
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F6F9' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-background">
      <Navigation profile={profile} />
      <div className="container-page">
        <div className="legal-document">
          <h1>Пользовательское соглашение</h1>
          <p className="version">Версия 1.0 от 19 августа 2026 г.</p>

          <div className="legal-content">
            <section>
              <h2>1. Общие положения</h2>
              <p>
                1.1. Настоящее Пользовательское соглашение (далее — Соглашение) является 
                юридическим документом, регулирующим отношения между 
                <strong> [НАИМЕНОВАНИЕ ОПЕРАТОРА] </strong> (далее — Администрация) 
                и пользователем платформы «ДОД «Дипломаты будущего» (далее — Платформа).
              </p>
              <p>
                1.2. Использование Платформы означает полное и безоговорочное принятие 
                условий настоящего Соглашения.
              </p>
            </section>

            <section>
              <h2>2. Термины и определения</h2>
              <ul>
                <li>
                  <strong>Платформа</strong> — совокупность программно-аппаратных средств, 
                  обеспечивающих функционирование сайта и мобильного приложения 
                  «ДОД «Дипломаты будущего».
                </li>
                <li>
                  <strong>Пользователь</strong> — физическое лицо, имеющее доступ к Платформе 
                  и использующее её функциональные возможности.
                </li>
                <li>
                  <strong>Участник</strong> — пользователь, зарегистрированный в системе 
                  как участник ДОД «Дипломаты будущего».
                </li>
                <li>
                  <strong>КЮД</strong> — Клуб юных дипломатов, структурное подразделение движения.
                </li>
                <li>
                  <strong>Личный кабинет</strong> — персональный раздел Платформы, доступный 
                  пользователю после авторизации.
                </li>
              </ul>
            </section>

            <section>
              <h2>3. Регистрация и учётная запись</h2>
              <p>
                3.1. Регистрация на Платформе осуществляется Администрацией. 
                Самостоятельная регистрация пользователей не предусмотрена.
              </p>
              <p>
                3.2. Для регистрации пользователя Администрации необходимы следующие данные:
              </p>
              <ul>
                <li>ФИО участника;</li>
                <li>Email;</li>
                <li>Роль в системе;</li>
                <li>Принадлежность к КЮДу (для участников и координаторов).</li>
              </ul>
              <p>
                3.3. Пользователь обязуется предоставлять достоверную и актуальную информацию 
                при использовании Платформы.
              </p>
              <p>
                3.4. Пользователь несёт ответственность за сохранность своих учётных данных 
                и пароля.
              </p>
            </section>

            <section>
              <h2>4. Права и обязанности пользователя</h2>

              <h3>4.1. Пользователь имеет право:</h3>
              <ul>
                <li>Использовать все функциональные возможности Платформы;</li>
                <li>Участвовать в мероприятиях ДОД;</li>
                <li>Просматривать информацию о своих достижениях и участии;</li>
                <li>Редактировать информацию в своём профиле;</li>
                <li>Обращаться в службу поддержки;</li>
                <li>Отозвать согласие на обработку персональных данных.</li>
              </ul>

              <h3>4.2. Пользователь обязуется:</h3>
              <ul>
                <li>Не нарушать законодательство РФ;</li>
                <li>Не использовать Платформу для незаконных целей;</li>
                <li>Не передавать свои учётные данные третьим лицам;</li>
                <li>Соблюдать правила участия в мероприятиях;</li>
                <li>Уважать права и достоинство других участников;</li>
                <li>Не размещать информацию, порочащую честь и достоинство других лиц;</li>
                <li>Не пытаться получить несанкционированный доступ к системе.</li>
              </ul>
            </section>

            <section>
              <h2>5. Права и обязанности администрации</h2>

              <h3>5.1. Администрация имеет право:</h3>
              <ul>
                <li>Изменять функциональность Платформы;</li>
                <li>Ограничивать доступ пользователей при нарушении Соглашения;</li>
                <li>Удалять аккаунты пользователей при грубых нарушениях;</li>
                <li>Вносить изменения в настоящее Соглашение.</li>
              </ul>

              <h3>5.2. Администрация обязуется:</h3>
              <ul>
                <li>Обеспечивать работоспособность Платформы;</li>
                <li>Обеспечивать защиту персональных данных пользователей;</li>
                <li>Соблюдать требования законодательства РФ;</li>
                <li>Предоставлять поддержку пользователям.</li>
              </ul>
            </section>

            <section>
              <h2>6. Мероприятия</h2>
              <p>
                6.1. Участие в мероприятиях осуществляется на добровольной основе.
              </p>
              <p>
                6.2. Регистрация на мероприятия осуществляется через Платформу.
              </p>
              <p>
                6.3. Для участия в мероприятиях требуется наличие подписанных согласий 
                на обработку персональных данных (для несовершеннолетних — согласия 
                родителей или законных представителей).
              </p>
            </section>

            <section>
              <h2>7. Конфиденциальность и персональные данные</h2>
              <p>
                7.1. Администрация обрабатывает персональные данные пользователей в соответствии 
                с Политикой обработки персональных данных.
              </p>
              <p>
                7.2. Администрация принимает все необходимые меры для защиты персональных 
                данных пользователей.
              </p>
            </section>

            <section>
              <h2>8. Интеллектуальная собственность</h2>
              <p>
                8.1. Все материалы, размещённые на Платформе, являются объектами 
                интеллектуальной собственности Администрации.
              </p>
              <p>
                8.2. Пользователь не имеет права копировать, распространять или 
                использовать материалы Платформы без разрешения Администрации.
              </p>
            </section>

            <section>
              <h2>9. Ответственность</h2>
              <p>
                9.1. Администрация не несёт ответственности за убытки, возникшие в результате 
                использования Платформы.
              </p>
              <p>
                9.2. Пользователь несёт ответственность за все действия, совершённые 
                с использованием его учётной записи.
              </p>
            </section>

            <section>
              <h2>10. Заключительные положения</h2>
              <p>
                10.1. Настоящее Соглашение вступает в силу с момента его принятия пользователем.
              </p>
              <p>
                10.2. Споры, возникающие из настоящего Соглашения, подлежат рассмотрению 
                в суде по месту нахождения Администрации.
              </p>
              <p>
                10.3. Актуальная версия Соглашения всегда доступна по адресу:
                <strong> /terms </strong>
              </p>
            </section>

            <div className="legal-footer">
              <p>Дата публикации: 19 августа 2026 г.</p>
              <p>Версия: 1.0</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .page-background {
          min-height: 100vh;
          background: #F0EDE8;
        }

        .container-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px 32px 48px;
        }

        .legal-document {
          background: white;
          padding: 40px 48px;
          border-radius: 12px;
          border: 1px solid #E4DFD8;
          box-shadow: 0 2px 12px rgba(10,22,40,0.04);
        }

        .legal-document h1 {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          color: #0A1628;
          margin: 0 0 4px 0;
        }

        .legal-document .version {
          font-size: 14px;
          color: #98A2B3;
          margin: 0 0 32px 0;
        }

        .legal-content section {
          margin-bottom: 28px;
        }

        .legal-content h2 {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: #0A1628;
          margin: 0 0 12px 0;
        }

        .legal-content h3 {
          font-size: 16px;
          font-weight: 600;
          color: #0A1628;
          margin: 16px 0 8px 0;
        }

        .legal-content p {
          font-size: 14px;
          line-height: 1.7;
          color: #4D4744;
          margin: 0 0 12px 0;
        }

        .legal-content ul {
          margin: 8px 0 12px 20px;
          padding: 0;
        }

        .legal-content ul li {
          font-size: 14px;
          line-height: 1.7;
          color: #4D4744;
          margin-bottom: 4px;
        }

        .legal-content strong {
          color: #0A1628;
        }

        .legal-footer {
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid #E4DFD8;
          font-size: 13px;
          color: #98A2B3;
        }

        .legal-footer p {
          margin: 4px 0;
        }

        @media (max-width: 768px) {
          .container-page {
            padding: 16px;
          }

          .legal-document {
            padding: 24px 20px;
          }

          .legal-document h1 {
            font-size: 22px;
          }

          .legal-content h2 {
            font-size: 18px;
          }
        }

        @media (max-width: 480px) {
          .container-page {
            padding: 12px;
          }

          .legal-document {
            padding: 16px 14px;
          }

          .legal-document h1 {
            font-size: 18px;
          }

          .legal-content h2 {
            font-size: 16px;
          }

          .legal-content p,
          .legal-content ul li {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}