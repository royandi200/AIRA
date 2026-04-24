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
import AdminDashboard from './sections/AdminDashboard';
import MisReservas from './sections/MisReservas';
import AddOnModal  from './sections/AddOnModal';

function App() {
  useLenis();

  const [selectedEvent, setSelectedEvent]   = useState<ReservationEvent | null>(null);
  const [isReserveOpen, setIsReserveOpen]   = useState(false);
  const [isSuiteOpen,   setIsSuiteOpen]     = useState(false);
  const [addOnType, setAddOnType] = useState<'vip'|'transport'|null>(null);
  const [isMisReservasOpen, setIsMisReservasOpen] = useState(
    () => window.location.search.includes('reserva=')
  );
  const [isAdminOpen,   setIsAdminOpen]     = useState(
    () => window.location.hash === '#admin'
  );

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

  // Escuchar cambios de hash para abrir/cerrar admin
  useEffect(() => {
    const onHash = () => setIsAdminOpen(window.location.hash === '#admin');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const handleCloseAdmin = useCallback(() => {
    window.location.hash = '';
    setIsAdminOpen(false);
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
        onOpenMisReservas={() => setIsMisReservasOpen(true)}
        onOpenAddOn={(t) => setAddOnType(t)}
      />
      <Footer onOpenMisReservas={() => setIsMisReservasOpen(true)} />

      <TicketReserve
        isOpen={isReserveOpen}
        selectedEvent={reservationEvent}
        onClose={handleCloseReservation}
      />

      <SuiteReserve
        isOpen={isSuiteOpen}
        onClose={handleCloseSuite}
      />

      {isAdminOpen && (
        <AdminDashboard onClose={handleCloseAdmin} />
      )}
      <AddOnModal
        isOpen={addOnType !== null}
        onClose={() => setAddOnType(null)}
        type={addOnType}
      />
      <MisReservas
        isOpen={isMisReservasOpen}
        onClose={() => setIsMisReservasOpen(false)}
      />
    </main>
  );
}

export default App;
