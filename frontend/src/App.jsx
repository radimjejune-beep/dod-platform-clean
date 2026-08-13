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
import CalendarPage from './pages/Calendar';
import ClubDetail from './pages/ClubDetail';
import ParticipantProfile from './pages/ParticipantProfile';
import Settings from './pages/Settings';
import Appeals from './pages/Appeals';
import DashboardAnalytics from './pages/DashboardAnalytics';
import Reports from './pages/Reports';
import AdminInvite from './pages/AdminInvite';
import ManageAchievements from './pages/ManageAchievements';
import ImportParticipants from './pages/ImportParticipants';
import EventParticipants from './pages/EventParticipants';
import StaffManagement from './pages/StaffManagement';
import StaffCalendar from './pages/StaffCalendar';
import TutorJournal from './pages/TutorJournal';
import MyJournal from './pages/MyJournal';
import ClubAnalytics from './pages/ClubAnalytics';
import MyAchievements from './pages/MyAchievements';
import MyReviews from './pages/MyReviews';
import NewsDetail from './pages/NewsDetail';
import PresidentTasks from './pages/PresidentTasks';
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
            <Route path="/news/:id" element={<NewsDetail />} />
            
            {/* ===== ЗАЩИЩЁННЫЕ СТРАНИЦЫ ===== */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/participants" element={<ProtectedRoute><Participants /></ProtectedRoute>} />
            <Route path="/participant/:id" element={<ProtectedRoute><ParticipantProfile /></ProtectedRoute>} />
            <Route path="/clubs" element={<ProtectedRoute><Clubs /></ProtectedRoute>} />
            <Route path="/club/:id" element={<ProtectedRoute><ClubDetail /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
            <Route path="/my-achievements" element={<ProtectedRoute><MyAchievements /></ProtectedRoute>} />
            <Route path="/my-reviews" element={<ProtectedRoute><MyReviews /></ProtectedRoute>} />
            <Route path="/president-tasks" element={<ProtectedRoute><PresidentTasks /></ProtectedRoute>} />
            <Route path="/appeals" element={<ProtectedRoute><Appeals /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><DashboardAnalytics /></ProtectedRoute>} />
            <Route path="/club-analytics" element={<ProtectedRoute><ClubAnalytics /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><Participants /></ProtectedRoute>} />
            <Route path="/admin/invite" element={<ProtectedRoute><AdminInvite /></ProtectedRoute>} />
            <Route path="/manage-achievements" element={<ProtectedRoute><ManageAchievements /></ProtectedRoute>} />
            <Route path="/import-participants" element={<ProtectedRoute><ImportParticipants /></ProtectedRoute>} />
            <Route path="/event/:eventId/participants" element={<ProtectedRoute><EventParticipants /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute><StaffManagement /></ProtectedRoute>} />
            <Route path="/staff-calendar" element={<ProtectedRoute><StaffCalendar /></ProtectedRoute>} />
            <Route path="/tutor-journal/:eventId" element={<ProtectedRoute><TutorJournal /></ProtectedRoute>} />
            <Route path="/my-journal" element={<ProtectedRoute><MyJournal /></ProtectedRoute>} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;