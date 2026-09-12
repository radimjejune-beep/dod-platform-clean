// frontend/src/pages/ClubCoordinatorDashboard.jsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Руководитель КЮДа после входа попадал сюда — на заготовку, где вместо
// названия клуба стоял его служебный номер, а вместо дел — три кнопки.
// Общий дашборд давно умеет показывать руководителю его КЮД, участников,
// мероприятия, отчёты и назначение президента, поэтому этот адрес просто
// ведёт туда: старые ссылки и закладки продолжают работать.
export default function ClubCoordinatorDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return null;
}
