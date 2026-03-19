import { useEffect, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
//hi
gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const imagePanelRef = useRef<HTMLDivElement>(null);
  const textPanelRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);

  // Auto-play entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        imagePanelRef.current,
        { x: '-60vw' },
        { x: 0, duration: 0.9 }
      )
        .fromTo(
          textPanelRef.current,
          { x: '40vw' },
          { x: 0, duration: 0.9 },
          0
        )
        .fromTo(
          chipRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5 },
          0.4
        )
        .fromTo(
          headlineRef.current?.querySelectorAll('.word') || [],
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.06 },
          0.3
        )
        .fromTo(
          subheadlineRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          0.5
        )
        .fromTo(
          ctaRef.current,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          0.6
        )
        .fromTo(
          ruleRef.current,
          { scaleY: 0 },
          { scaleY: 1, duration: 0.8, transformOrigin: 'top' },
          0.5
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Scroll-driven exit animation
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
          onLeaveBack: () => {
            // Reset all elements to visible when scrolling back to top
            gsap.set(imagePanelRef.current, { x: 0, opacity: 1 });
            gsap.set(textPanelRef.current, { x: 0, opacity: 1 });
            gsap.set(headlineRef.current, { y: 0, opacity: 1, scale: 1 });
            gsap.set(subheadlineRef.current, { y: 0, opacity: 1 });
            gsap.set(ctaRef.current, { y: 0, opacity: 1 });
            gsap.set(ruleRef.current, { scaleY: 1 });
          },
        },
      });

      // ENTRANCE (0-30%): Hold (already animated in)
      // SETTLE (30-70%): Hold
      // EXIT (70-100%): Exit animations

      scrollTl
        .fromTo(
          imagePanelRef.current,
          { x: 0 },
          { x: '-35vw', ease: 'power2.in' },
          0.7
        )
        .fromTo(
          textPanelRef.current,
          { x: 0 },
          { x: '35vw', ease: 'power2.in' },
          0.7
        )
        .fromTo(
          headlineRef.current,
          { y: 0, opacity: 1, scale: 1 },
          { y: '-10vh', opacity: 0.3, scale: 0.98, ease: 'power2.in' },
          0.7
        )
        .fromTo(
          subheadlineRef.current,
          { y: 0, opacity: 1 },
          { y: '-6vh', opacity: 0.2, ease: 'power2.in' },
          0.72
        )
        .fromTo(
          ctaRef.current,
          { y: 0, opacity: 1 },
          { y: '-6vh', opacity: 0.2, ease: 'power2.in' },
          0.74
        )
        .fromTo(
          ruleRef.current,
          { scaleY: 1 },
          { scaleY: 0.2, transformOrigin: 'top', ease: 'power2.in' },
          0.7
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen overflow-hidden z-10"
    >
      {/* Left image panel */}
      <div
        ref={imagePanelRef}
        className="absolute left-0 top-0 w-[56vw] h-full overflow-hidden"
      >
        <img
          src="/images/bg2.jpg"
          alt="Hand holding smartphone"
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay for smooth transition */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#070A15]/80" />
      </div>

      {/* Right text panel */}
      <div
        ref={textPanelRef}
        className="absolute right-0 top-0 w-[44vw] h-full bg-[#070A15]/95 flex flex-col justify-center px-8 lg:px-12"
      >
        {/* New chip */}
        <div
          ref={chipRef}
          className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 bg-[#FFD700]/10 rounded-full w-fit"
        >
          <span className="w-2 h-2 bg-[#FFD700] rounded-full animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#FFD700]">
            New Drop
          </span>
        </div>

        {/* Headline */}
        <h1
          ref={headlineRef}
          className="font-['Space_Grotesk'] text-[clamp(36px,4vw,40px)] font-bold text-[#F4F6FA] leading-[0.95] mb-8"
        >
          <span className="word inline-block">4rmTech,</span>{' '}
          <span className="word inline-block">tuned</span>{' '}
          <span className="word inline-block">to</span>{' '}
          <span className="word inline-block">you.</span>
        </h1>

        {/* Subheadline */}
        <p
          ref={subheadlineRef}
          className="text-[#A8ACB8] text-base lg:text-lg max-w-[30vw] leading-relaxed mb-10"
        >
          Premium devices, clean setup, and repairs that actually stick—built for
          how you work and play.
        </p>

        {/* CTA buttons */}
        <div ref={ctaRef} className="flex flex-wrap items-center gap-4">
          <Link 
            to="/category/all"
            className="group flex items-center gap-2 px-6 py-3 bg-[#FFD700] text-[#070A15] font-medium rounded-full hover:bg-[#ffe44d] transition-colors"
          >
            Browse
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button 
            onClick={() => document.getElementById('repair')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors underline underline-offset-4"
          >
            Book a repair
          </button>
        </div>
      </div>

      {/* Decorative vertical rule */}
      <div
        ref={ruleRef}
        className="absolute right-[6vw] top-[18vh] w-[2px] h-[64vh] bg-[#A8ACB8]/25"
      />
    </section>
  );
}
