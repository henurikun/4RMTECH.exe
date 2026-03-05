import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroSection from '../sections/HeroSection';
import CategoryCarouselSection from '../sections/CategoryCarouselSection';
import ProductSection from '../sections/ProductSection';
import MembershipSection from '../sections/MembershipSection';
import RepairSection from '../sections/RepairSection';
import FinalCTASection from '../sections/FinalCTASection';

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
    id: 'camera',
    headline: 'Capture the moment.',
    subheadline: 'Pro-grade sensors, clean UI, and presets that make editing faster.',
    ctaPrimary: 'Shop cameras',
    ctaSecondary: 'See creator kits',
    ctaLink: '/category/cameras',
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

  return (
    <div ref={mainRef} className="relative bg-[#0B0C0F]">
      {/* Grain overlay */}
      <div className="grain-overlay" />
      
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
    </div>
  );
}
