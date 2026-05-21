import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import VerifyPage from './pages/VerifyPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SearchPage from './pages/SearchPage';
import NewsstandPage from './pages/NewsstandPage';
import HeadlinesPage from './pages/HeadlinesPage';
import ArticlePage from './pages/ArticlePage';
import RoadmapsPage from './pages/RoadmapsPage';
import RoadmapDetailPage from './pages/RoadmapDetailPage';
import CreateStoryPage from './pages/CreateStoryPage';
import ClippingsPage from './pages/ClippingsPage';
import ClippingSharePage from './pages/ClippingSharePage';
import SettingsPage from './pages/SettingsPage';
import AddTopicsPage from './pages/AddTopicsPage';
import AddAlertTopicsPage from './pages/AddAlertTopicsPage';
import HistoryPage from './pages/HistoryPage';
import AdminProfilesPage from './pages/AdminProfilesPage';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function AppContent() {
  const [newsstandArticles, setNewsstandArticles] = useState([
    {
      id: 101,
      title: "Local Coffee Shop Goes Zero Waste",
      category: "Local",
      imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800",
      author: "Alex Rivera",
      authorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200",
      efficacy: 98,
      upvotes: 342,
    },
    {
      id: 102,
      title: "Review: The New Downtown Park",
      category: "Review",
      imageUrl: "https://images.unsplash.com/photo-1519331379826-f9478558d136?auto=format&fit=crop&q=80&w=800",
      author: "Sarah Chen",
      authorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200",
      efficacy: 85,
      upvotes: 128,
    },
    {
      id: 103,
      title: "Why I'm Switching to E-Bikes",
      category: "Opinion",
      imageUrl: "https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&q=80&w=800",
      author: "Mike Johnson",
      authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
      efficacy: 92,
      upvotes: 215,
    },
  ]);

  const handleCreateStory = (newStory) => {
    const story = {
      id: Date.now(),
      ...newStory,
      author: 'You',
      authorAvatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      efficacy: 100,
      upvotes: 0,
    };
    setNewsstandArticles((current) => [story, ...current]);
  };

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/topics"
          element={
            <ProtectedRoute>
              <AddTopicsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/alerts/topics"
          element={
            <ProtectedRoute>
              <AddAlertTopicsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profiles"
          element={
            <AdminProfilesPage />
            // <ProtectedRoute>
            //   <AdminProfilesPage />
            // </ProtectedRoute>
          }
        // element={user?.isAdmin ? <AdminProfilesPage /> : <Navigate to="/" />}
        />

        <Route path="/search" element={<SearchPage />} />
        <Route
          path="/newsstand"
          element={<NewsstandPage articles={newsstandArticles} />}
        />
        <Route
          path="/create-story"
          element={<CreateStoryPage onSubmit={handleCreateStory} />}
        />
        <Route path="/headlines" element={<HeadlinesPage />} />
        <Route path="/article/:id" element={<ArticlePage />} />
        <Route
          path="/roadmaps"
          element={
            <ProtectedRoute>
              <RoadmapsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmaps/:id"
          element={
            <ProtectedRoute>
              <RoadmapDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="/roadmaps/share/:publicId" element={<RoadmapDetailPage isPublic />} />
        <Route
          path="/clippings"
          element={
            <ProtectedRoute>
              <ClippingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/clippings/share/:publicId" element={<ClippingSharePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
