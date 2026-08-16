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
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        
        {/* Мероприятия */}
        <Route path="/events" element={<Events />} />
        <Route path="/calendar" element={<Calendar />} />
        
        {/* Клубы */}
        <Route path="/clubs" element={<Clubs />} />
        <Route path="/club/:id" element={<ClubDetail />} />
        <Route path="/club/:clubId/president" element={<ClubPresident />} />
        <Route path="/club-rating" element={<ClubRating />} />
        <Route path="/club-analytics" element={<ClubAnalytics />} />
        
        {/* Участники */}
        <Route path="/participants" element={<Participants />} />
        <Route path="/participant/:id" element={<ParticipantProfile />} />
        <Route path="/participant/:id/edit" element={<ParticipantEdit />} />
        
        {/* Достижения */}
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/manage-achievements" element={<ManageAchievements />} />
        <Route path="/my-achievements" element={<MyAchievements />} />
        
        {/* Отчёты и аналитика */}
        <Route path="/reports" element={<Reports />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/dashboard-analytics" element={<DashboardAnalytics />} />
        
        {/* Обращения */}
        <Route path="/appeals" element={<Appeals />} />
        
        {/* Админка */}
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/invite" element={<AdminInvite />} />
        <Route path="/admin/news" element={<AdminNews />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/import-participants" element={<ImportParticipants />} />
        
        {/* Родитель */}
        <Route path="/parent-dashboard" element={<ParentDashboard />} />
        
        {/* Участник */}
        <Route path="/participant-dashboard" element={<ParticipantDashboard />} />
        
        {/* Координатор КЮДа */}
        <Route path="/club-coordinator-dashboard" element={<ClubCoordinatorDashboard />} />
        
        {/* Тьютор */}
        <Route path="/tutor-dashboard" element={<TutorDashboard />} />
        <Route path="/tutor-journal/:eventId" element={<TutorJournal />} />
        <Route path="/my-reviews" element={<MyReviews />} />
        <Route path="/my-journal" element={<MyJournal />} />
        <Route path="/tutor-requests" element={<TutorRequests />} />
        <Route path="/tutor-invitations" element={<TutorInvitations />} />
        <Route path="/tutor-assignments" element={<TutorAssignments />} />
        
        {/* Сотрудники */}
        <Route path="/staff" element={<StaffManagement />} />
        <Route path="/staff-calendar" element={<StaffCalendar />} />
        
        {/* Президент */}
        <Route path="/president-tasks" element={<PresidentTasks />} />
        
        {/* Клуб */}
        <Route path="/club-calendar" element={<ClubCalendar />} />
        <Route path="/my-club-events" element={<MyClubEvents />} />
        
        {/* Новости */}
        <Route path="/news/:id" element={<NewsDetail />} />
        
        {/* Официальные документы */}
        <Route path="/documents" element={<OfficialDocuments />} />
        
        <Route path="/coordinator-dashboard" element={<CoordinatorDashboard />} />
        <Route path="/clubs-management" element={<ClubsManagement />} />
        <Route path="/mass-notifications" element={<MassNotifications />} />
        <Route path="/consents-management" element={<ConsentsManagement />} />
        <Route path="/documents-center" element={<DocumentsCenter />} />
        <Route path="/tasks-planner" element={<TasksPlanner />} />
        <Route path="/activity-log" element={<ActivityLog />} />
        <Route path="/achievements-categories" element={<AchievementsCategories />} />
        <Route path="/notification-history" element={<NotificationHistory />} />

        {/* Редирект */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;