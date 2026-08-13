// frontend/src/App.jsx

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Публичные страницы
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Основные страницы
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Clubs from './pages/Clubs';
import ClubDetail from './pages/ClubDetail';
import Events from './pages/Events';
import EventParticipants from './pages/EventParticipants';
import Calendar from './pages/Calendar';
import Analytics from './pages/Analytics';
import ClubAnalytics from './pages/ClubAnalytics';
import DashboardAnalytics from './pages/DashboardAnalytics';
import Settings from './pages/Settings';
import AdminInvite from './pages/AdminInvite';
import AdminUsers from './pages/AdminUsers';
import ImportParticipants from './pages/ImportParticipants';

// Участник
import ParticipantDashboard from './pages/ParticipantDashboard';
import MyAchievements from './pages/MyAchievements';
import MyReviews from './pages/MyReviews';
import PresidentTasks from './pages/PresidentTasks';

// Родитель
import ParentDashboard from './pages/ParentDashboard';

// Координатор клуба
import ClubCoordinatorDashboard from './pages/ClubCoordinatorDashboard';
import ManageAchievements from './pages/ManageAchievements';
import Reports from './pages/Reports';
import Appeals from './pages/Appeals';
import TutorRequests from './pages/TutorRequests';
import TutorInvitations from './pages/TutorInvitations';
import StaffManagement from './pages/StaffManagement';
import StaffCalendar from './pages/StaffCalendar';

// Тьютор
import TutorDashboard from './pages/TutorDashboard';
import MyJournal from './pages/MyJournal';
import TutorJournal from './pages/TutorJournal';

// Другие
import ParticipantProfile from './pages/ParticipantProfile';
import ParticipantEdit from './pages/ParticipantEdit';
import NewsDetail from './pages/NewsDetail';
import Achievements from './pages/Achievements';
import Participants from './pages/Participants';

// Стили
import './styles/global.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* ===== ПУБЛИЧНЫЕ ===== */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ===== ЗАЩИЩЁННЫЕ ===== */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />

        {/* ===== УЧАСТНИК ===== */}
        <Route path="/participant-dashboard" element={
          <ProtectedRoute>
            <ParticipantDashboard />
          </ProtectedRoute>
        } />

        <Route path="/my-achievements" element={
          <ProtectedRoute>
            <MyAchievements />
          </ProtectedRoute>
        } />

        <Route path="/my-reviews" element={
          <ProtectedRoute>
            <MyReviews />
          </ProtectedRoute>
        } />

        <Route path="/president-tasks" element={
          <ProtectedRoute>
            <PresidentTasks />
          </ProtectedRoute>
        } />

        {/* ===== РОДИТЕЛЬ ===== */}
        <Route path="/parent-dashboard" element={
          <ProtectedRoute>
            <ParentDashboard />
          </ProtectedRoute>
        } />

        {/* ===== КООРДИНАТОР КЛУБА ===== */}
        <Route path="/club-coordinator-dashboard" element={
          <ProtectedRoute>
            <ClubCoordinatorDashboard />
          </ProtectedRoute>
        } />

        <Route path="/club-analytics" element={
          <ProtectedRoute>
            <ClubAnalytics />
          </ProtectedRoute>
        } />

        <Route path="/manage-achievements" element={
          <ProtectedRoute>
            <ManageAchievements />
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        } />

        <Route path="/appeals" element={
          <ProtectedRoute>
            <Appeals />
          </ProtectedRoute>
        } />

        <Route path="/tutor-requests" element={
          <ProtectedRoute>
            <TutorRequests />
          </ProtectedRoute>
        } />

        <Route path="/tutor-invitations" element={
          <ProtectedRoute>
            <TutorInvitations />
          </ProtectedRoute>
        } />

        {/* ===== ТЬЮТОР ===== */}
        <Route path="/tutor-dashboard" element={
          <ProtectedRoute>
            <TutorDashboard />
          </ProtectedRoute>
        } />

        <Route path="/my-journal" element={
          <ProtectedRoute>
            <MyJournal />
          </ProtectedRoute>
        } />

        <Route path="/tutor-journal" element={
          <ProtectedRoute>
            <TutorJournal />
          </ProtectedRoute>
        } />

        <Route path="/tutor-journal/:eventId" element={
          <ProtectedRoute>
            <TutorJournal />
          </ProtectedRoute>
        } />

        {/* ===== ОБЩИЕ ===== */}
        <Route path="/clubs" element={
          <ProtectedRoute>
            <Clubs />
          </ProtectedRoute>
        } />

        <Route path="/club/:id" element={
          <ProtectedRoute>
            <ClubDetail />
          </ProtectedRoute>
        } />

        <Route path="/events" element={
          <ProtectedRoute>
            <Events />
          </ProtectedRoute>
        } />

        <Route path="/events/:eventId/participants" element={
          <ProtectedRoute>
            <EventParticipants />
          </ProtectedRoute>
        } />

        <Route path="/calendar" element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        } />

        <Route path="/participants" element={
          <ProtectedRoute>
            <Participants />
          </ProtectedRoute>
        } />

        <Route path="/participant/:id" element={
          <ProtectedRoute>
            <ParticipantProfile />
          </ProtectedRoute>
        } />

        {/* ===== РЕДАКТИРОВАНИЕ УЧАСТНИКА ===== */}
        <Route path="/participant/:id/edit" element={
          <ProtectedRoute>
            <ParticipantEdit />
          </ProtectedRoute>
        } />

        <Route path="/achievements" element={
          <ProtectedRoute>
            <Achievements />
          </ProtectedRoute>
        } />

        {/* ===== АДМИНИСТРАТИВНЫЕ ===== */}
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } />

        <Route path="/dashboard-analytics" element={
          <ProtectedRoute>
            <DashboardAnalytics />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="/admin/invite" element={
          <ProtectedRoute>
            <AdminInvite />
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute>
            <AdminUsers />
          </ProtectedRoute>
        } />

        <Route path="/import-participants" element={
          <ProtectedRoute>
            <ImportParticipants />
          </ProtectedRoute>
        } />

        <Route path="/staff" element={
          <ProtectedRoute>
            <StaffManagement />
          </ProtectedRoute>
        } />

        <Route path="/staff-calendar" element={
          <ProtectedRoute>
            <StaffCalendar />
          </ProtectedRoute>
        } />

        {/* ===== НОВОСТИ ===== */}
        <Route path="/news/:id" element={
          <ProtectedRoute>
            <NewsDetail />
          </ProtectedRoute>
        } />

        {/* ===== 404 ===== */}
        <Route path="*" element={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            flexDirection: 'column',
            gap: '16px',
            background: '#F4F6F9'
          }}>
            <span style={{ fontSize: '64px' }}>🤔</span>
            <h1 style={{ color: '#0B1F3A' }}>Страница не найдена</h1>
            <p style={{ color: '#667085' }}>Проверьте правильность URL</p>
            <a href="/" style={{ color: '#C9A227', textDecoration: 'none' }}>Вернуться на главную</a>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;