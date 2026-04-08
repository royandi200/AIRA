import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapPin, Clock, Ticket, ExternalLink } from 'lucide-react';
import { tourScheduleConfig } from '../config';
import type { ReservationEvent } from './TicketReserve';

gsap.registerPlugin(ScrollTrigger);

interface TourScheduleProps {
  onOpenReservation: (event: ReservationEvent) => void;
}

const TourSchedule = ({ onOpenReservation }: TourScheduleProps) => {
  if (tourScheduleConfig.tourDates.length === 0 && !tourScheduleConfig.sectionTitle) {
    return null;
  }

  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeVenue, setActiveVenue] = useState<number>(0);
  const [isVisible, setIsVisible] = useState(false);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top 80%',
      onEnter: () => setIsVisible(true),
    });

    scrollTriggerRef.current = st;

    return () => {
      st.kill();
    };
  }, []);

  useEffect(() => {
    if (!isVisible || !contentRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current?.querySelectorAll('.tour-item') || [],
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [isVisible]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on-sale':
        return { text: tourScheduleConfig.statusLabels.onSale, color: 'text-emerald-600 bg-emerald-100' };
      case 'sold-out':
        return { text: tourScheduleConfig.statusLabels.soldOut, color: 'text-rose-600 bg-rose-100' };
      case 'coming-soon':
        return { text: tourScheduleConfig.statusLabels.comingSoon, color: 'text-amber-600 bg-amber-100' };
      default:
        return { text: tourScheduleConfig.statusLabels.default, color: 'text-gray-600 bg-gray-100' };
    }
  };

  const getVenueType = (venue: string) => {
    const normalized = venue.toLowerCase();
    if (normalized.includes('yacht') || normalized.includes('boat') || normalized.includes('yate')) return 'yacht';
    if (normalized.includes('club') || normalized.includes('hall') || normalized.includes('arena')) return 'club';
    return 'festival';
  };

  const TOUR_DATES = tourScheduleConfig.tourDates;

  return (
    <section
      id="booking"
      ref={sectionRef}
      className="relative w-full min-h-screen bg-aira-blue py-20 overflow-hidden"
    >
      {tourScheduleConfig.vinylImage && (
        <div className="absolute top-20 right-20 w-64 h-64 md:w-80 md:h-80 z-10 opacity-80">
          <img
            src={tourScheduleConfig.vinylImage}
            alt="Vinyl Disc"
            className="w-full h-full animate-spin-slow"
          />
        </div>
      )}

      <div ref={contentRef} className="relative z-20 max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-16">
          <p className="font-mono-custom text-xs text-white/60 uppercase tracking-wider mb-2">
            {tourScheduleConfig.sectionLabel}
          </p>
          <h2 className="font-display text-5xl md:text-7xl text-white">
            {tourScheduleConfig.sectionTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {TOUR_DATES.length > 0 && (
            <div className="hidden lg:flex lg:items-center">
              <div className="sticky top-32 w-full aspect-[4/3] rounded-2xl overflow-hidden bg-aira-darkBlue/20 border-2 border-aira-lime/30">
                <img
                  src={TOUR_DATES[activeVenue]?.image}
                  alt={TOUR_DATES[activeVenue]?.venue}
                  className="w-full h-full object-cover transition-opacity duration-500"
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-aira-darkBlue to-transparent">
                  <p className="font-display text-2xl text-white">
                    {TOUR_DATES[activeVenue]?.venue}
                  </p>
                  <p className="font-mono-custom text-sm text-aira-lime">
                    {TOUR_DATES[activeVenue]?.city}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {TOUR_DATES.map((tour, index) => {
              const status = getStatusLabel(tour.status);

              return (
                <div
                  key={tour.id}
                  className="tour-item group relative p-6 rounded-xl bg-white/80 backdrop-blur-sm border border-aira-lime/20 hover:bg-white hover:border-aira-lime/50 transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setActiveVenue(index)}
                  onMouseLeave={() => setActiveVenue(0)}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-shrink-0 w-28">
                      <p className="font-mono-custom text-2xl font-bold text-aira-darkBlue">
                        {tour.date.split('.').slice(1).join('.')}
                      </p>
                      <p className="font-mono-custom text-xs text-aira-darkBlue/50">
                        {tour.date.split('.')[0]}
                      </p>
                    </div>

                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-aira-blue" />
                        <span className="font-display text-lg text-aira-darkBlue">
                          {tour.city}
                        </span>
                      </div>
                      <p className="text-sm text-aira-darkBlue/60 ml-6">
                        {tour.venue}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-aira-darkBlue/60">
                      <Clock className="w-4 h-4" />
                      <span className="font-mono-custom text-sm">{tour.time}</span>
                    </div>

                    <div className="flex-shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </div>

                    <div className="flex-shrink-0">
                      {tour.status === 'on-sale' ? (
                        <button
                          className="flex items-center gap-2 px-4 py-2 bg-aira-lime text-aira-darkBlue rounded-full text-sm font-medium hover:bg-aira-lime/80 transition-colors"
                          onClick={() => onOpenReservation({
                            id: tour.id,
                            city: tour.city,
                            venue: tour.venue,
                            date: tour.date,
                            time: tour.time,
                            image: tour.image,
                            venueType: getVenueType(tour.venue),
                          })}
                        >
                          <Ticket className="w-4 h-4" />
                          <span>{tourScheduleConfig.buyButtonText}</span>
                        </button>
                      ) : (
                        <button className="flex items-center gap-2 px-4 py-2 border border-aira-darkBlue/20 text-aira-darkBlue/60 rounded-full text-sm hover:border-aira-darkBlue/40 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                          <span>{tourScheduleConfig.detailsButtonText}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-aira-lime rounded-full group-hover:h-12 transition-all duration-300" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-20 text-center">
          <p className="font-mono-custom text-sm text-white/60 mb-4">
            {tourScheduleConfig.bottomNote}
          </p>
          <button className="px-8 py-4 bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-wider rounded-full hover:bg-white transition-colors">
            {tourScheduleConfig.bottomCtaText}
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-aira-lime/30 to-transparent" />
    </section>
  );
};

export default TourSchedule;
