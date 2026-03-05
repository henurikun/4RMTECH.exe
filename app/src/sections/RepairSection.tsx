import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Monitor, Battery, Droplets, HardDrive, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    icon: Monitor,
    title: 'Screen repair',
    description: 'Crisp replacements with proper calibration.',
  },
  {
    icon: Battery,
    title: 'Battery swap',
    description: 'Restore all-day endurance.',
  },
  {
    icon: Droplets,
    title: 'Water damage',
    description: 'Clean-up, testing, and honest advice.',
  },
  {
    icon: HardDrive,
    title: 'Data recovery',
    description: 'Rescue photos, files, and accounts.',
  },
];

export default function RepairSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    device: '',
    issue: '',
    contact: '',
  });

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Headline animation
      gsap.fromTo(
        headlineRef.current,
        { x: -60, opacity: 0 },
        {
          x: 0,
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
        { x: -40, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          delay: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: bodyRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Services list animation
      const serviceItems = servicesRef.current?.querySelectorAll('.service-item');
      if (serviceItems) {
        gsap.fromTo(
          serviceItems,
          { x: -40, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: servicesRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // Booking card animation
      gsap.fromTo(
        cardRef.current,
        { x: 60, opacity: 0, scale: 0.98 },
        {
          x: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Quote request submitted! We will contact you soon.');
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#0B0C0F] py-24 lg:py-32"
      id="repair"
    >
      {/* Decorative cross lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[30%] right-[20%] w-[30vw] h-[2px] bg-[#D7FF3B]/10 rotate-45" />
        <div className="absolute top-[50%] right-[20%] w-[30vw] h-[2px] bg-[#D7FF3B]/10 -rotate-45" />
      </div>

      <div className="relative px-8 lg:px-[8vw]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left column - Services */}
          <div>
            <h2
              ref={headlineRef}
              className="font-['Space_Grotesk'] text-[clamp(34px,3.6vw,56px)] font-bold text-[#F4F6FA] leading-[0.95] mb-6"
            >
              Fix it fast.
            </h2>

            <p
              ref={bodyRef}
              className="text-[#A8ACB8] text-base lg:text-lg leading-relaxed mb-12"
            >
              From cracked screens to battery drain, we diagnose and repair with
              quality parts.
            </p>

            {/* Services list */}
            <div ref={servicesRef} className="space-y-6">
              {services.map((service) => (
                <div
                  key={service.title}
                  className="service-item flex items-start gap-4 group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#D7FF3B]/10 flex items-center justify-center">
                    <service.icon className="w-5 h-5 text-[#D7FF3B]" />
                  </div>
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA] mb-1 group-hover:text-[#D7FF3B] transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-[#A8ACB8] text-sm">{service.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column - Booking card */}
          <div
            ref={cardRef}
            className="bg-[#0B0C0F] border-2 border-[#D7FF3B] rounded-[18px] p-6 lg:p-8"
          >
            <h3 className="font-['Space_Grotesk'] text-2xl font-semibold text-[#F4F6FA] mb-6">
              Book a repair
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="device"
                  className="block font-mono text-xs uppercase tracking-[0.12em] text-[#A8ACB8] mb-2"
                >
                  Device Type
                </label>
                <select
                  aria-label="Device type"
                  title="Device type"
                  name="device"
                  id="device"
                  value={formData.device}
                  onChange={(e) =>
                    setFormData({ ...formData, device: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-[#1a1c22] border border-[#2a2d35] rounded-xl text-[#F4F6FA] focus:border-[#D7FF3B] focus:outline-none transition-colors"
                >
                  <option value="">Select device</option>
                  <option value="phone">Smartphone</option>
                  <option value="laptop">Laptop</option>
                  <option value="tablet">Tablet</option>
                  <option value="watch">Smartwatch</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-[0.12em] text-[#A8ACB8] mb-2">
                  Issue
                </label>
                <textarea
                  value={formData.issue}
                  onChange={(e) =>
                    setFormData({ ...formData, issue: e.target.value })
                  }
                  placeholder="Describe the problem..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1a1c22] border border-[#2a2d35] rounded-xl text-[#F4F6FA] placeholder:text-[#5a5d65] focus:border-[#D7FF3B] focus:outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-[0.12em] text-[#A8ACB8] mb-2">
                  Contact
                </label>
                <input
                  type="email"
                  value={formData.contact}
                  onChange={(e) =>
                    setFormData({ ...formData, contact: e.target.value })
                  }
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-[#1a1c22] border border-[#2a2d35] rounded-xl text-[#F4F6FA] placeholder:text-[#5a5d65] focus:border-[#D7FF3B] focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                className="group w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#D7FF3B] text-[#0B0C0F] font-medium rounded-full hover:bg-[#e0ff5c] transition-colors mt-2"
              >
                Get a quote
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
