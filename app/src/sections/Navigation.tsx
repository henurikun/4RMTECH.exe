import { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Menu, X, ShoppingCart } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

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

  return (
    <>
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${isScrolled
            ? 'bg-[#070A15]/85 backdrop-blur-md border-b border-white/10'
            : 'bg-transparent'
          }`}
      >
        <div className="flex items-center justify-between px-6 lg:px-12 py-5">
          {/* Logo */}
          <div className="flex-shrink-0">
            <img
              src="/images/logo.png"
              alt="4RMTECH Logo"  // Good for SEO and Screen Readers
              className="h-10 w-auto object-contain" // Keeps it from being massive
            />
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">

            <button
              onClick={() => scrollToSection('products')}
              className="text-sm text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors"
            >
              Shop
            </button>
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
          <div className="flex items-center gap-6">
            <button className="hidden md:flex items-center gap-2 text-sm text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors">
              <ShoppingCart className="w-4 h-4" />
              <span className="font-mono text-xs">(0)</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-[#F4F6FA]"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-[99] bg-[#070A15]/96 backdrop-blur-lg transition-all duration-500 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          <button
            onClick={() => scrollToSection('products')}
            className="text-3xl font-['Space_Grotesk'] font-semibold text-[#F4F6FA] hover:text-[#FFD700] transition-colors"
          >
            Shop
          </button>
          <button
            onClick={() => scrollToSection('repair')}
            className="text-3xl font-['Space_Grotesk'] font-semibold text-[#F4F6FA] hover:text-[#FFD700] transition-colors"
          >
            Repairs
          </button>
          <button
            onClick={() => scrollToSection('membership')}
            className="text-3xl font-['Space_Grotesk'] font-semibold text-[#F4F6FA] hover:text-[#FFD700] transition-colors"
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
