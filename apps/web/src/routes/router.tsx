import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/dashboard-layout';
import { ProtectedRoute } from './protected-route';
import { LoginPage } from '@/pages/auth/login';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { ResetPasswordPage } from '@/pages/auth/reset-password';
import { UnauthorizedPage } from '@/pages/unauthorized';
import { NotFoundPage } from '@/pages/not-found';
import { AdminDashboardPage } from '@/pages/admin/dashboard';
import { CategoriesPage } from '@/pages/admin/categories';
import { MenusPage } from '@/pages/admin/menus';
import { QuotationsPage } from '@/pages/admin/quotations';
import { CustomerRequestsPage } from '@/pages/admin/customer-requests';
import { EventMediaPage } from '@/pages/admin/event-media';
import { UsersPage } from '@/pages/admin/users';
import { SettingsPage } from '@/pages/admin/settings';
import { AdminNotificationsPage } from '@/pages/admin/notifications';
import { StaffDashboardPage } from '@/pages/staff/dashboard';
import { StaffGalleryPage } from '@/pages/staff/gallery';
import { CustomerPortalPage } from '@/pages/customer/portal';
import { CustomerLoginPage } from '@/pages/customer/login';
import { CustomerTrackPage } from '@/pages/customer/track';
import { CustomerAgreementPage } from '@/pages/customer/agreement';
import { CustomerGalleryPage } from '@/pages/customer/gallery';
import { PublicLandingPage } from '@/pages/public/landing';

export const router = createBrowserRouter([
  { path: '/', element: <PublicLandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },

  /* Customer Portal */
  { path: '/customer', element: <CustomerPortalPage /> },
  { path: '/customer/portal', element: <CustomerPortalPage /> },
  { path: '/customer/login', element: <CustomerLoginPage /> },
  { path: '/customer/track', element: <CustomerTrackPage /> },
  { path: '/customer/agreement', element: <CustomerAgreementPage /> },
  { path: '/customer/gallery', element: <CustomerGalleryPage /> },

  /* Public event pages */
  { path: '/event/selfie', element: <Navigate to="/" replace /> },
  { path: '/event/review', element: <Navigate to="/" replace /> },

  /* Admin */
  {
    element: <ProtectedRoute roles={['ADMIN']} />,
    children: [
      {
        path: '/admin',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: 'dashboard', element: <AdminDashboardPage /> },
          { path: 'categories', element: <CategoriesPage /> },
          { path: 'items', element: <Navigate to="/admin/categories" replace /> },
          { path: 'menus', element: <MenusPage /> },
          { path: 'quotations', element: <QuotationsPage /> },
          { path: 'customer-requests', element: <CustomerRequestsPage /> },
          { path: 'event-media', element: <Navigate to="/admin/event-media/gallery" replace /> },
          { path: 'event-media/gallery', element: <EventMediaPage section="gallery" /> },
          { path: 'event-media/testimonials', element: <EventMediaPage section="testimonials" /> },
          { path: 'event-media/selfies', element: <Navigate to="/admin/event-media/gallery" replace /> },
          { path: 'event-media/reviews', element: <Navigate to="/admin/event-media/gallery" replace /> },
          { path: 'event-media/staff-uploads', element: <Navigate to="/admin/event-media/gallery" replace /> },
          { path: 'notifications', element: <AdminNotificationsPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },

  /* Staff */
  {
    element: <ProtectedRoute roles={['STAFF']} />,
    children: [
      {
        path: '/staff',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="/staff/dashboard" replace /> },
          { path: 'dashboard', element: <StaffDashboardPage /> },
          { path: 'gallery', element: <StaffGalleryPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);
