import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingCart, Cpu, Search } from 'lucide-react';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (navRef.current) {
      gsap.fromTo(
        navRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.5, ease: 'power3.out' }
      );
    }
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  const categories = [
    { id: 'laptops', name: 'Laptops', path: '/category/laptops' },
    { id: 'wearables', name: 'Wearables', path: '/category/wearables' },
    { id: 'audio', name: 'Audio', path: '/category/audio' },
    { id: 'devices', name: 'Devices', path: '/category/devices' },
    { id: 'consoles', name: 'Consoles', path: '/category/consoles' },
  ];

  const isOnListingPage = useMemo(
    () => location.pathname.startsWith('/category/'),
    [location.pathname]
  );

  const submitSearch = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setIsMenuOpen(false);
    navigate(`/category/all?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          isScrolled
            ? 'bg-[#0B0C0F]/90 backdrop-blur-md border-b border-white/5'
            : 'bg-transparent'
        }`}
      >
        <div className="flex items-center justify-between px-6 lg:px-12 py-5 gap-6">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to={"/"}>
            <img
              src="/images/logo.png"
              alt="4RMTECH Logo"  // Good for SEO and Screen Readers
              className="h-20 w-auto object-contain px-3" // Keeps it from being massive
            />
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            <div className="relative group">
              <button className="text-sm text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors flex items-center gap-1">
                Shop
              </button>
              {/* Dropdown */}
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#111318] border border-white/10 rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={cat.path}
                    className="block px-4 py-3 text-sm text-[#A8ACB8] hover:text-[#F4F6FA] hover:bg-white/5 transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
            
            <Link
              to="/pc-builder"
              className="text-sm text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors flex items-center gap-1"
            >
              <Cpu className="w-4 h-4" />
              PC Builder
            </Link>
            
            <button
              onClick={() => scrollToSection('repair')}
              className="text-sm text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors"
            >
              Repairs
            </button>
            <button
              onClick={() => scrollToSection('membership')}
              className="text-sm text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors"
            >
              Support
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Desktop search */}
            {!isOnListingPage && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitSearch(query);
                }}
                className="hidden lg:flex items-center gap-2"
                role="search"
                aria-label="Site search"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8ACB8]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search products..."
                    aria-label="Search products"
                    className="w-[280px] xl:w-[340px] pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm text-[#F4F6FA] placeholder:text-[#6b7280] focus:outline-none focus:border-[#D7FF3B]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-full bg-[#D7FF3B] text-[#0B0C0F] text-sm font-medium hover:bg-[#e0ff5c] transition-colors"
                >
                  Search
                </button>
              </form>
            )}

            <button className="hidden md:flex items-center gap-2 text-sm text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors">
              <ShoppingCart className="w-4 h-4" />
              <span className="font-mono text-xs">(0)</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden text-[#F4F6FA]"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-[99] bg-[#0B0C0F]/98 backdrop-blur-lg transition-all duration-500 ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-6">
          {/* Mobile search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(query);
            }}
            className="w-full max-w-sm px-8"
            role="search"
            aria-label="Site search"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A8ACB8]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-full text-base text-[#F4F6FA] placeholder:text-[#6b7280] focus:outline-none focus:border-[#D7FF3B]"
              />
            </div>
            <button
              type="submit"
              className="mt-3 w-full px-6 py-3 rounded-full bg-[#D7FF3B] text-[#0B0C0F] text-base font-semibold hover:bg-[#e0ff5c] transition-colors"
            >
              Search
            </button>
          </form>

          <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#A8ACB8] mb-4">
            Shop Categories
          </p>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.path}
              onClick={() => setIsMenuOpen(false)}
              className="text-2xl font-['Space_Grotesk'] font-semibold text-[#F4F6FA] hover:text-[#D7FF3B] transition-colors"
            >
              {cat.name}
            </Link>
          ))}
          
          <div className="w-16 h-[1px] bg-white/20 my-4" />
          
          <Link
            to="/pc-builder"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-2 text-2xl font-['Space_Grotesk'] font-semibold text-[#D7FF3B] hover:text-[#e0ff5c] transition-colors"
          >
            <Cpu className="w-6 h-6" />
            PC Builder
          </Link>
          
          <button
            onClick={() => scrollToSection('repair')}
            className="text-2xl font-['Space_Grotesk'] font-semibold text-[#F4F6FA] hover:text-[#D7FF3B] transition-colors"
          >
            Repairs
          </button>
          <button
            onClick={() => scrollToSection('membership')}
            className="text-2xl font-['Space_Grotesk'] font-semibold text-[#F4F6FA] hover:text-[#D7FF3B] transition-colors"
          >
            Support
          </button>
          
          <button className="flex items-center gap-3 mt-8 text-[#A8ACB8]">
            <ShoppingCart className="w-5 h-5" />
            <span className="font-mono text-sm">Cart (0)</span>
          </button>
        </div>
      </div>
    </>
  );
}
