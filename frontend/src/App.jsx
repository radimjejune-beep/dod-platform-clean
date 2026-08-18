// frontend/src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from './lib/api';
import Navigation from './components/Navigation';

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
        {/* ПУБЛИЧНЫЕ СТРАНИЦЫ (БЕЗ НАВИГАЦИИ) */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* ============================================================
           ВСЕ СТРАНИЦЫ КАБИНЕТА — С НАВИГАЦИЕЙ
           ============================================================ */}
        <Route path="/dashboard" element={
          <>
            <Navigation profile={profile} />
            <Dashboard />
          </>
        } />
        <Route path="/profile" element={
          <>
            <Navigation profile={profile} />
            <Profile />
          </>
        } />
        <Route path="/events" element={
          <>
            <Navigation profile={profile} />
            <Events />
          </>
        } />
        <Route path="/calendar" element={
          <>
            <Navigation profile={profile} />
            <Calendar />
          </>
        } />
        <Route path="/clubs" element={
          <>
            <Navigation profile={profile} />
            <Clubs />
          </>
        } />
        <Route path="/club/:id" element={
          <>
            <Navigation profile={profile} />
            <ClubDetail />
          </>
        } />
        <Route path="/club/:clubId/president" element={
          <>
            <Navigation profile={profile} />
            <ClubPresident />
          </>
        } />
        <Route path="/club-rating" element={
          <>
            <Navigation profile={profile} />
            <ClubRating />
          </>
        } />
        <Route path="/club-analytics" element={
          <>
            <Navigation profile={profile} />
            <ClubAnalytics />
          </>
        } />
        <Route path="/participants" element={
          <>
            <Navigation profile={profile} />
            <Participants />
          </>
        } />
        <Route path="/participant/:id" element={
          <>
            <Navigation profile={profile} />
            <ParticipantProfile />
          </>
        } />
        <Route path="/participant/:id/edit" element={
          <>
            <Navigation profile={profile} />
            <ParticipantEdit />
          </>
        } />
        <Route path="/achievements" element={
          <>
            <Navigation profile={profile} />
            <Achievements />
          </>
        } />
        <Route path="/manage-achievements" element={
          <>
            <Navigation profile={profile} />
            <ManageAchievements />
          </>
        } />
        <Route path="/my-achievements" element={
          <>
            <Navigation profile={profile} />
            <MyAchievements />
          </>
        } />
        <Route path="/reports" element={
          <>
            <Navigation profile={profile} />
            <Reports />
          </>
        } />
        <Route path="/analytics" element={
          <>
            <Navigation profile={profile} />
            <Analytics />
          </>
        } />
        <Route path="/dashboard-analytics" element={
          <>
            <Navigation profile={profile} />
            <DashboardAnalytics />
          </>
        } />
        <Route path="/appeals" element={
          <>
            <Navigation profile={profile} />
            <Appeals />
          </>
        } />
        <Route path="/admin/users" element={
          <>
            <Navigation profile={profile} />
            <AdminUsers />
          </>
        } />
        <Route path="/admin/invite" element={
          <>
            <Navigation profile={profile} />
            <AdminInvite />
          </>
        } />
        <Route path="/admin/news" element={
          <>
            <Navigation profile={profile} />
            <AdminNews />
          </>
        } />
        <Route path="/settings" element={
          <>
            <Navigation profile={profile} />
            <Settings />
          </>
        } />
        <Route path="/import-participants" element={
          <>
            <Navigation profile={profile} />
            <ImportParticipants />
          </>
        } />
        <Route path="/parent-dashboard" element={
          <>
            <Navigation profile={profile} />
            <ParentDashboard />
          </>
        } />
        <Route path="/participant-dashboard" element={
          <>
            <Navigation profile={profile} />
            <ParticipantDashboard />
          </>
        } />
        <Route path="/club-coordinator-dashboard" element={
          <>
            <Navigation profile={profile} />
            <ClubCoordinatorDashboard />
          </>
        } />
        <Route path="/tutor-dashboard" element={
          <>
            <Navigation profile={profile} />
            <TutorDashboard />
          </>
        } />
        <Route path="/tutor-journal/:eventId" element={
          <>
            <Navigation profile={profile} />
            <TutorJournal />
          </>
        } />
        <Route path="/my-reviews" element={
          <>
            <Navigation profile={profile} />
            <MyReviews />
          </>
        } />
        <Route path="/my-journal" element={
          <>
            <Navigation profile={profile} />
            <MyJournal />
          </>
        } />
        <Route path="/tutor-requests" element={
          <>
            <Navigation profile={profile} />
            <TutorRequests />
          </>
        } />
        <Route path="/tutor-invitations" element={
          <>
            <Navigation profile={profile} />
            <TutorInvitations />
          </>
        } />
        <Route path="/tutor-assignments" element={
          <>
            <Navigation profile={profile} />
            <TutorAssignments />
          </>
        } />
        <Route path="/staff" element={
          <>
            <Navigation profile={profile} />
            <StaffManagement />
          </>
        } />
        <Route path="/staff-calendar" element={
          <>
            <Navigation profile={profile} />
            <StaffCalendar />
          </>
        } />
        <Route path="/president-tasks" element={
          <>
            <Navigation profile={profile} />
            <PresidentTasks />
          </>
        } />
        <Route path="/club-calendar" element={
          <>
            <Navigation profile={profile} />
            <ClubCalendar />
          </>
        } />
        <Route path="/my-club-events" element={
          <>
            <Navigation profile={profile} />
            <MyClubEvents />
          </>
        } />
        <Route path="/news/:id" element={
          <>
            <Navigation profile={profile} />
            <NewsDetail />
          </>
        } />
        <Route path="/documents" element={
          <>
            <Navigation profile={profile} />
            <OfficialDocuments />
          </>
        } />
        <Route path="/coordinator-dashboard" element={
          <>
            <Navigation profile={profile} />
            <CoordinatorDashboard />
          </>
        } />
        <Route path="/clubs-management" element={
          <>
            <Navigation profile={profile} />
            <ClubsManagement />
          </>
        } />
        <Route path="/mass-notifications" element={
          <>
            <Navigation profile={profile} />
            <MassNotifications />
          </>
        } />
        <Route path="/consents-management" element={
          <>
            <Navigation profile={profile} />
            <ConsentsManagement />
          </>
        } />

        {/* 🔥 ГЛАВНОЕ — ОБЕРНУЛИ В NAVIGATION */}
        <Route path="/documents-center" element={
          <>
            <Navigation profile={profile} />
            <DocumentsCenter />
          </>
        } />

        <Route path="/tasks-planner" element={
          <>
            <Navigation profile={profile} />
            <TasksPlanner />
          </>
        } />
        <Route path="/activity-log" element={
          <>
            <Navigation profile={profile} />
            <ActivityLog />
          </>
        } />
        <Route path="/achievements-categories" element={
          <>
            <Navigation profile={profile} />
            <AchievementsCategories />
          </>
        } />
        <Route path="/notification-history" element={
          <>
            <Navigation profile={profile} />
            <NotificationHistory />
          </>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;