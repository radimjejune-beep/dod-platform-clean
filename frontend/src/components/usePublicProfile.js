// frontend/src/components/usePublicProfile.js
//
// Профиль для публичных страниц (новости): страницу видят и гости, и
// вошедшие. Гостя на вход не отправляем — api.getMe() для этого не годится,
// он без токена перекидывает на /login. Протухший токен тихо убираем,
// как это делает главная страница.

import { useEffect, useState } from 'react';

export default function usePublicProfile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('https://dod-backend.relaxdev.ru/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (cancelled) return;
        if (response.ok) {
          setProfile(await response.json());
        } else if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch {
        // Нет связи — страница остаётся гостевой, новости при этом читаются
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return profile;
}
