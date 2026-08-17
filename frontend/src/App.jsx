// frontend/src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from './components/Layout';

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
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch('https://dod-backend.relaxdev.ru/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setLoading(false);
          return;
        }

        const user = await response.json();
        setProfile(user);
        localStorage.setItem('user', JSON.stringify(user));
      } catch (err) {
        console.error('Ошибка:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#F5F6F8'
      }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        
        {/* Все страницы с Layout */}
        <Route path="/dashboard" element={
          <Layout profile={profile}>
            <Dashboard />
          </Layout>
        } />
        <Route path="/profile" element={
          <Layout profile={profile}>
            <Profile />
          </Layout>
        } />
        <Route path="/events" element={
          <Layout profile={profile}>
            <Events />
          </Layout>
        } />
        <Route path="/calendar" element={
          <Layout profile={profile}>
            <Calendar />
          </Layout>
        } />
        <Route path="/clubs" element={
          <Layout profile={profile}>
            <Clubs />
          </Layout>
        } />
        <Route path="/club/:id" element={
          <Layout profile={profile}>
            <ClubDetail />
          </Layout>
        } />
        <Route path="/club/:clubId/president" element={
          <Layout profile={profile}>
            <ClubPresident />
          </Layout>
        } />
        <Route path="/club-rating" element={
          <Layout profile={profile}>
            <ClubRating />
          </Layout>
        } />
        <Route path="/club-analytics" element={
          <Layout profile={profile}>
            <ClubAnalytics />
          </Layout>
        } />
        <Route path="/participants" element={
          <Layout profile={profile}>
            <Participants />
          </Layout>
        } />
        <Route path="/participant/:id" element={
          <Layout profile={profile}>
            <ParticipantProfile />
          </Layout>
        } />
        <Route path="/participant/:id/edit" element={
          <Layout profile={profile}>
            <ParticipantEdit />
          </Layout>
        } />
        <Route path="/achievements" element={
          <Layout profile={profile}>
            <Achievements />
          </Layout>
        } />
        <Route path="/manage-achievements" element={
          <Layout profile={profile}>
            <ManageAchievements />
          </Layout>
        } />
        <Route path="/my-achievements" element={
          <Layout profile={profile}>
            <MyAchievements />
          </Layout>
        } />
        <Route path="/reports" element={
          <Layout profile={profile}>
            <Reports />
          </Layout>
        } />
        <Route path="/analytics" element={
          <Layout profile={profile}>
            <Analytics />
          </Layout>
        } />
        <Route path="/dashboard-analytics" element={
          <Layout profile={profile}>
            <DashboardAnalytics />
          </Layout>
        } />
        <Route path="/appeals" element={
          <Layout profile={profile}>
            <Appeals />
          </Layout>
        } />
        <Route path="/admin/users" element={
          <Layout profile={profile}>
            <AdminUsers />
          </Layout>
        } />
        <Route path="/admin/invite" element={
          <Layout profile={profile}>
            <AdminInvite />
          </Layout>
        } />
        <Route path="/admin/news" element={
          <Layout profile={profile}>
            <AdminNews />
          </Layout>
        } />
        <Route path="/settings" element={
          <Layout profile={profile}>
            <Settings />
          </Layout>
        } />
        <Route path="/import-participants" element={
          <Layout profile={profile}>
            <ImportParticipants />
          </Layout>
        } />
        <Route path="/parent-dashboard" element={
          <Layout profile={profile}>
            <ParentDashboard />
          </Layout>
        } />
        <Route path="/participant-dashboard" element={
          <Layout profile={profile}>
            <ParticipantDashboard />
          </Layout>
        } />
        <Route path="/club-coordinator-dashboard" element={
          <Layout profile={profile}>
            <ClubCoordinatorDashboard />
          </Layout>
        } />
        <Route path="/tutor-dashboard" element={
          <Layout profile={profile}>
            <TutorDashboard />
          </Layout>
        } />
        <Route path="/tutor-journal/:eventId" element={
          <Layout profile={profile}>
            <TutorJournal />
          </Layout>
        } />
        <Route path="/my-reviews" element={
          <Layout profile={profile}>
            <MyReviews />
          </Layout>
        } />
        <Route path="/my-journal" element={
          <Layout profile={profile}>
            <MyJournal />
          </Layout>
        } />
        <Route path="/tutor-requests" element={
          <Layout profile={profile}>
            <TutorRequests />
          </Layout>
        } />
        <Route path="/tutor-invitations" element={
          <Layout profile={profile}>
            <TutorInvitations />
          </Layout>
        } />
        <Route path="/tutor-assignments" element={
          <Layout profile={profile}>
            <TutorAssignments />
          </Layout>
        } />
        <Route path="/staff" element={
          <Layout profile={profile}>
            <StaffManagement />
          </Layout>
        } />
        <Route path="/staff-calendar" element={
          <Layout profile={profile}>
            <StaffCalendar />
          </Layout>
        } />
        <Route path="/president-tasks" element={
          <Layout profile={profile}>
            <PresidentTasks />
          </Layout>
        } />
        <Route path="/club-calendar" element={
          <Layout profile={profile}>
            <ClubCalendar />
          </Layout>
        } />
        <Route path="/my-club-events" element={
          <Layout profile={profile}>
            <MyClubEvents />
          </Layout>
        } />
        <Route path="/news/:id" element={
          <Layout profile={profile}>
            <NewsDetail />
          </Layout>
        } />
        <Route path="/documents" element={
          <Layout profile={profile}>
            <OfficialDocuments />
          </Layout>
        } />
        <Route path="/coordinator-dashboard" element={
          <Layout profile={profile}>
            <CoordinatorDashboard />
          </Layout>
        } />
        <Route path="/clubs-management" element={
          <Layout profile={profile}>
            <ClubsManagement />
          </Layout>
        } />
        <Route path="/mass-notifications" element={
          <Layout profile={profile}>
            <MassNotifications />
          </Layout>
        } />
        <Route path="/consents-management" element={
          <Layout profile={profile}>
            <ConsentsManagement />
          </Layout>
        } />
        <Route path="/documents-center" element={
          <Layout profile={profile}>
            <DocumentsCenter />
          </Layout>
        } />
        <Route path="/tasks-planner" element={
          <Layout profile={profile}>
            <TasksPlanner />
          </Layout>
        } />
        <Route path="/activity-log" element={
          <Layout profile={profile}>
            <ActivityLog />
          </Layout>
        } />
        <Route path="/achievements-categories" element={
          <Layout profile={profile}>
            <AchievementsCategories />
          </Layout>
        } />
        <Route path="/notification-history" element={
          <Layout profile={profile}>
            <NotificationHistory />
          </Layout>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;