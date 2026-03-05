import { useRef, useLayoutEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Mail, MapPin, Clock } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function FinalCTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const newsletterRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState('');

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Headline animation
      gsap.fromTo(
        headlineRef.current,
        { y: 50, opacity: 0 },
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
        subheadlineRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          delay: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: subheadlineRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      gsap.fromTo(
        ctaRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          delay: 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Contact items animation
      const contactItems = contactRef.current?.querySelectorAll('.contact-item');
      if (contactItems) {
        gsap.fromTo(
          contactItems,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: contactRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      gsap.fromTo(
        newsletterRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: newsletterRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Thanks for subscribing with ${email}!`);
    setEmail('');
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#D7FF3B] py-24 lg:py-32"
    >
      {/* Decorative diagonal lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-[40vw] h-[2px] bg-[#0B0C0F]/8 rotate-[25deg]" />
        <div className="absolute top-[30%] right-[10%] w-[30vw] h-[2px] bg-[#0B0C0F]/8 -rotate-[15deg]" />
        <div className="absolute bottom-[20%] left-[20%] w-[25vw] h-[2px] bg-[#0B0C0F]/8 rotate-[35deg]" />
      </div>

      <div className="relative px-8 lg:px-[8vw]">
        {/* Main CTA */}
        <div className="text-center mb-16">
          <h2
            ref={headlineRef}
            className="font-['Space_Grotesk'] text-[clamp(40px,5vw,72px)] font-bold text-[#0B0C0F] leading-[0.95] mb-6"
          >
            Ready when you are.
          </h2>

          <p
            ref={subheadlineRef}
            className="text-[#1A1C22] text-base lg:text-lg max-w-md mx-auto leading-relaxed mb-8"
          >
            Shop new gear, book a repair, or ask a question. We'll keep it simple.
          </p>

          <div ref={ctaRef} className="flex flex-wrap items-center justify-center gap-4">
            <Link 
              to="/category/laptops"
              className="group flex items-center gap-2 px-8 py-4 bg-[#0B0C0F] text-[#D7FF3B] font-medium rounded-full hover:bg-[#1a1c22] transition-colors"
            >
              Start shopping
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="mailto:hello@4rmtech.studio"
              className="text-[#0B0C0F] hover:text-[#1A1C22] transition-colors underline underline-offset-4"
            >
              Email support
            </a>
          </div>
        </div>

        {/* Contact info */}
        <div
          ref={contactRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-4xl mx-auto"
        >
          <div className="contact-item flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0B0C0F]/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#0B0C0F]" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0C0F]/60 mb-1">
                Email
              </p>
              <p className="text-[#0B0C0F] font-medium">hello@4rmtech.studio</p>
            </div>
          </div>

          <div className="contact-item flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0B0C0F]/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#0B0C0F]" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0C0F]/60 mb-1">
                Location
              </p>
              <p className="text-[#0B0C0F] font-medium">Downtown Workshop</p>
              <p className="text-[#0B0C0F]/70 text-sm">Open 9am–7pm</p>
            </div>
          </div>

          <div className="contact-item flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0B0C0F]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#0B0C0F]" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0C0F]/60 mb-1">
                Support
              </p>
              <p className="text-[#0B0C0F] font-medium">Remote support</p>
              <p className="text-[#0B0C0F]/70 text-sm">7 days a week</p>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div
          ref={newsletterRef}
          className="max-w-xl mx-auto border-t border-[#0B0C0F]/20 pt-10"
        >
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0C0F]/60 mb-4 text-center">
            Get drops + repair tips
          </p>

          <form onSubmit={handleSubscribe} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="flex-1 px-5 py-3 bg-[#0B0C0F] border-none rounded-full text-[#F4F6FA] placeholder:text-[#A8ACB8] focus:outline-none focus:ring-2 focus:ring-[#0B0C0F]/30"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-[#0B0C0F] text-[#D7FF3B] font-medium rounded-full hover:bg-[#1a1c22] transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-[#0B0C0F]/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-['Space_Grotesk'] text-xl font-bold text-[#0B0C0F]">
            4RMTECH
          </p>
          <p className="text-[#0B0C0F]/60 text-sm">
            © 2026 4RMTECH. All rights reserved.
          </p>
        </div>
      </div>
    </section>
  );
}
