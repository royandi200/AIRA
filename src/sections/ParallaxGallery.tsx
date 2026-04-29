import { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Ticket, ArrowRight, X, ChevronLeft, ChevronRight, Play, ZoomIn } from 'lucide-react';
import { parallaxGalleryConfig, type GalleryImage } from '../config';

gsap.registerPlugin(ScrollTrigger);

// ─── Photo Lightbox Modal ─────────────────────────────────────────────────────
// Masonry grid that "explodes" — clicked image expands to fill screen
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

  // Lenis stop
  useEffect(() => {
    const lenis = (window as any).__lenis;
    if (lenis) lenis.stop();
    return () => { const l = (window as any).__lenis; if (l) l.start(); };
  }, []);

  // Entrada: overlay fade + imagen explota desde su posición
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

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Transition between images
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

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
        <div>
          <p className="font-mono-custom text-[9px] uppercase tracking-[0.35em] text-aira-lime/60">{img.date}</p>
          <h3 className="font-display text-xl text-white leading-none">{img.title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono-custom text-xs text-white/30">
            {String(current + 1).padStart(2,'0')} / {String(images.length).padStart(2,'0')}
          </span>
          <button onClick={close}
            className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all">
            <X className="w-5 h-5"/>
          </button>
        </div>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center px-16 py-6 min-h-0 relative">
        <button onClick={prev}
          className="absolute left-4 z-10 w-12 h-12 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all hover:scale-110 active:scale-95">
          <ChevronLeft className="w-6 h-6"/>
        </button>

        <img ref={imgRef} src={img.src} alt={img.title}
          className="max-w-full max-h-full object-contain rounded-2xl"
          style={{ boxShadow: '0 40px 120px rgba(0,0,0,0.8)' }}/>

        <button onClick={next}
          className="absolute right-4 z-10 w-12 h-12 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all hover:scale-110 active:scale-95">
          <ChevronRight className="w-6 h-6"/>
        </button>
      </div>

      {/* Masonry thumbs — the "explosion" grid */}
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

  // Lenis stop
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
    // Centro exacto de la pantalla
    const cx = vw / 2;
    const cy = vh / 2;

    if (video.transition === 'morphing' && rect && containerRef.current) {
      // Partir desde rect del thumbnail, llegar al centro
      gsap.set(containerRef.current, {
        position: 'fixed',
        width:  rect.width,
        height: rect.height,
        // Centrar el elemento en la posición del thumb usando xPercent/yPercent=0
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
      // Zoom desde el centro — nunca se mueve, solo escala
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

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Build embed URL
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

      {/* Close button */}
      <button onClick={close}
        className="fixed top-6 right-6 z-[310] w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all"
        style={{ opacity: 0, animation: 'fadeIn .3s ease .4s forwards' }}>
        <X className="w-5 h-5"/>
      </button>

      {/* Video container */}
      <div ref={containerRef}
        className="fixed bg-black overflow-hidden"
        style={{ boxShadow: '0 60px 160px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06)' }}
        onClick={e => e.stopPropagation()}>

        {iframeVisible && !isPlaceholder ? (
          <iframe ref={iframeRef}
            src={embedUrl!}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen/>
        ) : iframeVisible && isPlaceholder ? (
          // Placeholder cuando no hay URL real
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
          // Thumbnail mientras carga
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

  // Photo modal state
  const [photoModal, setPhotoModal] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  // Experience modal
  const [expModal, setExpModal] = useState<{ open: boolean; zone: (typeof images)[0] | null; imgIdx: number }>({ open: false, zone: null, imgIdx: 0 });
  // Video modal state
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

  const scrollToTour = () => {
    document.getElementById('tour')?.scrollIntoView({ behavior: 'smooth' });
  };

  const openPhoto = (index: number) => {
    setPhotoModal({ open: true, index });
  };

  const images = parallaxGalleryConfig.galleryImages;

  const mainJsx = (
    <>
      <section id="gallery" ref={sectionRef} className="relative w-full bg-void-black">

        {/* ── Parallax Strips (FOTOS) ── */}
        <div ref={parallaxContainerRef} className="relative py-20 overflow-hidden">
          <div className="px-12 mb-12">
            <p className="font-mono-custom text-xs text-neon-soft/60 uppercase tracking-wider mb-2">
              {parallaxGalleryConfig.sectionLabel}
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-white">
              {parallaxGalleryConfig.sectionTitle}
            </h2>
          </div>

          {/* Top row */}
          <div ref={topRowRef} className="flex gap-4 mb-4 will-change-transform">
            {parallaxGalleryConfig.parallaxImagesTop.map((image, i) => (
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

          {/* Bottom row */}
          <div ref={bottomRowRef} className="flex gap-4 will-change-transform" style={{ transform: 'translateX(-150px)' }}>
            {parallaxGalleryConfig.parallaxImagesBottom.map((image, i) => (
              <div key={image.id}
                className="relative flex-shrink-0 w-[400px] h-[250px] overflow-hidden rounded-lg image-hover-scale cursor-pointer group"
                onClick={() => openPhoto(parallaxGalleryConfig.parallaxImagesTop.length + i)}>
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

        {/* ── Horizontal Gallery (VIDEOS / MOMENTOS) ── */}
        <div ref={galleryRef} className="relative h-screen overflow-hidden">
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
                onClick={() => setExpModal({ open: true, zone: image, imgIdx: 0 })}>

                <div className="relative w-[450px] h-[300px] overflow-hidden rounded-xl">
                  <img src={image.src} alt={image.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-void-black/80 via-transparent to-transparent"/>

                  {/* Zone badge */}
                  {image.badge && (
                    <div className="absolute top-4 left-4">
                      <span className="font-mono-custom text-[8px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{ background: image.accent || '#e1fe52', color: '#000' }}>
                        {image.badge}
                      </span>
                    </div>
                  )}
                  {/* Hover CTA */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="px-4 py-2 rounded-full border font-mono-custom text-[9px] uppercase tracking-widest"
                      style={{ borderColor: (image.accent || '#e1fe52') + '80', background: (image.accent || '#e1fe52') + '15', color: image.accent || '#e1fe52' }}>
                      Descubrir →
                    </div>
                  </div>

                  {/* Image info */}
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

            {/* End CTA */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center w-[300px] h-[300px]">
              <button onClick={scrollToTour}
                className="group flex flex-col items-center gap-4 text-white hover:text-neon-cyan transition-colors">
                <div className="w-20 h-20 rounded-full border border-white/20 group-hover:border-neon-cyan flex items-center justify-center transition-colors">
                  <ArrowRight className="w-8 h-8 group-hover:translate-x-1 transition-transform"/>
                </div>
                <span className="font-display text-lg uppercase tracking-wider">{parallaxGalleryConfig.endCtaText}</span>
              </button>
            </div>
          </div>

          {/* Scroll progress */}
          <div className="absolute bottom-12 left-12 right-12 h-px bg-white/10">
            <div className="h-full bg-neon-cyan/50 w-0" id="gallery-progress"/>
          </div>
        </div>
      </section>

      {/* ── Photo Modal ── */}
      {photoModal.open && (
        <PhotoModal
          images={[
            ...parallaxGalleryConfig.parallaxImagesTop.map(im => ({ id: im.id, src: im.src, title: im.alt, date: '' })),
            ...parallaxGalleryConfig.parallaxImagesBottom.map(im => ({ id: im.id + 100, src: im.src, title: im.alt, date: '' })),
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
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
        style={{ background: 'rgba(3,6,18,0.92)', backdropFilter: 'blur(20px)' }}
        onClick={closeModal}>
        <div className="relative w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl"
          style={{ background: '#09101f', border: '1px solid rgba(255,255,255,0.08)' }}
          onClick={e => e.stopPropagation()}>
          {/* Photos */}
          <div className="relative h-64 md:h-80 overflow-hidden rounded-t-3xl">
            <img src={(z.images && z.images[expModal.imgIdx]) || z.src} alt={z.title}
              className="w-full h-full object-cover transition-all duration-500"/>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #09101f 0%, transparent 55%)' }}/>
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
          {/* Content */}
          <div className="p-6 md:p-8">
            <p className="font-mono-custom text-[9px] uppercase tracking-[0.3em] mb-2" style={{ color: accent + '99' }}>
              {z.subtitle} · AIRA 2026
            </p>
            <h3 className="font-display text-4xl md:text-5xl text-white leading-none mb-4">{z.title}</h3>
            {z.description && <p className="text-white/65 text-sm leading-relaxed mb-3">{z.description}</p>}
            {z.detail && <p className="text-white/45 text-sm leading-relaxed mb-6">{z.detail}</p>}
            {z.highlights && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {z.highlights.map((h: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }}/>
                    <span className="text-xs text-white/55">{h}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-4 flex justify-end" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={closeModal}
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
    </>
  );
};

export default ParallaxGallery;
