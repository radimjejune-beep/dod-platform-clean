// frontend/src/App.jsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Participants from './pages/Participants';
import Clubs from './pages/Clubs';
import Events from './pages/Events';
import Achievements from './pages/Achievements';
import MyAchievements from './pages/MyAchievements';
import MyReviews from './pages/MyReviews';
import Reports from './pages/Reports';
import Appeals from './pages/Appeals';
import AdminUsers from './pages/AdminUsers';
import AdminInvite from './pages/AdminInvite';
import ImportParticipants from './pages/ImportParticipants';
import ManageAchievements from './pages/ManageAchievements';
import StaffManagement from './pages/StaffManagement';
import StaffCalendar from './pages/StaffCalendar';
import PresidentTasks from './pages/PresidentTasks';
import CalendarPage from './pages/Calendar';
import Analytics from './pages/Analytics';
import ClubAnalytics from './pages/ClubAnalytics';
import Settings from './pages/Settings';
// ===== НОВЫЕ СТРАНИЦЫ =====
import ParticipantDashboard from './pages/ParticipantDashboard';
import ParentDashboard from './pages/ParentDashboard';
import ClubCoordinatorDashboard from './pages/ClubCoordinatorDashboard';
import TutorDashboard from './pages/TutorDashboard';
import TutorJournal from './pages/TutorJournal';
import MyJournal from './pages/MyJournal';
import ClubDetail from './pages/ClubDetail';
import ParticipantProfile from './pages/ParticipantProfile';
import DashboardAnalytics from './pages/DashboardAnalytics';

import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer';

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>
          <Routes>
            {/* ===== ПУБЛИЧНЫЕ СТРАНИЦЫ ===== */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* ===== ЗАЩИЩЁННЫЕ СТРАНИЦЫ ===== */}
            
            {/* Дашборды */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/participant-dashboard" element={<ProtectedRoute><ParticipantDashboard /></ProtectedRoute>} />
            <Route path="/parent-dashboard" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />
            <Route path="/club-coordinator-dashboard" element={<ProtectedRoute><ClubCoordinatorDashboard /></ProtectedRoute>} />
            <Route path="/tutor-dashboard" element={<ProtectedRoute><TutorDashboard /></ProtectedRoute>} />
            
            {/* Профили */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/participant/:id" element={<ProtectedRoute><ParticipantProfile /></ProtectedRoute>} />
            
            {/* Участники */}
            <Route path="/participants" element={<ProtectedRoute><Participants /></ProtectedRoute>} />
            
            {/* Клубы */}
            <Route path="/clubs" element={<ProtectedRoute><Clubs /></ProtectedRoute>} />
            <Route path="/club/:id" element={<ProtectedRoute><ClubDetail /></ProtectedRoute>} />
            
            {/* Мероприятия */}
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            
            {/* Достижения */}
            <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
            <Route path="/my-achievements" element={<ProtectedRoute><MyAchievements /></ProtectedRoute>} />
            <Route path="/manage-achievements" element={<ProtectedRoute><ManageAchievements /></ProtectedRoute>} />
            
            {/* Оценки */}
            <Route path="/my-reviews" element={<ProtectedRoute><MyReviews /></ProtectedRoute>} />
            
            {/* Отчёты */}
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            
            {/* Обращения */}
            <Route path="/appeals" element={<ProtectedRoute><Appeals /></ProtectedRoute>} />
            
            {/* Администрирование */}
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/invite" element={<ProtectedRoute><AdminInvite /></ProtectedRoute>} />
            <Route path="/import-participants" element={<ProtectedRoute><ImportParticipants /></ProtectedRoute>} />
            
            {/* Сотрудники */}
            <Route path="/staff" element={<ProtectedRoute><StaffManagement /></ProtectedRoute>} />
            <Route path="/staff-calendar" element={<ProtectedRoute><StaffCalendar /></ProtectedRoute>} />
            
            {/* Тьюторы */}
            <Route path="/tutor-journal" element={<ProtectedRoute><TutorJournal /></ProtectedRoute>} />
            <Route path="/tutor-journal/:eventId" element={<ProtectedRoute><TutorJournal /></ProtectedRoute>} />
            <Route path="/my-journal" element={<ProtectedRoute><MyJournal /></ProtectedRoute>} />
            
            {/* Президент */}
            <Route path="/president-tasks" element={<ProtectedRoute><PresidentTasks /></ProtectedRoute>} />
            
            {/* Аналитика */}
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/club-analytics" element={<ProtectedRoute><ClubAnalytics /></ProtectedRoute>} />
            <Route path="/dashboard-analytics" element={<ProtectedRoute><DashboardAnalytics /></ProtectedRoute>} />
            
            {/* Настройки */}
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;