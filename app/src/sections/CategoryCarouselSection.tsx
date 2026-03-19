import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type CarouselItem = {
  id: string;
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaLink: string;
  image: string;
};

interface CategoryCarouselSectionProps {
  items: CarouselItem[];
}

export default function CategoryCarouselSection({ items }: CategoryCarouselSectionProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByAmount = (direction: 'prev' | 'next') => {
    const track = trackRef.current;
    if (!track) return;

    const viewportWidth = track.clientWidth;
    const amount = viewportWidth * 0.9;

    track.scrollBy({
      left: direction === 'next' ? amount : -amount,
      behavior: 'smooth',
    });
  };

  return (
    <section
      id="products"
      className="relative w-full py-14 lg:py-20 border-y border-white/10"
    >
      <div className="px-6 lg:px-[8vw] flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#A8ACB8] mb-2">
              Categories
            </p>
            <h2 className="font-['Space_Grotesk'] text-[clamp(26px,2.6vw,36px)] font-bold text-[#F4F6FA] leading-[0.95]">
              Browse by what you need.
            </h2>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={() => scrollByAmount('prev')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#2a2d35] text-[#A8ACB8] hover:text-[#F4F6FA] hover:bg-[#151821] transition-colors"
              aria-label="Previous categories"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByAmount('next')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#2a2d35] text-[#A8ACB8] hover:text-[#F4F6FA] hover:bg-[#151821] transition-colors"
              aria-label="Next categories"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel track */}
        <div
          ref={trackRef}
          className="flex gap-5 overflow-x-auto pb-2 -mx-6 px-6 lg:mx-0 lg:px-0 scroll-smooth snap-x snap-mandatory"
        >
          {items.map((item) => (
            <article
              key={item.id}
              className="snap-start shrink-0 w-[80%] sm:w-[60%] md:w-[40%] lg:w-[30%] bg-[#070A15]/55 backdrop-blur border border-white/10 rounded-2xl overflow-hidden hover:border-[#FFD700]/60 transition-colors"
            >
              <div className="relative h-44 w-full overflow-hidden">
                <img
                  src={item.image}
                  alt={item.headline}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070A15]/85 via-transparent to-transparent" />
              </div>
              <div className="p-5 flex flex-col gap-3">
                <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA]">
                  {item.headline}
                </h3>
                <p className="text-sm text-[#A8ACB8] line-clamp-3">
                  {item.subheadline}
                </p>
                <div className="mt-2">
                  <Link
                    to={item.ctaLink}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#FFD700] hover:text-[#ffe44d] transition-colors"
                  >
                    {item.ctaPrimary}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

