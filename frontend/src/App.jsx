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
import ManageAchievements from './pages/ManageAchievements';
import MyReviews from './pages/MyReviews';
import Reports from './pages/Reports';
import Analytics from './pages/DashboardAnalytics';
import ClubAnalytics from './pages/ClubAnalytics';
import Settings from './pages/Settings';
import AdminInvite from './pages/AdminInvite';
import AdminUsers from './pages/AdminUsers';
import ImportParticipants from './pages/ImportParticipants';
import Appeals from './pages/Appeals';
import StaffManagement from './pages/StaffManagement';
import StaffCalendar from './pages/StaffCalendar';
import PresidentTasks from './pages/PresidentTasks';
import TutorJournal from './pages/TutorJournal';
import CalendarPage from './pages/Calendar';
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
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/participants" 
              element={
                <ProtectedRoute>
                  <Participants />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clubs" 
              element={
                <ProtectedRoute>
                  <Clubs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/events" 
              element={
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/achievements" 
              element={
                <ProtectedRoute>
                  <Achievements />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/my-achievements" 
              element={
                <ProtectedRoute>
                  <MyAchievements />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manage-achievements" 
              element={
                <ProtectedRoute>
                  <ManageAchievements />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/my-reviews" 
              element={
                <ProtectedRoute>
                  <MyReviews />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/club-analytics" 
              element={
                <ProtectedRoute>
                  <ClubAnalytics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/invite" 
              element={
                <ProtectedRoute>
                  <AdminInvite />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute>
                  <AdminUsers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/import-participants" 
              element={
                <ProtectedRoute>
                  <ImportParticipants />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/appeals" 
              element={
                <ProtectedRoute>
                  <Appeals />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/staff" 
              element={
                <ProtectedRoute>
                  <StaffManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/staff-calendar" 
              element={
                <ProtectedRoute>
                  <StaffCalendar />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/president-tasks" 
              element={
                <ProtectedRoute>
                  <PresidentTasks />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/my-journal" 
              element={
                <ProtectedRoute>
                  <TutorJournal />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/calendar" 
              element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;