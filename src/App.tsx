import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import useLenis from './hooks/useLenis';
import { siteConfig } from './config';
import Hero from './sections/Hero';
import AlbumCube from './sections/AlbumCube';
import ParallaxGallery from './sections/ParallaxGallery';
import TourSchedule from './sections/TourSchedule';
import TicketReserve, { type ReservationEvent } from './sections/TicketReserve';
import SuiteReserve from './sections/SuiteReserve';
import CabanaReserve from './sections/CabanaReserve';
import Footer from './sections/Footer';
import AdminDashboard from './sections/AdminDashboard';
import MisReservas from './sections/MisReservas';
import AddOnModal  from './sections/AddOnModal';

function App() {
  useLenis();

  const [selectedEvent, setSelectedEvent]   = useState<ReservationEvent | null>(null);
  const [isReserveOpen, setIsReserveOpen]   = useState(false);
  const [isSuiteOpen,   setIsSuiteOpen]     = useState(false);
  const [isCabanaOpen,  setIsCabanaOpen]    = useState(false);
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

  const handleOpenCabana  = useCallback(() => setIsCabanaOpen(true),  []);
  const handleCloseCabana = useCallback(() => setIsCabanaOpen(false), []);

  useEffect(() => {
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Global audio player ─────────────────────────────────────────────────
  const AUDIO_TRACKS = [
    "https://res.cloudinary.com/dqfpxf3zq/video/upload/so_77/v1777448584/My_Love_My_Kisses_wireyy.mp3",
    "https://res.cloudinary.com/dqfpxf3zq/video/upload/so_98/v1777448581/_ME_-_In_Your_Eyes_PAMPA032_vdhtnk.mp3",
    "https://res.cloudinary.com/dqfpxf3zq/video/upload/so_60/v1777448576/Mark_Lower_-_Bad_Boys_Cry_bwwwdl.mp3",
    "https://res.cloudinary.com/dqfpxf3zq/video/upload/so_71/v1777448574/Ornette_-_Crazy_N%C3%B4ze_remix_Official_gy2crr.mp3",
    "https://res.cloudinary.com/dqfpxf3zq/video/upload/so_62/v1777448571/Jamie_Antonelli_-_Divine_Official_Video_ko7f6f.mp3",
  ];
  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const [muted,    setMuted]    = useState(false);
  const [playing,  setPlaying]  = useState(false);
  const trackIdx = useRef(0);
  const mutedRef   = useRef(false);
  const playingRef = useRef(false);

  const startAudio = useCallback((idx: number = trackIdx.current) => {
    if (playingRef.current && audioRef.current && audioRef.current.src.includes(String(idx))) return;
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.src    = AUDIO_TRACKS[idx] || AUDIO_TRACKS[0];
    audio.loop   = true;
    audio.muted  = mutedRef.current;
    audio.volume = 0;
    audio.play().then(() => {
      playingRef.current = true;
      setPlaying(true);
      let v = 0;
      const fade = setInterval(() => {
        v = Math.min(v + 0.04, 0.55);
        if (audioRef.current) audioRef.current.volume = v;
        if (v >= 0.55) clearInterval(fade);
      }, 80);
    }).catch(() => {});
  }, []);

  // Auto-start on first user gesture anywhere on the page
  useEffect(() => {
    const onGesture = () => {
      if (!playingRef.current) startAudio(0);
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown',     onGesture);
      window.removeEventListener('touchstart',  onGesture);
      window.removeEventListener('wheel',       onGesture);
    };
    window.addEventListener('pointerdown', onGesture, { once: true });
    window.addEventListener('keydown',     onGesture, { once: true });
    window.addEventListener('touchstart',  onGesture, { once: true });
    window.addEventListener('wheel',       onGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown',     onGesture);
      window.removeEventListener('touchstart',  onGesture);
      window.removeEventListener('wheel',       onGesture);
    };
  }, [startAudio]);

  // Track change handled via onAlbumChange callback in AlbumCube

  // Sync mute
  useEffect(() => {
    mutedRef.current = muted;
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  return (
    <main className="relative w-full min-h-screen bg-void-black overflow-x-hidden">
      <Hero />
      <AlbumCube onAlbumChange={(idx) => { trackIdx.current = idx; if (playingRef.current && audioRef.current) { audioRef.current.pause(); audioRef.current.src = AUDIO_TRACKS[idx] || AUDIO_TRACKS[0]; audioRef.current.volume = 0; audioRef.current.muted = mutedRef.current; audioRef.current.loop = true; audioRef.current.play().then(() => { let v=0; const fade=setInterval(()=>{ v=Math.min(v+0.04,0.55); if(audioRef.current) audioRef.current.volume=v; if(v>=0.55) clearInterval(fade); },80); }).catch(()=>{}); } }} />
      <ParallaxGallery />
      <TourSchedule
        onOpenReservation={handleOpenReservation}
        onOpenSuite={handleOpenSuite}
        onOpenCabana={handleOpenCabana}
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

      <CabanaReserve
        isOpen={isCabanaOpen}
        onClose={handleCloseCabana}
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
      {/* ── Global music button — always visible ── */}
      <button
        onClick={() => {
          if (!playingRef.current) { startAudio(0); setMuted(false); }
          else setMuted(m => !m);
        }}
        style={{
          position: 'fixed', top: 20, right: 20, zIndex: 999,
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 14px', borderRadius: 99,
          background: 'rgba(10,10,22,0.85)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${playing && !muted ? 'rgba(225,254,82,0.4)' : 'rgba(255,255,255,0.12)'}`,
          color: playing && !muted ? '#e1fe52' : 'rgba(255,255,255,0.4)',
          fontFamily: 'inherit', fontSize: 10, letterSpacing: '0.2em',
          textTransform: 'uppercase', cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: playing && !muted ? '0 0 16px rgba(225,254,82,0.15)' : 'none',
        }}
      >
        {playing && !muted ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        )}
        {!playing ? 'Música' : muted ? 'Silencio' : 'Sonando'}
      </button>
    </main>
  );
}

export default App;
