import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Ticket, ArrowRight, X, ChevronLeft, ChevronRight, Play, ZoomIn } from 'lucide-react';
import { parallaxGalleryConfig, type GalleryImage } from '../config';

gsap.registerPlugin(ScrollTrigger);

// ─── Fotos subidas por el equipo en /photos ────────────────────────────────
// "Sin clasificar" alimenta la sección Galería (tiras parallax); cada una
// de las 5 categorías alimenta el carrusel de su zona en "La Experiencia".
// A propósito NO se reemplaza lo que ya se ve con solo 1-2 fotos subidas —
// hay un mínimo por sección, así nunca se ve "peor" que antes mientras se
// va llenando de contenido real.
interface UploadedPhoto {
  id: number;
  uploaded_name: string | null;
  file_url: string;
  is_video: number;
  category: string | null;
  created_at: string;
}
const MIN_STRIP_PHOTOS = 6; // Galería (home) — mínimo para reemplazar las tiras estáticas
const MIN_ZONE_PHOTOS   = 3; // por zona de "La Experiencia"

function useUploadedPhotos() {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  useEffect(() => {
    fetch('/api/photos-public')
      .then(r => r.json())
      .then(json => { if (json.ok) setPhotos(json.photos); })
      .catch(() => {});
  }, []);
  return photos;
}

// ─── Galería de una zona (fotos subidas por el equipo en /photos) ─────────────
// Reemplaza al modal de venta/descripción de la zona cuando ya hay
// suficientes fotos de esa categoría — acá NO se vende nada, es la
// vitrina de lo que subió la gente para esa sección.
function ZoneGalleryModal({
  title, photos, onClose,
}: {
  title: string;
  photos: UploadedPhoto[];
  onClose: () => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (openIdx !== null) setOpenIdx(null); else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIdx, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 lg:p-6"
      style={{ background: 'rgba(3,6,18,0.92)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}>
      <div className="relative w-full md:max-w-3xl max-h-[90vh] md:max-h-[85vh] flex flex-col rounded-t-3xl md:rounded-2xl overflow-hidden"
        style={{ background: '#09101f', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div>
            <p className="font-mono-custom text-[9px] uppercase tracking-[0.35em] text-aira-lime/60">Galería</p>
            <h3 className="font-display text-xl text-white leading-none">{title}</h3>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p, i) => (
              <button key={p.id} onClick={() => setOpenIdx(i)}
                className="relative aspect-square rounded-xl overflow-hidden group">
                {p.is_video ? (
                  <video src={p.file_url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                ) : (
                  <img src={p.file_url} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                )}
                {!!p.is_video && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="w-6 h-6 text-white" fill="white" />
                  </span>
                )}
                {p.uploaded_name && (
                  <span className="absolute left-1.5 bottom-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                    {p.uploaded_name}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {openIdx !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ background: 'rgba(3,4,12,0.97)', backdropFilter: 'blur(24px)' }}
          onClick={e => { e.stopPropagation(); setOpenIdx(null); }}>
          {photos[openIdx].is_video ? (
            <video src={photos[openIdx].file_url} controls autoPlay playsInline
              className="max-w-full max-h-full rounded-2xl" onClick={e => e.stopPropagation()} />
          ) : (
            <img src={photos[openIdx].file_url} alt=""
              className="max-w-full max-h-full object-contain rounded-2xl" onClick={e => e.stopPropagation()} />
          )}
          {photos[openIdx].uploaded_name && (
            <p className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-sm font-bold"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
              {photos[openIdx].uploaded_name}
            </p>
          )}
          <button onClick={() => setOpenIdx(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Photo Lightbox Modal ─────────────────────────────────────────────────────
function PhotoModal({
  images, startIndex, onClose,
}: {
  images: GalleryImage[];
  startIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent]   = useState(startIndex);
  const [, setPhase]       = useState<'entering' | 'open' | 'exiting'>('entering');
  const overlayRef  = useRef<HTMLDivElement>(null);
  const imgRef      = useRef<HTMLImageElement>(null);
  const gridRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lenis = (window as any).__lenis;
    if (lenis) lenis.stop();
    return () => { const l = (window as any).__lenis; if (l) l.start(); };
  }, []);

  useEffect(() => {
    const tl = gsap.timeline({ onComplete: () => setPhase('open') });
    if (overlayRef.current) {
      tl.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0);
    }
    if (imgRef.current) {
      tl.fromTo(imgRef.current,
        { scale: 0.6, opacity: 0, y: 40 },
        { scale: 1,   opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 0.05
      );
    }
    if (gridRef.current) {
      const items = gridRef.current.querySelectorAll('.thumb-item');
      tl.fromTo(items,
        { opacity: 0, scale: 0.8, y: 20 },
        { opacity: 1, scale: 1,   y: 0,  duration: 0.4, ease: 'power3.out', stagger: 0.04 }, 0.2
      );
    }
  }, []);

  const close = useCallback(() => {
    setPhase('exiting');
    const tl = gsap.timeline({ onComplete: onClose });
    if (overlayRef.current) tl.to(overlayRef.current, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0);
    if (imgRef.current)     tl.to(imgRef.current, { scale: 0.8, opacity: 0, y: -30, duration: 0.3, ease: 'power2.in' }, 0);
  }, [onClose]);

  const prev = () => setCurrent(c => (c - 1 + images.length) % images.length);
  const next = () => setCurrent(c => (c + 1) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const changeImage = (idx: number) => {
    if (idx === current || !imgRef.current) return;
    gsap.to(imgRef.current, {
      opacity: 0, scale: 0.92, duration: 0.18, ease: 'power2.in',
      onComplete: () => {
        setCurrent(idx);
        gsap.fromTo(imgRef.current!,
          { opacity: 0, scale: 1.06 },
          { opacity: 1, scale: 1, duration: 0.35, ease: 'expo.out' }
        );
      }
    });
  };

  const img = images[current];

  return (
    <div ref={overlayRef}
      className="fixed inset-0 z-[300] flex flex-col"
      style={{ background: 'rgba(3,4,12,0.97)', backdropFilter: 'blur(24px)' }}>

      {/* Header — título y contador, sin botón cerrar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
        <div>
          <p className="font-mono-custom text-[9px] uppercase tracking-[0.35em] text-aira-lime/60">{img.date}</p>
          <h3 className="font-display text-xl text-white leading-none">{img.title}</h3>
        </div>
        <span className="font-mono-custom text-xs text-white/30">
          {String(current + 1).padStart(2,'0')} / {String(images.length).padStart(2,'0')}
        </span>
      </div>

      {/* Main image — imagen IGUAL que antes + botón X flotante cerca */}
      <div className="flex-1 flex items-center justify-center px-16 py-6 min-h-0 relative">
        <button onClick={prev}
          className="absolute left-4 z-10 w-12 h-12 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all hover:scale-110 active:scale-95">
          <ChevronLeft className="w-6 h-6"/>
        </button>

        {/* Imagen sin wrapper — tamaño original preservado */}
        <img ref={imgRef} src={img.src} alt={img.title}
          className="max-w-full max-h-full object-contain rounded-2xl"
          style={{ boxShadow: '0 40px 120px rgba(0,0,0,0.8)' }}/>

        {/* Botón X cerca de la foto — esquina superior derecha del área de imagen */}
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute top-4 right-20 z-20 w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all"
          style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
          <X className="w-5 h-5"/>
        </button>

        <button onClick={next}
          className="absolute right-4 z-10 w-12 h-12 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all hover:scale-110 active:scale-95">
          <ChevronRight className="w-6 h-6"/>
        </button>
      </div>

      {/* Thumbs */}
      <div ref={gridRef}
        className="shrink-0 px-6 pb-5 border-t border-white/8 pt-4"
        style={{ background: 'rgba(0,0,0,0.4)' }}>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {images.map((im, i) => (
            <button key={im.id}
              onClick={() => changeImage(i)}
              className={`thumb-item relative flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200 ${
                i === current
                  ? 'ring-2 ring-aira-lime scale-105 opacity-100'
                  : 'opacity-40 hover:opacity-70 hover:scale-102'
              }`}
              style={{ width: '72px', height: '52px' }}>
              <img src={im.src} alt={im.title} className="w-full h-full object-cover"/>
              {i === current && (
                <div className="absolute inset-0 bg-aira-lime/20"/>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Video Modal ──────────────────────────────────────────────────────────────
function VideoModal({
  video, rect, onClose,
}: {
  video: GalleryImage;
  rect: DOMRect | null;
  onClose: () => void;
}) {
  const overlayRef   = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const [iframeVisible, setIframeVisible] = useState(false);

  useEffect(() => {
    const lenis = (window as any).__lenis;
    if (lenis) lenis.stop();
    return () => { const l = (window as any).__lenis; if (l) l.start(); };
  }, []);

  useEffect(() => {
    const tl = gsap.timeline();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetW = Math.min(vw * 0.88, 1100);
    const targetH = targetW * 9 / 16;
    const cx = vw / 2;
    const cy = vh / 2;

    if (video.transition === 'morphing' && rect && containerRef.current) {
      gsap.set(containerRef.current, {
        position: 'fixed',
        width:  rect.width,
        height: rect.height,
        left: rect.left,
        top:  rect.top,
        xPercent: 0,
        yPercent: 0,
        borderRadius: '12px',
        overflow: 'hidden',
        zIndex: 305,
      });
      tl.to(overlayRef.current, { opacity: 1, duration: 0.25, ease: 'power2.out' }, 0)
        .to(containerRef.current, {
          left:         cx,
          top:          cy,
          xPercent:     -50,
          yPercent:     -50,
          width:        targetW,
          height:       targetH,
          borderRadius: '20px',
          duration:     0.6,
          ease:         'expo.inOut',
          onComplete:   () => setIframeVisible(true),
        }, 0.05);
    } else {
      gsap.set(containerRef.current, {
        position: 'fixed',
        width:    targetW,
        height:   targetH,
        left:     cx,
        top:      cy,
        xPercent: -50,
        yPercent: -50,
        scale:    0.25,
        opacity:  0,
        borderRadius: '20px',
        overflow: 'hidden',
        zIndex:   305,
      });
      tl.to(overlayRef.current, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0)
        .to(containerRef.current, {
          scale:   1,
          opacity: 1,
          duration: 0.55,
          ease:    'expo.out',
          onComplete: () => setIframeVisible(true),
        }, 0.05);
    }
  }, [video.transition, rect]);

  const close = useCallback(() => {
    const tl = gsap.timeline({ onComplete: onClose });
    tl.to(overlayRef.current, { opacity: 0, duration: 0.25 }, 0);
    tl.to(containerRef.current, { scale: 0.85, opacity: 0, duration: 0.3, ease: 'power2.in' }, 0);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const getEmbedUrl = (url: string) => {
    if (!url || url.includes('placeholder')) return null;
    if (url.includes('vimeo.com')) {
      const id = url.split('/').pop();
      return `https://player.vimeo.com/video/${id}?autoplay=1&color=e1fe52&title=0&byline=0&portrait=0`;
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const id = url.includes('youtu.be')
        ? url.split('/').pop()
        : new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(video.videoUrl || '');
  const isPlaceholder = !embedUrl;

  return (
    <>
      {/* Overlay */}
      <div ref={overlayRef}
        className="fixed inset-0 z-[300]"
        style={{ background: 'rgba(3,4,12,0.92)', backdropFilter: 'blur(20px)', opacity: 0 }}
        onClick={close}/>

      {/* Video container con X superpuesto en su esquina */}
      <div ref={containerRef}
        className="fixed bg-black overflow-hidden"
        style={{ boxShadow: '0 60px 160px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06)' }}
        onClick={e => e.stopPropagation()}>

        {/* Botón cerrar sobre el video */}
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all"
          style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
          <X className="w-5 h-5"/>
        </button>

        {iframeVisible && !isPlaceholder ? (
          <iframe ref={iframeRef}
            src={embedUrl!}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen/>
        ) : iframeVisible && isPlaceholder ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4"
            style={{ background: 'linear-gradient(135deg,#08101f,#0d1a30)' }}>
            <div className="w-16 h-16 rounded-full bg-aira-lime/10 border border-aira-lime/30 flex items-center justify-center">
              <Play className="w-8 h-8 text-aira-lime ml-1"/>
            </div>
            <div className="text-center">
              <p className="font-display text-xl text-white mb-1">{video.title}</p>
              <p className="font-mono-custom text-xs text-white/40 uppercase tracking-widest">
                Próximamente · Agrega la URL del video en config.ts
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <img src={video.src} alt={video.title} className="w-full h-full object-cover"/>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center animate-pulse">
                <Play className="w-7 h-7 text-white ml-1"/>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes fadeIn { from{opacity:0} to{opacity:1} }`}</style>
    </>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const ParallaxGallery = () => {
  if (
    parallaxGalleryConfig.parallaxImagesTop.length === 0 &&
    parallaxGalleryConfig.galleryImages.length === 0 &&
    !parallaxGalleryConfig.sectionTitle
  ) return null;

  const sectionRef           = useRef<HTMLDivElement>(null);
  const parallaxContainerRef = useRef<HTMLDivElement>(null);
  const topRowRef            = useRef<HTMLDivElement>(null);
  const bottomRowRef         = useRef<HTMLDivElement>(null);
  const galleryRef           = useRef<HTMLDivElement>(null);
  const galleryTrackRef      = useRef<HTMLDivElement>(null);
  const scrollTriggerRefs    = useRef<ScrollTrigger[]>([]);
  const thumbRefs            = useRef<(HTMLDivElement | null)[]>([]);

  const [photoModal, setPhotoModal] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [expModal, setExpModal] = useState<{ open: boolean; zone: (typeof images)[0] | null; imgIdx: number }>({ open: false, zone: null, imgIdx: 0 });
  // Cuando la zona ya tiene suficientes fotos subidas, se abre esto en vez
  // del modal de venta/descripción — es la vitrina de lo que subió la
  // gente, no un pitch de compra.
  const [zoneGallery, setZoneGallery] = useState<{ title: string; photos: UploadedPhoto[] } | null>(null);

  const uploaded = useUploadedPhotos();
  const uncategorized = useMemo(() => uploaded.filter(p => !p.category), [uploaded]);
  const byCategory = useMemo(() => {
    const map: Record<string, UploadedPhoto[]> = {};
    for (const p of uploaded) if (p.category) (map[p.category] ??= []).push(p);
    return map;
  }, [uploaded]);
  const photoNameBySrc = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of uploaded) if (p.uploaded_name) map[p.file_url] = p.uploaded_name;
    return map;
  }, [uploaded]);

  // Solo se reemplazan las tiras estáticas de "Galería" cuando ya hay
  // suficientes fotos "sin clasificar" subidas — con 1-2 fotos se veía peor
  // que los defaults actuales.
  const useDynamicStrip = uncategorized.length >= MIN_STRIP_PHOTOS;
  const effectiveTop = useMemo(() => {
    if (!useDynamicStrip) return parallaxGalleryConfig.parallaxImagesTop;
    const half = Math.ceil(uncategorized.length / 2);
    return uncategorized.slice(0, half).map(p => ({ id: p.id, src: p.file_url, alt: p.uploaded_name || 'Foto AIRA' }));
  }, [useDynamicStrip, uncategorized]);
  const effectiveBottom = useMemo(() => {
    if (!useDynamicStrip) return parallaxGalleryConfig.parallaxImagesBottom;
    const half = Math.ceil(uncategorized.length / 2);
    return uncategorized.slice(half).map(p => ({ id: p.id + 100000, src: p.file_url, alt: p.uploaded_name || 'Foto AIRA' }));
  }, [useDynamicStrip, uncategorized]);

  // Mismo criterio por zona de "La Experiencia" — mínimo de fotos de esa
  // categoría antes de reemplazar el carrusel estático de la zona.
  const getZoneImages = useCallback((title: string, fallback: string[]): string[] => {
    const cat = byCategory[title];
    return cat && cat.length >= MIN_ZONE_PHOTOS ? cat.map(p => p.file_url) : fallback;
  }, [byCategory]);

  useEffect(() => {
    if (!expModal.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpModal({ open: false, zone: null, imgIdx: 0 }); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [expModal.open]);

  const [videoModal, setVideoModal] = useState<{ open: boolean; video: GalleryImage | null; rect: DOMRect | null }>({
    open: false, video: null, rect: null,
  });

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      if (topRowRef.current && bottomRowRef.current) {
        const st1 = ScrollTrigger.create({
          trigger: parallaxContainerRef.current,
          start: 'top bottom', end: 'bottom top', scrub: 1,
          onUpdate: (self) => {
            const p = self.progress;
            if (topRowRef.current)    gsap.set(topRowRef.current,    { x: -p * 300 });
            if (bottomRowRef.current) gsap.set(bottomRowRef.current, { x: p * 300 - 150 });
          },
        });
        scrollTriggerRefs.current.push(st1);
      }

      if (galleryRef.current && galleryTrackRef.current) {
        const trackWidth    = galleryTrackRef.current.scrollWidth;
        const viewportWidth = window.innerWidth;
        const st2 = ScrollTrigger.create({
          trigger: galleryRef.current,
          start: 'top top', end: () => `+=${trackWidth - viewportWidth}`,
          pin: true, scrub: 1,
          onUpdate: (self) => {
            if (galleryTrackRef.current) {
              gsap.set(galleryTrackRef.current, { x: -self.progress * (trackWidth - viewportWidth) });
            }
          },
        });
        scrollTriggerRefs.current.push(st2);
      }
    }, sectionRef);

    return () => {
      ctx.revert();
      scrollTriggerRefs.current.forEach(st => st.kill());
      scrollTriggerRefs.current = [];
    };
  }, []);

  const openPhoto = (index: number) => {
    setPhotoModal({ open: true, index });
  };

  const images = parallaxGalleryConfig.galleryImages;

  const mainJsx = (
    <>
      <section id="gallery" ref={sectionRef} className="relative w-full bg-void-black">

        {/* ── Parallax Strips ── */}
        <div ref={parallaxContainerRef} className="relative py-20 overflow-hidden">
          <div className="px-12 mb-12">
            <p className="font-mono-custom text-xs text-neon-soft/60 uppercase tracking-wider mb-2">
              {parallaxGalleryConfig.sectionLabel}
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-white">
              {parallaxGalleryConfig.sectionTitle}
            </h2>
          </div>

          <div ref={topRowRef} className="flex gap-4 mb-4 will-change-transform">
            {effectiveTop.map((image, i) => (
              <div key={image.id}
                className="relative flex-shrink-0 w-[400px] h-[250px] overflow-hidden rounded-lg image-hover-scale cursor-pointer group"
                onClick={() => openPhoto(i)}>
                <img src={image.src} alt={image.alt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                <div className="absolute inset-0 bg-gradient-to-t from-void-black/50 to-transparent"/>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full bg-white/10 border border-white/30 flex items-center justify-center backdrop-blur-sm">
                    <ZoomIn className="w-5 h-5 text-white"/>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div ref={bottomRowRef} className="flex gap-4 will-change-transform" style={{ transform: 'translateX(-150px)' }}>
            {effectiveBottom.map((image, i) => (
              <div key={image.id}
                className="relative flex-shrink-0 w-[400px] h-[250px] overflow-hidden rounded-lg image-hover-scale cursor-pointer group"
                onClick={() => openPhoto(effectiveTop.length + i)}>
                <img src={image.src} alt={image.alt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                <div className="absolute inset-0 bg-gradient-to-t from-void-black/50 to-transparent"/>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full bg-white/10 border border-white/30 flex items-center justify-center backdrop-blur-sm">
                    <ZoomIn className="w-5 h-5 text-white"/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Marquee ── */}
        <div className="relative py-8 bg-void-dark overflow-hidden border-y border-white/5">
          <div className="animate-marquee flex whitespace-nowrap">
            {[...Array(8)].map((_, i) => (
              <span key={i} className="flex items-center gap-8 mx-8 text-2xl font-display text-white/20">
                {parallaxGalleryConfig.marqueeTexts.map((text, j) => (
                  <span key={j}>{text}</span>
                ))}
                <Ticket className="w-6 h-6"/>
                <ArrowRight className="w-6 h-6"/>
              </span>
            ))}
          </div>
        </div>

        {/* ── Horizontal Gallery ── */}
        <div id="experiencia" ref={galleryRef} className="relative h-screen overflow-hidden">
          <div className="absolute top-12 left-12 z-20">
            <p className="font-mono-custom text-xs text-neon-soft/60 uppercase tracking-wider mb-2">
              {parallaxGalleryConfig.galleryLabel}
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-white">
              {parallaxGalleryConfig.galleryTitle}
            </h2>
          </div>

          <div ref={galleryTrackRef} className="flex items-center gap-8 h-full px-12 pt-24 will-change-transform">
            {images.map((image, index) => (
              <div key={image.id}
                ref={el => { thumbRefs.current[index] = el; }}
                className="relative flex-shrink-0 group cursor-pointer"
                style={{ marginTop: index % 2 === 0 ? '0' : '60px' }}
                onClick={() => {
                  const cat = byCategory[image.title];
                  if (cat && cat.length >= MIN_ZONE_PHOTOS) {
                    setZoneGallery({ title: image.title, photos: cat });
                  } else {
                    setExpModal({ open: true, zone: { ...image, images: getZoneImages(image.title, image.images || []) }, imgIdx: 0 });
                  }
                }}>

                <div className="relative w-[450px] h-[300px] overflow-hidden rounded-xl">
                  <img src={image.src} alt={image.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-void-black/80 via-transparent to-transparent"/>

                  {image.badge && (
                    <div className="absolute top-4 left-4">
                      <span className="font-mono-custom text-[8px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{ background: image.accent || '#e1fe52', color: '#000' }}>
                        {image.badge}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="px-4 py-2 rounded-full border font-mono-custom text-[9px] uppercase tracking-widest"
                      style={{ borderColor: (image.accent || '#e1fe52') + '80', background: (image.accent || '#e1fe52') + '15', color: image.accent || '#e1fe52' }}>
                      Descubrir →
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-6">
                    <p className="font-mono-custom text-xs mb-1" style={{ color: (image.accent || '#ffffff') + 'aa' }}>
                      {image.subtitle || image.date}
                    </p>
                    <h3 className="font-display text-2xl text-white">{image.title}</h3>
                  </div>

                  <div className="absolute inset-0 bg-neon-cyan/0 group-hover:bg-neon-cyan/5 transition-colors duration-300"/>
                </div>

                <div className="absolute -top-8 -left-4 font-mono-custom text-7xl text-white/5 font-bold">
                  {String(index + 1).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-12 left-12 right-12 h-px bg-white/10">
            <div className="h-full bg-neon-cyan/50 w-0" id="gallery-progress"/>
          </div>
        </div>
      </section>

      {/* ── Photo Modal ── */}
      {photoModal.open && (
        <PhotoModal
          images={[
            ...effectiveTop.map(im => ({ id: im.id, src: im.src, title: im.alt, date: '' })),
            ...effectiveBottom.map(im => ({ id: im.id + 100, src: im.src, title: im.alt, date: '' })),
          ]}
          startIndex={photoModal.index}
          onClose={() => setPhotoModal({ open: false, index: 0 })}
        />
      )}

      {/* ── Video Modal ── */}
      {videoModal.open && videoModal.video && (
        <VideoModal
          video={videoModal.video}
          rect={videoModal.rect}
          onClose={() => setVideoModal({ open: false, video: null, rect: null })}
        />
      )}
    </>
  );

  const ExpModal = () => {
    if (!expModal.open || !expModal.zone) return null;
    const z = expModal.zone;
    const accent = z.accent || '#e1fe52';
    const closeModal = () => setExpModal({ open: false, zone: null, imgIdx: 0 });
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 lg:p-6"
        style={{ background: 'rgba(3,6,18,0.92)', backdropFilter: 'blur(20px)' }}
        onClick={closeModal}>
        <div className="relative w-full md:max-w-2xl lg:max-w-3xl max-h-[90vh] md:max-h-[88vh] flex flex-col rounded-t-3xl md:rounded-2xl overflow-hidden"
          style={{ background: '#09101f', border: '1px solid rgba(255,255,255,0.08)' }}
          onClick={e => e.stopPropagation()}>
          <div className="relative h-64 md:h-80 overflow-hidden rounded-t-3xl"
            onTouchStart={e => { (e.currentTarget as any)._tx = e.touches[0].clientX; }}
            onTouchEnd={e => {
              const dx = e.changedTouches[0].clientX - ((e.currentTarget as any)._tx || 0);
              if (Math.abs(dx) < 40) return;
              const total = z.images?.length || 1;
              if (dx < 0) setExpModal(m => ({ ...m, imgIdx: Math.min(m.imgIdx + 1, total - 1) }));
              else        setExpModal(m => ({ ...m, imgIdx: Math.max(m.imgIdx - 1, 0) }));
            }}>
            <img src={(z.images && z.images[expModal.imgIdx]) || z.src} alt={z.title}
              className="w-full h-full object-cover transition-all duration-500"/>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #09101f 0%, transparent 55%)' }}/>
            {(() => {
              const currentSrc = (z.images && z.images[expModal.imgIdx]) || z.src;
              const name = photoNameBySrc[currentSrc];
              return name ? (
                <div className="absolute top-4 right-16 px-3 py-1 rounded-full font-mono-custom text-[10px] font-bold"
                  style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
                  📸 {name}
                </div>
              ) : null;
            })()}
            {z.images && z.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {z.images.map((_: string, i: number) => (
                  <button key={i} onClick={() => setExpModal(m => ({ ...m, imgIdx: i }))}
                    className="rounded-full transition-all duration-200"
                    style={{ width: i === expModal.imgIdx ? 22 : 7, height: 7, background: i === expModal.imgIdx ? accent : 'rgba(255,255,255,0.3)' }}/>
                ))}
              </div>
            )}
            {z.badge && (
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full font-mono-custom text-[9px] uppercase tracking-[0.3em]"
                style={{ background: accent, color: '#000' }}>{z.badge}</div>
            )}
            <button onClick={closeModal}
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="p-6 md:p-8">
            <p className="font-mono-custom text-[9px] uppercase tracking-[0.3em] mb-2" style={{ color: accent + '99' }}>
              {z.subtitle} · AIRA 2026
            </p>
            <h3 className="font-display text-3xl md:text-4xl text-white leading-none mb-3">{z.title}</h3>
            {z.description && <p className="text-white/65 text-sm leading-relaxed mb-3">{z.description}</p>}
            {z.detail && <p className="text-white/45 text-sm leading-relaxed mb-4">{z.detail}</p>}
            {z.highlights && (
              <div className="grid grid-cols-2 gap-2 mb-5">
                {z.highlights.map((h: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }}/>
                    <span className="text-xs text-white/55">{h}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-4 flex justify-end" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => { closeModal(); setTimeout(() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" }), 350); }}
                className="px-6 py-3 rounded-2xl font-display text-sm uppercase tracking-[0.2em]"
                style={{ background: accent, color: '#000' }}>
                Ver paquetes →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {mainJsx}
      <ExpModal />
      {zoneGallery && (
        <ZoneGalleryModal
          title={zoneGallery.title}
          photos={zoneGallery.photos}
          onClose={() => setZoneGallery(null)}
        />
      )}
    </>
  );
};

export default ParallaxGallery;
