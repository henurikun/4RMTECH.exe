import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Monitor, Battery, Droplets, HardDrive, ArrowRight, CheckCircle } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const REPAIRS_STORAGE_KEY = '4rmtech_repairs';
const REPAIR_RESPONSES_STORAGE_KEY = '4rmtech_repair_responses';

export interface RepairRequest {
  id: string;
  name: string;
  device: string;
  issue: string;
  contact: string;
  createdAt: number;
}

interface RepairResponse {
  repairId: string;
  status: string;
  message: string;
  updatedAt: number;
}

function saveRepairRequest(request: RepairRequest) {
  try {
    const raw = window.localStorage.getItem(REPAIRS_STORAGE_KEY);
    const list: RepairRequest[] = raw ? JSON.parse(raw) : [];
    list.unshift(request);
    window.localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function getRepairResponse(repairId: string): RepairResponse | null {
  try {
    const raw = window.localStorage.getItem(REPAIR_RESPONSES_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, RepairResponse>) : {};
    const res = parsed?.[repairId];
    return res ?? null;
  } catch {
    return null;
  }
}

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
    name: '',
    device: '',
    issue: '',
    contact: '',
  });
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [lookupRef, setLookupRef] = useState('');
  const [lookupResult, setLookupResult] = useState<RepairResponse | null>(null);
  const [lookupError, setLookupError] = useState('');

  const submittedResponse = submittedRef ? getRepairResponse(submittedRef) : null;

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
    setSubmitError('');
    const name = formData.name.trim();
    const device = formData.device.trim();
    const issue = formData.issue.trim();
    const contact = formData.contact.trim();
    if (!name || !device || !issue || !contact) {
      setSubmitError('Please fill in all fields.');
      return;
    }
    const id = `REP-${Date.now()}`;
    const request: RepairRequest = {
      id,
      name,
      device,
      issue,
      contact,
      createdAt: Date.now(),
    };
    saveRepairRequest(request);
    setSubmittedRef(id);
    setFormData({ name: '', device: '', issue: '', contact: '' });
  };

  const resetForm = () => {
    setSubmittedRef(null);
    setSubmitError('');
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    const ref = lookupRef.trim();
    if (!ref) {
      setLookupError('Enter your repair reference.');
      setLookupResult(null);
      return;
    }
    const res = getRepairResponse(ref);
    if (!res) {
      setLookupError('No admin response yet. Please check again later.');
      setLookupResult(null);
      return;
    }
    setLookupResult(res);
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-24 lg:py-32"
      id="repair"
    >
      {/* Decorative cross lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[30%] right-[20%] w-[30vw] h-[2px] bg-[#FFD700]/10 rotate-45" />
        <div className="absolute top-[50%] right-[20%] w-[30vw] h-[2px] bg-[#FFD700]/10 -rotate-45" />
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
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
                    <service.icon className="w-5 h-5 text-[#FFD700]" />
                  </div>
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA] mb-1 group-hover:text-[#FFD700] transition-colors">
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
            className="bg-[#070A15]/80 backdrop-blur border-2 border-[#FFD700] rounded-[18px] p-6 lg:p-8"
          >
            {submittedRef ? (
              <div className="text-center py-4">
                <div className="inline-flex w-14 h-14 rounded-full bg-[#FFD700]/20 items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-[#FFD700]" />
                </div>
                <h3 className="font-['Space_Grotesk'] text-xl font-semibold text-[#F4F6FA] mb-2">
                  Request received
                </h3>
                <p className="text-[#A8ACB8] text-sm mb-4">
                  We&apos;ll contact you soon with a quote. Keep this reference for your records.
                </p>
                <p className="font-mono text-lg font-bold text-[#FFD700] mb-6">
                  {submittedRef}
                </p>
                {submittedResponse ? (
                  <div className="mt-4 text-left rounded-2xl bg-white/5 border border-white/10 p-4">
                    <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#A8ACB8] mb-2">
                      Admin response • {submittedResponse.status}
                    </p>
                    <p className="text-sm text-[#F4F6FA] whitespace-pre-wrap">
                      {submittedResponse.message || '—'}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[#6B7280] mb-6">
                    No admin response yet. You can check status below anytime.
                  </p>
                )}
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm text-[#A8ACB8] hover:text-[#F4F6FA] underline underline-offset-4"
                >
                  Book another repair
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-['Space_Grotesk'] text-2xl font-semibold text-[#F4F6FA] mb-6">
                  Book a repair
                </h3>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="repair-name"
                      className="block font-mono text-xs uppercase tracking-[0.12em] text-[#A8ACB8] mb-2"
                    >
                      Your name
                    </label>
                    <input
                      type="text"
                      id="repair-name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Full name"
                      className="w-full px-4 py-3 bg-[#1a1c22] border border-[#2a2d35] rounded-xl text-[#F4F6FA] placeholder:text-[#5a5d65] focus:border-[#FFD700] focus:outline-none transition-colors"
                    />
                  </div>

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
                  className="w-full px-4 py-3 bg-[#1a1c22] border border-[#2a2d35] rounded-xl text-[#F4F6FA] focus:border-[#FFD700] focus:outline-none transition-colors"
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
                  className="w-full px-4 py-3 bg-[#1a1c22] border border-[#2a2d35] rounded-xl text-[#F4F6FA] placeholder:text-[#5a5d65] focus:border-[#FFD700] focus:outline-none transition-colors resize-none"
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
                  className="w-full px-4 py-3 bg-[#1a1c22] border border-[#2a2d35] rounded-xl text-[#F4F6FA] placeholder:text-[#5a5d65] focus:border-[#FFD700] focus:outline-none transition-colors"
                />
              </div>

                  {submitError && (
                    <p className="text-sm text-red-400">{submitError}</p>
                  )}

                  <button
                    type="submit"
                    className="group w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#FFD700] text-[#070A15] font-medium rounded-full hover:bg-[#ffe44d] transition-colors mt-2"
                  >
                    Get a quote
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-xs font-mono uppercase tracking-[0.12em] text-[#A8ACB8] mb-3">
                    Check repair status
                  </p>
                  <form onSubmit={handleLookup} className="space-y-3">
                    <input
                      value={lookupRef}
                      onChange={(e) => setLookupRef(e.target.value)}
                      placeholder="Enter reference (e.g. REP-1234567890)"
                      className="w-full px-4 py-3 bg-[#1a1c22] border border-[#2a2d35] rounded-xl text-[#F4F6FA] placeholder:text-[#5a5d65] focus:border-[#FFD700] focus:outline-none transition-colors"
                    />
                    {lookupError && <p className="text-sm text-[#A8ACB8]">{lookupError}</p>}
                    {lookupResult && (
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#A8ACB8] mb-2">
                          Status • {lookupResult.status}
                        </p>
                        <p className="text-sm text-[#F4F6FA] whitespace-pre-wrap">
                          {lookupResult.message || '—'}
                        </p>
                      </div>
                    )}
                    <button
                      type="submit"
                      className="w-full px-6 py-3 rounded-full bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA] transition-colors"
                    >
                      Check status
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
