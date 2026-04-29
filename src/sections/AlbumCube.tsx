import { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, Environment } from '@react-three/drei';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { albumCubeConfig } from '../config';

gsap.registerPlugin(ScrollTrigger);

interface CubeProps {
  rotationProgress: number;
}

const Cube = ({ rotationProgress }: CubeProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  const textures = useTexture(albumCubeConfig.cubeTextures);

  const cubeSize = Math.min(viewport.width * 0.4, 3);

  useFrame(() => {
    if (meshRef.current) {
      const targetRotationY = rotationProgress * Math.PI * 2;
      const targetRotationX = Math.sin(rotationProgress * Math.PI) * 0.3;

      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        targetRotationY,
        0.1
      );
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        targetRotationX,
        0.1
      );
    }
  });

  return (
    <mesh ref={meshRef} castShadow>
      <boxGeometry args={[cubeSize, cubeSize, cubeSize]} />
      {textures.map((texture, index) => (
        <meshStandardMaterial
          key={index}
          attach={`material-${index}`}
          map={texture}
          roughness={0.2}
          metalness={0.1}
        />
      ))}
    </mesh>
  );
};

const AlbumCube = () => {
  if (albumCubeConfig.albums.length === 0 || albumCubeConfig.cubeTextures.length === 0) {
    return null;
  }

  const sectionRef   = useRef<HTMLDivElement>(null);
  const titleRef     = useRef<HTMLDivElement>(null);
  const overlayRef   = useRef<HTMLDivElement>(null);
  const [rotationProgress,  setRotationProgress]  = useState(0);
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0);
  const [blurAmount,        setBlurAmount]        = useState(0);
  const [letterSpacing,     setLetterSpacing]     = useState(0);
  const [isTransitioning,   setIsTransitioning]   = useState(false);
  const [modalOpen,          setModalOpen]          = useState(false);
  const [modalImgIndex,      setModalImgIndex]      = useState(0);
  const prevIndexRef = useRef(0);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: '+=300%',
      scrub: 1,
      pin: true,
      onUpdate: (self) => {
        const progress = self.progress;
        setRotationProgress(progress);

        const albumIndex = Math.min(
          Math.floor(progress * 4),
          albumCubeConfig.albums.length - 1
        );

        // trigger fade transition when index changes
        if (albumIndex !== prevIndexRef.current) {
          prevIndexRef.current = albumIndex;
          setIsTransitioning(true);
          setTimeout(() => {
            setCurrentAlbumIndex(albumIndex);
            setIsTransitioning(false);
          }, 180);
        }

        const velocity = Math.abs(self.getVelocity());
        const targetBlur    = Math.min(velocity / 500, 8);
        const targetSpacing = Math.min(velocity / 100, 30);

        setBlurAmount(prev    => prev    + (targetBlur    - prev)    * 0.2);
        setLetterSpacing(prev => prev    + (targetSpacing - prev)    * 0.2);
      },
    });

    scrollTriggerRef.current = st;
    return () => { st.kill(); };
  }, []);

  const currentAlbum = albumCubeConfig.albums[currentAlbumIndex];

  // accent color per experience
  const accentColors: Record<number, string> = {
    0: '#004fff',   // Día 1 — azul AIRA
    1: '#e1fe52',   // Día 2 — lima AIRA
    2: '#ffffff',   // Día 3 — blanco
    3: '#facc15',   // Pass VIP — dorado
  };
  const accent = accentColors[currentAlbumIndex] ?? '#e1fe52';

  return (
    <>
    <section
      id="albums"
      ref={sectionRef}
      className="relative w-full h-screen bg-void-black overflow-hidden"
    >
      {/* Background watermark — experience name blurred */}
      <div
        ref={titleRef}
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
        style={{
          filter: `blur(${blurAmount}px)`,
          letterSpacing: `${letterSpacing}px`,
          transition: 'opacity 0.18s ease',
          opacity: isTransitioning ? 0 : 1,
        }}
      >
        <h2 className="font-display text-[18vw] text-white/5 uppercase whitespace-nowrap select-none">
          {currentAlbum.title}
        </h2>
      </div>

      {/* 3D Canvas */}
      <div className="absolute inset-0 z-10">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.4} />
            <spotLight
              position={[10, 10, 10]}
              angle={0.15}
              penumbra={1}
              intensity={1}
              castShadow
            />
            <spotLight
              position={[-10, -10, -10]}
              angle={0.15}
              penumbra={1}
              intensity={0.5}
              color="#9DC4FF"
            />
            <pointLight position={[0, 0, 5]} intensity={0.5} color="#00D4FF" />
            <Cube rotationProgress={rotationProgress} />
            <Environment preset="city" />
          </Suspense>
        </Canvas>
      </div>

      {/* ── OVERLAY INFERIOR — info de la experiencia ── */}
      <div
        ref={overlayRef}
        className="absolute bottom-0 left-0 right-0 z-20 px-8 md:px-12 pb-10 pt-20"
        style={{
          background: 'linear-gradient(to top, rgba(3,6,18,0.92) 0%, rgba(3,6,18,0.5) 60%, transparent 100%)',
          transition: 'opacity 0.18s ease',
          opacity: isTransitioning ? 0 : 1,
        }}
      >
        <div className="flex items-end justify-between gap-6 flex-wrap">

          {/* Left — day + title + description */}
          <div className="max-w-lg">
            {/* Day pill */}
            <div className="flex items-center gap-3 mb-3">
              <span
                className="px-3 py-1 rounded-full font-mono-custom text-[9px] uppercase tracking-[0.3em] border"
                style={{
                  color: accent,
                  borderColor: `${accent}40`,
                  background: `${accent}15`,
                }}
              >
                {currentAlbum.subtitle}
              </span>
              <span
                className="font-mono-custom text-[9px] uppercase tracking-[0.25em]"
                style={{ color: `${accent}80` }}
              >
                {currentAlbum.tag}
              </span>
              {currentAlbum.badge && (
                <span
                  className="px-2.5 py-1 rounded-full font-mono-custom text-[8px] uppercase tracking-[0.2em]"
                  style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
                >
                  {currentAlbum.badge}
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              className="font-display text-5xl md:text-7xl leading-none mb-3"
              style={{ color: '#ffffff' }}
            >
              {currentAlbum.title}
            </h3>

            {/* Description */}
            <p className="text-sm md:text-base text-white/55 leading-relaxed max-w-md">
              {currentAlbum.description}
            </p>

            {/* Highlights preview */}
            {currentAlbum.highlights && (
              <div className="flex flex-wrap gap-2 mt-3">
                {currentAlbum.highlights.slice(0, 3).map((h, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full font-mono-custom text-[9px] uppercase tracking-wider"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}

            {/* Descubrir CTA */}
            <button
              onClick={() => { setModalOpen(true); setModalImgIndex(0); }}
              className="mt-4 flex items-center gap-2 font-mono-custom text-[10px] uppercase tracking-[0.25em] transition-all duration-200 hover:gap-3"
              style={{ color: accent }}
            >
              Ver detalles de esta zona
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>

          {/* Right — price + counter */}
          <div className="flex flex-col items-end gap-4">
            {/* Price */}
            <div className="text-right">
              <p className="font-mono-custom text-[9px] uppercase tracking-[0.25em] text-white/35 mb-1">Desde</p>
              <p
                className="font-display text-4xl md:text-5xl"
                style={{ color: accent }}
              >
                {currentAlbum.price}
              </p>
              <p className="font-mono-custom text-[9px] text-white/35 mt-0.5">por persona</p>
            </div>

            {/* Dot progress */}
            <div className="flex gap-2">
              {albumCubeConfig.albums.map((_, index) => (
                <div
                  key={index}
                  className="rounded-full transition-all duration-400"
                  style={{
                    width:  index === currentAlbumIndex ? '24px' : '6px',
                    height: '6px',
                    background: index === currentAlbumIndex ? accent : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-10 right-12 z-20">
        <p className="font-mono-custom text-xs text-white/30 uppercase tracking-wider">
          {albumCubeConfig.scrollHint}
        </p>
      </div>

      {/* Decorative corner lines */}
      <div className="absolute top-12 left-12 w-20 h-px bg-gradient-to-r from-aira-lime/40 to-transparent" />
      <div className="absolute top-12 left-12 w-px h-20 bg-gradient-to-b from-aira-lime/40 to-transparent" />
    </section>

    {/* ── ZONE DETAIL MODAL ── */}
    {modalOpen && currentAlbum && (
      <div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
        style={{ background: 'rgba(3,6,18,0.92)', backdropFilter: 'blur(20px)' }}
        onClick={() => setModalOpen(false)}
      >
        <div
          className="relative w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl"
          style={{ background: '#09101f', border: '1px solid rgba(255,255,255,0.08)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Photo carousel */}
          <div className="relative h-60 md:h-72 overflow-hidden rounded-t-3xl">
            {currentAlbum.images && (
              <img
                src={currentAlbum.images[modalImgIndex]}
                alt={currentAlbum.title}
                className="w-full h-full object-cover transition-all duration-500"
              />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #09101f 0%, transparent 55%)' }} />

            {/* Dots */}
            {currentAlbum.images && currentAlbum.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {currentAlbum.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setModalImgIndex(i)}
                    className="transition-all duration-200"
                    style={{
                      width: i === modalImgIndex ? 22 : 7, height: 7,
                      borderRadius: 4,
                      background: i === modalImgIndex ? accent : 'rgba(255,255,255,0.3)',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Badge */}
            {currentAlbum.badge && (
              <div
                className="absolute top-4 left-4 px-3 py-1 rounded-full font-mono-custom text-[9px] uppercase tracking-[0.3em]"
                style={{ background: accent, color: '#000' }}
              >
                {currentAlbum.badge}
              </div>
            )}

            {/* Close */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8">
            <p className="font-mono-custom text-[9px] uppercase tracking-[0.3em] mb-2" style={{ color: `${accent}99` }}>
              {currentAlbum.subtitle} · AIRA 2026
            </p>
            <h3 className="font-display text-4xl md:text-5xl text-white leading-none mb-4">{currentAlbum.title}</h3>

            <p className="text-white/65 text-sm leading-relaxed mb-3">{currentAlbum.description}</p>
            {currentAlbum.detail && (
              <p className="text-white/45 text-sm leading-relaxed mb-6">{currentAlbum.detail}</p>
            )}

            {/* Highlights */}
            {currentAlbum.highlights && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {currentAlbum.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
                    <span className="text-xs text-white/55">{h}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Price */}
            <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p className="font-mono-custom text-[9px] uppercase tracking-wider text-white/30 mb-0.5">Desde</p>
                <p className="font-display text-3xl" style={{ color: accent }}>{currentAlbum.price}</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-3 rounded-2xl font-display text-sm uppercase tracking-[0.2em] transition-all"
                style={{ background: accent, color: '#000' }}
              >
                Ver paquetes →
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default AlbumCube;
