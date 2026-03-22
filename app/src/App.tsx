import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuth } from './context/AuthContext';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import ProductListingPage from './pages/ProductListingPage';
import PCBuilderPage from './pages/PCBuilderPage';
import AdminPage from './pages/AdminPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';

gsap.registerPlugin(ScrollTrigger);

// Scroll to top on route change; only kill ScrollTriggers when navigating away (not on refresh/initial load)
function ScrollToTop() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
    const currentPath = location.pathname;
    if (prevPathRef.current !== currentPath) {
      ScrollTrigger.getAll().forEach((st) => st.kill());
      prevPathRef.current = currentPath;
    } else {
      prevPathRef.current = currentPath;
    }
  }, [location]);

  return null;
}

/** Keeps API session in sync after client-side navigation (e.g. admin → home). */
function AuthSessionSync() {
  const location = useLocation();
  const { refreshUser } = useAuth();

  useEffect(() => {
    void refreshUser();
  }, [location.pathname, refreshUser]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthSessionSync />
      <ScrollToTop />
      <div className="relative min-h-screen">
        {/* Grain overlay */}
        <div className="grain-overlay" />
        
        {/* Routes */}
        <Routes>
          <Route path="/" element={<><Navigation /><HomePage /></>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/category/:category" element={<ProductListingPage />} />
          <Route path="/pc-builder" element={<PCBuilderPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
