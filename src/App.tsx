import { useCallback, useEffect, useMemo, useState } from 'react';
import './index.css';
import useLenis from './hooks/useLenis';
import { siteConfig } from './config';
import Hero from './sections/Hero';
import AlbumCube from './sections/AlbumCube';
import ParallaxGallery from './sections/ParallaxGallery';
import TourSchedule from './sections/TourSchedule';
import TicketReserve, { type ReservationEvent } from './sections/TicketReserve';
import SuiteReserve from './sections/SuiteReserve';
import Footer from './sections/Footer';

function App() {
  useLenis();

  const [selectedEvent, setSelectedEvent]   = useState<ReservationEvent | null>(null);
  const [isReserveOpen, setIsReserveOpen]   = useState(false);
  const [isSuiteOpen,   setIsSuiteOpen]     = useState(false);

  useEffect(() => {
    if (siteConfig.title) document.title = siteConfig.title;
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
      metaViewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
      );
    }
  }, []);

  const reservationEvent = useMemo(() => selectedEvent, [selectedEvent]);

  const handleOpenReservation = useCallback((event: ReservationEvent) => {
    setSelectedEvent(event);
    setIsReserveOpen(true);
  }, []);

  const handleCloseReservation = useCallback(() => {
    setIsReserveOpen(false);
  }, []);

  const handleOpenSuite  = useCallback(() => setIsSuiteOpen(true),  []);
  const handleCloseSuite = useCallback(() => setIsSuiteOpen(false), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <main className="relative w-full min-h-screen bg-void-black overflow-x-hidden">
      <Hero />
      <AlbumCube />
      <ParallaxGallery />
      <TourSchedule
        onOpenReservation={handleOpenReservation}
        onOpenSuite={handleOpenSuite}
      />
      <Footer />

      <TicketReserve
        isOpen={isReserveOpen}
        selectedEvent={reservationEvent}
        onClose={handleCloseReservation}
      />

      <SuiteReserve
        isOpen={isSuiteOpen}
        onClose={handleCloseSuite}
      />
    </main>
  );
}

export default App;
