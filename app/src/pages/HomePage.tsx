import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroSection from '../sections/HeroSection';
import CategoryCarouselSection from '../sections/CategoryCarouselSection';
import ProductSection from '../sections/ProductSection';
import MembershipSection from '../sections/MembershipSection';
import RepairSection from '../sections/RepairSection';
import FinalCTASection from '../sections/FinalCTASection';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../config/adminAuth';

gsap.registerPlugin(ScrollTrigger);

interface Product {
  id: string;
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaLink: string;
  image: string;
  imagePosition: 'left' | 'right';
}

const products: Product[] = [
  {
    id: 'laptop',
    headline: 'Power, portable.',
    subheadline: 'Ultralight builds with all-day battery and zero bloat. Set up in minutes, not hours.',
    ctaPrimary: 'See laptops',
    ctaSecondary: 'Compare specs',
    ctaLink: '/category/laptops',
    image: '/images/laptop_desk.jpg',
    imagePosition: 'right',
  },
  {
    id: 'watch',
    headline: 'Stay connected.',
    subheadline: 'Track health, notifications, and pace—without pulling out your phone.',
    ctaPrimary: 'Shop wearables',
    ctaSecondary: 'View features',
    ctaLink: '/category/wearables',
    image: '/images/watch_wrist.jpg',
    imagePosition: 'left',
  },
  {
    id: 'headphones',
    headline: 'Sound, focused.',
    subheadline: 'Noise-canceling, spatial audio, and a fit that lasts through long sessions.',
    ctaPrimary: 'Shop audio',
    ctaSecondary: 'Try the demo',
    ctaLink: '/category/audio',
    image: '/images/headphones_product.jpg',
    imagePosition: 'right',
  },
  {
    id: 'device',
    headline: 'Capture the moment.',
    subheadline: 'Pro-grade sensors, clean UI, and presets that make editing faster.',
    ctaPrimary: 'Shop devices',
    ctaSecondary: 'See creator kits',
    ctaLink: '/category/devices',
    image: '/images/camera_hand.jpg',
    imagePosition: 'left',
  },
  {
    id: 'console',
    headline: 'Play without limits.',
    subheadline: 'Fast load times, smooth multiplayer, and a library that travels with you.',
    ctaPrimary: 'Shop consoles',
    ctaSecondary: 'Browse games',
    ctaLink: '/category/consoles',
    image: '/images/console_handheld.jpg',
    imagePosition: 'right',
  },
];

export default function HomePage() {
  const mainRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      const pinned = ScrollTrigger.getAll()
        .filter(st => st.vars.pin)
        .sort((a, b) => a.start - b.start);
      
      const maxScroll = ScrollTrigger.maxScroll(window);
      
      if (!maxScroll || pinned.length === 0) return;

      const pinnedRanges = pinned.map(st => ({
        start: st.start / maxScroll,
        end: (st.end ?? st.start) / maxScroll,
        center: (st.start + ((st.end ?? st.start) - st.start) * 0.5) / maxScroll,
      }));

      ScrollTrigger.create({
        snap: {
          snapTo: (value: number) => {
            const inPinned = pinnedRanges.some(
              r => value >= r.start - 0.02 && value <= r.end + 0.02
            );
            if (!inPinned) return value;

            const target = pinnedRanges.reduce(
              (closest, r) =>
                Math.abs(r.center - value) < Math.abs(closest - value)
                  ? r.center
                  : closest,
              pinnedRanges[0]?.center ?? 0
            );
            return target;
          },
          duration: { min: 0.15, max: 0.35 },
          delay: 0,
          ease: 'power2.out',
        },
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  const handleAdminLogin = (event: React.FormEvent) => {
    event.preventDefault();
    const emailOk = adminEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const passwordOk = adminPassword === ADMIN_PASSWORD;
    if (!emailOk || !passwordOk) {
      setAdminError('Invalid admin credentials.');
      return;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('4rmtech_admin', 'true');
    }

    setAdminError('');
    setShowAdminLogin(false);
    setAdminPassword('');
    navigate('/admin');
  };

  return (
    <div ref={mainRef} className="relative">
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Category carousel */}
      <CategoryCarouselSection
        items={products.map(({ id, headline, subheadline, ctaPrimary, ctaLink, image }) => ({
          id,
          headline,
          subheadline,
          ctaPrimary,
          ctaLink,
          image,
        }))}
      />
      
      {/* Product Sections */}
      {products.map((product, index) => (
        <ProductSection
          key={product.id}
          {...product}
          zIndex={20 + index * 10}
        />
      ))}
      
      {/* Membership Section */}
      <MembershipSection />
      
      {/* Repair Section */}
      <RepairSection />
      
      {/* Final CTA Section */}
      <FinalCTASection />
      {/* Subtle admin login dot in footer */}
      <button
        type="button"
        onClick={() => {
          setShowAdminLogin(true);
          setAdminError('');
        }}
        aria-label="Admin login"
        className="fixed bottom-4 right-6 w-2 h-2 rounded-full bg-[#FFD700]/70 hover:bg-[#FFD700] transition-colors shadow-sm"
      />

      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-end justify-end pointer-events-none">
          <div className="pointer-events-auto m-4 w-full max-w-xs rounded-2xl bg-[#050609]/95 border border-white/10 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-[#F4F6FA]">Admin Login</p>
              <button
                type="button"
                onClick={() => {
                  setShowAdminLogin(false);
                  setAdminPassword('');
                  setAdminError('');
                }}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-[#F4F6FA] flex items-center justify-center text-xs"
                aria-label="Close admin login"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-2">
              <div className="space-y-1">
                <label
                  htmlFor="home-admin-email"
                  className="text-[11px] font-medium text-[#A8ACB8]"
                >
                  Email
                </label>
                <input
                  id="home-admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="home-admin-password"
                  className="text-[11px] font-medium text-[#A8ACB8]"
                >
                  Password
                </label>
                <input
                  id="home-admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
                />
              </div>
              {adminError && (
                <p className="text-[11px] text-red-400">{adminError}</p>
              )}
              <button
                type="submit"
                  className="w-full mt-1 px-3 py-2 rounded-full bg-[#FFD700] text-[#070A15] text-xs font-semibold hover:bg-[#ffe44d] transition-colors"
              >
                Enter
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
