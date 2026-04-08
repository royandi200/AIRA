import { useEffect, useMemo, useState } from 'react';
import './index.css';
import useLenis from './hooks/useLenis';
import { siteConfig } from './config';
import Hero from './sections/Hero';
import AlbumCube from './sections/AlbumCube';
import ParallaxGallery from './sections/ParallaxGallery';
import TourSchedule from './sections/TourSchedule';
import TicketReserve, { type ReservationEvent } from './sections/TicketReserve';
import Footer from './sections/Footer';

function App() {
  useLenis();

  const [selectedEvent, setSelectedEvent] = useState<ReservationEvent | null>(null);
  const [isReserveOpen, setIsReserveOpen] = useState(false);

  useEffect(() => {
    if (siteConfig.title) {
      document.title = siteConfig.title;
    }
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
      metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
  }, []);

  const reservationEvent = useMemo(() => selectedEvent, [selectedEvent]);

  const handleOpenReservation = (event: ReservationEvent) => {
    setSelectedEvent(event);
    setIsReserveOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseReservation = () => {
    setIsReserveOpen(false);
    document.body.style.overflow = '';
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <main className="relative w-full min-h-screen bg-void-black overflow-x-hidden">
      <Hero />
      <AlbumCube />
      <ParallaxGallery />
      <TourSchedule onOpenReservation={handleOpenReservation} />
      <Footer />

      <TicketReserve
        isOpen={isReserveOpen}
        selectedEvent={reservationEvent}
        onClose={handleCloseReservation}
      />
    </main>
  );
}

export default App;
