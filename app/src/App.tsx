import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import ProductListingPage from './pages/ProductListingPage';
import PCBuilderPage from './pages/PCBuilderPage';
import AdminPage from './pages/AdminPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';

gsap.registerPlugin(ScrollTrigger);

// Scroll to top on route change
function ScrollToTop() {
  const location = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
    // Kill all ScrollTriggers when changing routes
    ScrollTrigger.getAll().forEach(st => st.kill());
  }, [location]);
  
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="relative bg-[#0B0C0F] min-h-screen">
        {/* Grain overlay */}
        <div className="grain-overlay" />
        
        {/* Routes */}
        <Routes>
          <Route path="/" element={<><Navigation /><HomePage /></>} />
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
