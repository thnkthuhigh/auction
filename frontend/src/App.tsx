import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import AdminRoute from '@/components/common/AdminRoute';
import AdminLayout from '@/components/layout/AdminLayout';
import SellerLayout from '@/components/layout/SellerLayout';

import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import HomePage from '@/pages/HomePage';
import NewsPage from '@/pages/NewsPage';
import AboutPage from '@/pages/AboutPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import AdminHomePage from '@/pages/admin/AdminHomePage';
import AdminReviewQueuePage from '@/pages/admin/AdminReviewQueuePage';
import AdminSessionConfigPage from '@/pages/admin/AdminSessionConfigPage';
import AdminUserManagementPage from '@/pages/admin/AdminUserManagementPage';
import AdminMonitoringPage from '@/pages/admin/AdminMonitoringPage';
import AdminHistoryDataPage from '@/pages/admin/AdminHistoryDataPage';
import AdminReportsPage from '@/pages/admin/AdminReportsPage';
import AuctionListPage from '@/pages/auction/AuctionListPage';
import AuctionDetailPage from '@/pages/auction/AuctionDetailPage';
import SellerNewProductPage from '@/pages/seller/SellerNewProductPage';
import SellerProductsPage from '@/pages/seller/SellerProductsPage';
import SellerTrackingPage from '@/pages/seller/SellerTrackingPage';
import SellerResultsPage from '@/pages/seller/SellerResultsPage';
import SellerEditProductPage from '@/pages/seller/SellerEditProductPage';

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
        />

        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<AuctionListPage />} />
          <Route path="/auctions" element={<AuctionListPage />} />
          <Route path="/auctions/:id" element={<AuctionDetailPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/about" element={<AboutPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/auctions/:id/live" element={<AuctionDetailPage />} />
            <Route
              path="/auctions/create"
              element={<Navigate to="/seller/new-product" replace />}
            />
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<SellerLayout />}>
              <Route path="/seller" element={<Navigate to="/seller/new-product" replace />} />
              <Route path="/seller/new-product" element={<SellerNewProductPage />} />
              <Route path="/seller/products" element={<SellerProductsPage />} />
              <Route path="/seller/products/:id/edit" element={<SellerEditProductPage />} />
              <Route path="/seller/tracking" element={<SellerTrackingPage />} />
              <Route path="/seller/results" element={<SellerResultsPage />} />
            </Route>
          </Route>

          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminHomePage />} />
              <Route path="/admin/reviews" element={<AdminReviewQueuePage />} />
              <Route path="/admin/sessions" element={<AdminSessionConfigPage />} />
              <Route path="/admin/users" element={<AdminUserManagementPage />} />
              <Route path="/admin/monitoring" element={<AdminMonitoringPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/history" element={<AdminHistoryDataPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
