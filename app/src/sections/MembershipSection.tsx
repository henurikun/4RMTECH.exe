import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Zap, Wrench, Headphones } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const perks = [
  {
    icon: Zap,
    title: 'Early access',
    description: 'Be first to new drops and limited colorways.',
  },
  {
    icon: Wrench,
    title: 'Repair credits',
    description: 'Save on screen swaps, battery swaps, and diagnostics.',
  },
  {
    icon: Headphones,
    title: 'Priority support',
    description: 'Fast replies, clear answers, no scripts.',
  },
];

export default function MembershipSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const quoteRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Headline and body animation
      gsap.fromTo(
        headlineRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: headlineRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      gsap.fromTo(
        bodyRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          delay: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: bodyRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Cards stagger animation
      cardsRef.current.forEach((card, i) => {
        if (card) {
          gsap.fromTo(
            card,
            { y: 80, opacity: 0, rotate: -2 },
            {
              y: 0,
              opacity: 1,
              rotate: 0,
              duration: 0.7,
              delay: i * 0.12,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                toggleActions: 'play none none reverse',
              },
            }
          );
        }
      });

      // Quote line animation
      gsap.fromTo(
        lineRef.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: quoteRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      gsap.fromTo(
        quoteRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          delay: 0.3,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: quoteRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#1E3A8A] py-24 lg:py-32"
      id="membership"
    >
      {/* Decorative lime lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[40vw] h-[2px] bg-[#FFD700]/12 rotate-12" />
        <div className="absolute top-[60%] right-[5%] w-[30vw] h-[2px] bg-[#FFD700]/12 -rotate-6" />
      </div>

      <div className="relative px-8 lg:px-[8vw]">
        {/* Headline */}
        <h2
          ref={headlineRef}
          className="font-['Space_Grotesk'] text-[clamp(34px,3.6vw,56px)] font-bold text-[#F4F6FA] leading-[0.95] mb-6 max-w-[52vw]"
        >
          Join the inner circle.
        </h2>

        {/* Body text */}
        <p
          ref={bodyRef}
          className="text-[#F4F6FA]/80 text-base lg:text-lg max-w-[38vw] leading-relaxed mb-16"
        >
          Members get early drops, repair discounts, and a direct line to support
          that actually reads the details.
        </p>

        {/* Perk cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-20">
          {perks.map((perk, i) => (
            <div
              key={perk.title}
              ref={(el) => { cardsRef.current[i] = el; }}
              className="bg-[#070A15]/80 backdrop-blur rounded-[18px] p-6 lg:p-8 border-t-2 border-[#FFD700]"
            >
              <perk.icon className="w-8 h-8 text-[#FFD700] mb-4" />
              <h3 className="font-['Space_Grotesk'] text-xl font-semibold text-[#F4F6FA] mb-2">
                {perk.title}
              </h3>
              <p className="text-[#A8ACB8] text-sm leading-relaxed">
                {perk.description}
              </p>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div className="relative">
          <div
            ref={lineRef}
            className="absolute -left-4 top-0 w-1 h-full bg-[#FFD700] origin-top"
          />
          <div ref={quoteRef} className="pl-8">
            <blockquote className="font-['Space_Grotesk'] text-xl lg:text-2xl text-[#F4F6FA] leading-relaxed mb-4 max-w-[52vw]">
              "I've stopped buying tech anywhere else. Setup is clean, support is
              human, and the repair turnarounds are fast."
            </blockquote>
            <cite className="font-mono text-sm text-[#F4F6FA]/60 not-italic">
              — Mina R., designer
            </cite>
          </div>
        </div>
      </div>
    </section>
  );
}
