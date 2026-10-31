import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useParams } from 'react-router-dom';
import ScrollToTop from './components/common/ScrollToTop';
import { AuthProvider } from './features/auth/context/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import HomePage from './features/homestays/pages/HomePage';
import HomestayDetailPage from './features/homestays/pages/HomestayDetailPage';
import SearchResultsPage from './features/homestays/pages/SearchResultsPage';
import RoomDetailPage from './features/rooms/pages/RoomDetailPage';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage';
import AccountPage from './features/account/pages/AccountPage';
import CustomerBookingsPage from './features/bookings/pages/CustomerBookingsPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ForbiddenPage from './pages/ForbiddenPage';

import ManagerLayout from './features/manager/layouts/ManagerLayout';
import ManagerHomestayPage from './features/manager/pages/ManagerHomestayPage';
import ManagerRoomsPage from './features/manager/pages/ManagerRoomsPage';
import ManagerRoomDetailPage from './features/manager/pages/ManagerRoomDetailPage';
import ManagerRoomTypesPage from './features/manager/pages/ManagerRoomTypesPage';
import ManagerPriceRulesPage from './features/manager/pages/ManagerPriceRulesPage';

function SearchResultsRoute() {
  const location = useLocation();
  return <SearchResultsPage key={location.search} />;
}

function HomestayDetailRoute() {
  const { homestayId } = useParams();
  return <HomestayDetailPage key={homestayId} />;
}

function RoomDetailRoute() {
  const { roomId } = useParams();
  return <RoomDetailPage key={roomId} />;
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            {/* Trang chủ & Danh sách homestay */}
            <Route path="/" element={<HomePage />} />
            <Route path="/homestays" element={<Navigate to="/search" replace />} />

            {/* Tra cứu homestay (API-PUB-05) */}
            <Route path="/search" element={<SearchResultsRoute />} />

            {/* Chi tiết homestay (API-PUB-02, room-types) */}
            <Route path="/homestays/:homestayId" element={<HomestayDetailRoute />} />

            {/* Chi tiết phòng & Giá cơ bản (API-PUB-06) */}
            <Route path="/rooms/:roomId" element={<RoomDetailRoute />} />

            {/* Xác thực (Tuần 2) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Hồ sơ cá nhân được bảo vệ (Tuần 2) */}
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />

            {/* Chuyến đi / Booking của khách hàng (API-CUS-02) */}
            <Route
              path="/customer/bookings"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CustomerBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/bookings" element={<Navigate to="/customer/bookings" replace />} />

            {/* Khu vực Quản lý Homestay & Phòng (Tuần 3: API-MGR-01 đến 07) */}
            <Route
              path="/manager"
              element={
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <ManagerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="homestay" replace />} />
              <Route path="homestay" element={<ManagerHomestayPage />} />
              <Route path="rooms" element={<ManagerRoomsPage />} />
              <Route path="rooms/:roomId" element={<ManagerRoomDetailPage />} />
              <Route path="room-types" element={<ManagerRoomTypesPage />} />
              <Route path="price-rules" element={<ManagerPriceRulesPage />} />
            </Route>

            {/* Trang 403 Forbidden */}
            <Route path="/403" element={<ForbiddenPage />} />

            {/* 404 Fallback */}
            <Route
              path="*"
              element={
                <div className="py-20 text-center space-y-4">
                  <h1 className="text-4xl font-bold text-[var(--color-ink)]">404</h1>
                  <p className="text-base text-[var(--color-muted)]">
                    Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
                  </p>
                  <div>
                    <Link
                      to="/"
                      className="inline-flex items-center justify-center h-10 px-5 rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                    >
                      Về trang chủ
                    </Link>
                  </div>
                </div>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
