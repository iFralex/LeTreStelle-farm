import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Public pages
import Landing from './pages/Landing';
import Product from './pages/Product';
import Checkout from './pages/Checkout';
import UserOrders from './pages/UserOrders';
import UserLogin from './pages/UserLogin';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCatalog from './pages/admin/AdminCatalog';
import AdminQR from './pages/admin/AdminQR';
import AdminSettings from './pages/admin/AdminSettings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes wrapped in Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/p/:id" element={<Product />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/ordini" element={<UserOrders />} />
          <Route path="/login" element={<UserLogin />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/catalog" element={<AdminCatalog />} />
        <Route path="/admin/qr-generator" element={<AdminQR />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
      </Routes>
    </BrowserRouter>
  );
}
