import { useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface ProductSectionProps {
  id: string;
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaLink: string;
  image: string;
  imagePosition: 'left' | 'right';
  zIndex: number;
}

export default function ProductSection({
  id,
  headline,
  subheadline,
  ctaPrimary,
  ctaSecondary,
  ctaLink,
  image,
  imagePosition,
  zIndex,
}: ProductSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const imagePanelRef = useRef<HTMLDivElement>(null);
  const textPanelRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);

  const isImageLeft = imagePosition === 'left';

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
        },
      });

      // ENTRANCE (0-30%)
      scrollTl
        .fromTo(
          imagePanelRef.current,
          { x: isImageLeft ? '-60vw' : '60vw' },
          { x: 0, ease: 'none' },
          0
        )
        .fromTo(
          textPanelRef.current,
          { x: isImageLeft ? '50vw' : '-50vw' },
          { x: 0, ease: 'none' },
          0
        )
        .fromTo(
          headlineRef.current?.querySelectorAll('.word') || [],
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.02, ease: 'none' },
          0.05
        )
        .fromTo(
          subheadlineRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, ease: 'none' },
          0.1
        )
        .fromTo(
          ctaRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, ease: 'none' },
          0.12
        )
        .fromTo(
          ruleRef.current,
          { scaleX: isImageLeft ? 0 : 0, scaleY: isImageLeft ? 0 : 0 },
          {
            scaleX: isImageLeft ? 0 : 1,
            scaleY: isImageLeft ? 1 : 1,
            transformOrigin: isImageLeft ? 'top' : 'left',
            ease: 'none',
          },
          0.1
        );

      // EXIT (70-100%)
      scrollTl
        .to(
          imagePanelRef.current,
          {
            x: isImageLeft ? '-35vw' : '35vw',
            ease: 'power2.in',
          },
          0.7
        )
        .to(
          textPanelRef.current,
          {
            x: isImageLeft ? '35vw' : '-35vw',
            ease: 'power2.in',
          },
          0.7
        )
        .to(
          headlineRef.current,
          {
            y: '-10vh',
            opacity: 0.25,
            ease: 'power2.in',
          },
          0.7
        )
        .to(
          subheadlineRef.current,
          {
            y: '-6vh',
            opacity: 0.2,
            ease: 'power2.in',
          },
          0.72
        )
        .to(
          ctaRef.current,
          {
            y: '-6vh',
            opacity: 0.2,
            ease: 'power2.in',
          },
          0.74
        )
        .to(
          ruleRef.current,
          {
            scaleX: isImageLeft ? 0 : 0,
            scaleY: isImageLeft ? 0 : 0,
            transformOrigin: isImageLeft ? 'bottom' : 'right',
            ease: 'power2.in',
          },
          0.7
        );
    }, sectionRef);

    return () => ctx.revert();
  }, [isImageLeft]);

  const words = headline.split(' ');

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen overflow-hidden bg-[#0B0C0F]"
      style={{ zIndex }}
      id={id}
    >
      {/* Image panel */}
      <div
        ref={imagePanelRef}
        className={`absolute top-0 ${
          isImageLeft ? 'left-0' : 'right-0'
        } w-[56vw] h-full overflow-hidden`}
      >
        <img
          src={image}
          alt={headline}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div
          className={`absolute inset-0 ${
            isImageLeft
              ? 'bg-gradient-to-r from-transparent via-transparent to-[#0B0C0F]/80'
              : 'bg-gradient-to-l from-transparent via-transparent to-[#0B0C0F]/80'
          }`}
        />
      </div>

      {/* Text panel */}
      <div
        ref={textPanelRef}
        className={`absolute top-0 ${
          isImageLeft ? 'right-0' : 'left-0'
        } w-[44vw] h-full bg-[#0B0C0F] flex flex-col justify-center px-8 lg:px-12`}
      >
        {/* Decorative rule */}
        <div
          ref={ruleRef}
          className={`absolute ${
            isImageLeft ? 'left-[8vw] top-[18vh]' : 'left-[4vw] top-[42vh]'
          } ${isImageLeft ? 'w-[2px] h-[28vh]' : 'w-[28vw] h-[2px]'} bg-[#D7FF3B]/70`}
        />

        {/* Headline */}
        <h2
          ref={headlineRef}
          className="font-['Space_Grotesk'] text-[clamp(32px,3.6vw,56px)] font-bold text-[#F4F6FA] leading-[0.95] mb-8"
        >
          {words.map((word, i) => (
            <span key={i} className="word inline-block mr-[0.3em]">
              {word}
            </span>
          ))}
        </h2>

        {/* Subheadline */}
        <p
          ref={subheadlineRef}
          className="text-[#A8ACB8] text-base lg:text-lg max-w-[32vw] leading-relaxed mb-10"
        >
          {subheadline}
        </p>

        {/* CTA buttons */}
        <div ref={ctaRef} className="flex flex-wrap items-center gap-4">
          <Link 
            to={ctaLink}
            className="group flex items-center gap-2 px-6 py-3 bg-[#D7FF3B] text-[#0B0C0F] font-medium rounded-full hover:bg-[#e0ff5c] transition-colors"
          >
            {ctaPrimary}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            to={ctaLink}
            className="text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors underline underline-offset-4"
          >
            {ctaSecondary}
          </Link>
        </div>
      </div>

      {/* Decorative vertical rule for left-image sections */}
      {isImageLeft && (
        <div className="absolute left-[58vw] top-[18vh] w-[2px] h-[64vh] bg-[#A8ACB8]/25" />
      )}
    </section>
  );
}
