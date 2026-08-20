// frontend/src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from './lib/api';

// Страницы
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Events from './pages/Events';
import Calendar from './pages/Calendar';
import Clubs from './pages/Clubs';
import ClubDetail from './pages/ClubDetail';
import ClubPresident from './pages/ClubPresident';
import ClubRating from './pages/ClubRating';
import Participants from './pages/Participants';
import ParticipantProfile from './pages/ParticipantProfile';
import ParticipantEdit from './pages/ParticipantEdit';
import Achievements from './pages/Achievements';
import ManageAchievements from './pages/ManageAchievements';
import MyAchievements from './pages/MyAchievements';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import DashboardAnalytics from './pages/DashboardAnalytics';
import ClubAnalytics from './pages/ClubAnalytics';
import Appeals from './pages/Appeals';
import AdminUsers from './pages/AdminUsers';
import AdminInvite from './pages/AdminInvite';
import AdminNews from './pages/AdminNews';
import Settings from './pages/Settings';
import ImportParticipants from './pages/ImportParticipants';
import ParentDashboard from './pages/ParentDashboard';
import ParticipantDashboard from './pages/ParticipantDashboard';
import ClubCoordinatorDashboard from './pages/ClubCoordinatorDashboard';
import TutorDashboard from './pages/TutorDashboard';
import TutorJournal from './pages/TutorJournal';
import MyReviews from './pages/MyReviews';
import MyJournal from './pages/MyJournal';
import TutorRequests from './pages/TutorRequests';
import TutorInvitations from './pages/TutorInvitations';
import StaffManagement from './pages/StaffManagement';
import StaffCalendar from './pages/StaffCalendar';
import PresidentTasks from './pages/PresidentTasks';
import ClubCalendar from './pages/ClubCalendar';
import MyClubEvents from './pages/MyClubEvents';
import NewsDetail from './pages/NewsDetail';
import OfficialDocuments from './pages/OfficialDocuments';
import TutorAssignments from './pages/TutorAssignments';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import ClubsManagement from './pages/ClubsManagement';
import MassNotifications from './pages/MassNotifications';
import ConsentsManagement from './pages/ConsentsManagement';
import DocumentsCenter from './pages/DocumentsCenter';
import TasksPlanner from './pages/TasksPlanner';
import ActivityLog from './pages/ActivityLog';
import AchievementsCategories from './pages/AchievementsCategories';
import NotificationHistory from './pages/NotificationHistory';
import GoalsAndKPI from './pages/GoalsAndKPI';

// ===== ЮРИДИЧЕСКИЕ СТРАНИЦЫ =====
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';

function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.getMe()
        .then(user => {
          if (user && user.id) {
            setProfile(user);
          }
        })
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
    <BrowserRouter>
      <Routes>
        {/* ============================================================
           ПУБЛИЧНЫЕ СТРАНИЦЫ
           ============================================================ */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />

        {/* ============================================================
           ДАШБОРДЫ
           ============================================================ */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/coordinator-dashboard" element={<CoordinatorDashboard />} />
        <Route path="/club-coordinator-dashboard" element={<ClubCoordinatorDashboard />} />
        <Route path="/tutor-dashboard" element={<TutorDashboard />} />
        <Route path="/participant-dashboard" element={<ParticipantDashboard />} />
        <Route path="/parent-dashboard" element={<ParentDashboard />} />

        {/* ============================================================
           ПРОФИЛЬ И ПОЛЬЗОВАТЕЛИ
           ============================================================ */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/invite" element={<AdminInvite />} />
        <Route path="/participants" element={<Participants />} />
        <Route path="/participant/:id" element={<ParticipantProfile />} />
        <Route path="/participant/:id/edit" element={<ParticipantEdit />} />
        <Route path="/import-participants" element={<ImportParticipants />} />

        {/* ============================================================
           МЕРОПРИЯТИЯ
           ============================================================ */}
        <Route path="/events" element={<Events />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/club-calendar" element={<ClubCalendar />} />
        <Route path="/my-club-events" element={<MyClubEvents />} />
        <Route path="/tutor-journal/:eventId" element={<TutorJournal />} />

        {/* ============================================================
           КЛУБЫ (КЮДЫ)
           ============================================================ */}
        <Route path="/clubs" element={<Clubs />} />
        <Route path="/club/:id" element={<ClubDetail />} />
        <Route path="/club/:clubId/president" element={<ClubPresident />} />
        <Route path="/club-rating" element={<ClubRating />} />
        <Route path="/club-analytics" element={<ClubAnalytics />} />
        <Route path="/clubs-management" element={<ClubsManagement />} />

        {/* ============================================================
           ДОСТИЖЕНИЯ
           ============================================================ */}
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/manage-achievements" element={<ManageAchievements />} />
        <Route path="/my-achievements" element={<MyAchievements />} />
        <Route path="/achievements-categories" element={<AchievementsCategories />} />

        {/* ============================================================
           ОТЧЁТЫ И АНАЛИТИКА
           ============================================================ */}
        <Route path="/reports" element={<Reports />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/dashboard-analytics" element={<DashboardAnalytics />} />

        {/* ============================================================
           ОБРАЩЕНИЯ
           ============================================================ */}
        <Route path="/appeals" element={<Appeals />} />

        {/* ============================================================
           НОВОСТИ
           ============================================================ */}
        <Route path="/admin/news" element={<AdminNews />} />
        <Route path="/news/:id" element={<NewsDetail />} />

        {/* ============================================================
           ДОКУМЕНТЫ
           ============================================================ */}
        <Route path="/documents" element={<OfficialDocuments />} />
        <Route path="/documents-center" element={<DocumentsCenter />} />

        {/* ============================================================
           ТЬЮТОРЫ
           ============================================================ */}
        <Route path="/tutor-requests" element={<TutorRequests />} />
        <Route path="/tutor-invitations" element={<TutorInvitations />} />
        <Route path="/tutor-assignments" element={<TutorAssignments />} />
        <Route path="/my-journal" element={<MyJournal />} />

        {/* ============================================================
           СОТРУДНИКИ
           ============================================================ */}
        <Route path="/staff" element={<StaffManagement />} />
        <Route path="/staff-calendar" element={<StaffCalendar />} />

        {/* ============================================================
           ПРЕЗИДЕНТ
           ============================================================ */}
        <Route path="/president-tasks" element={<PresidentTasks />} />

        {/* ============================================================
           ОЦЕНКИ
           ============================================================ */}
        <Route path="/my-reviews" element={<MyReviews />} />

        {/* ============================================================
           УПРАВЛЕНИЕ
           ============================================================ */}
        <Route path="/settings" element={<Settings />} />
        <Route path="/mass-notifications" element={<MassNotifications />} />
        <Route path="/consents-management" element={<ConsentsManagement />} />
        <Route path="/tasks-planner" element={<TasksPlanner />} />
        <Route path="/goals" element={<GoalsAndKPI />} />
        <Route path="/activity-log" element={<ActivityLog />} />
        <Route path="/notification-history" element={<NotificationHistory />} />

        {/* ============================================================
           РЕДИРЕКТ
           ============================================================ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;