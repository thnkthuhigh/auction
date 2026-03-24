import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import AdminRoute from '@/components/common/AdminRoute';
import AdminLayout from '@/components/layout/AdminLayout';

// Pages – TV4
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import AdminHomePage from '@/pages/admin/AdminHomePage';
import AdminReviewQueuePage from '@/pages/admin/AdminReviewQueuePage';
import AdminSessionConfigPage from '@/pages/admin/AdminSessionConfigPage';
import AdminMonitoringPage from '@/pages/admin/AdminMonitoringPage';

// Pages – TV5
import AuctionListPage from '@/pages/auction/AuctionListPage';
import AuctionDetailPage from '@/pages/auction/AuctionDetailPage';
import CreateAuctionPage from '@/pages/auction/CreateAuctionPage';

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
        />

        {/* Protected main layout routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<AuctionListPage />} />
          <Route path="/auctions" element={<AuctionListPage />} />
          <Route path="/auctions/:id" element={<AuctionDetailPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/auctions/create" element={<CreateAuctionPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminHomePage />} />
              <Route path="/admin/reviews" element={<AdminReviewQueuePage />} />
              <Route path="/admin/sessions" element={<AdminSessionConfigPage />} />
              <Route path="/admin/monitoring" element={<AdminMonitoringPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
