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

  const isMobile = viewport.width < 5; // Three.js viewport units ~5 = mobile
  const cubeSize = isMobile ? Math.min(viewport.width * 0.55, 3.2) : Math.min(viewport.width * 0.4, 3);

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
  const prevIndexRef = useRef(0);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  // ── Audio ────────────────────────────────────────────────────────────────
  const AUDIO_TRACKS = [
  "https://res.cloudinary.com/dqfpxf3zq/video/upload/so_77/v1777448584/My_Love_My_Kisses_wireyy.mp3",
  "https://res.cloudinary.com/dqfpxf3zq/video/upload/so_98/v1777448581/_ME_-_In_Your_Eyes_PAMPA032_vdhtnk.mp3",
  "https://res.cloudinary.com/dqfpxf3zq/video/upload/so_60/v1777448576/Mark_Lower_-_Bad_Boys_Cry_bwwwdl.mp3",
  "https://res.cloudinary.com/dqfpxf3zq/video/upload/so_71/v1777448574/Ornette_-_Crazy_N%C3%B4ze_remix_Official_gy2crr.mp3",
  "https://res.cloudinary.com/dqfpxf3zq/video/upload/so_62/v1777448571/Jamie_Antonelli_-_Divine_Official_Video_ko7f6f.mp3"
];
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const [muted,      setMuted]      = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const mutedRef = useRef(false);

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

  // Play track for current album
  const playTrack = (index: number) => {
    if (mutedRef.current) return;
    const url = AUDIO_TRACKS[index];
    if (!url) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = url;
      audioRef.current.volume = 0;
      audioRef.current.play().then(() => {
        // Fade in
        let vol = 0;
        const fade = setInterval(() => {
          vol = Math.min(vol + 0.05, 0.55);
          if (audioRef.current) audioRef.current.volume = vol;
          if (vol >= 0.55) clearInterval(fade);
        }, 80);
      }).catch(() => {});
    }
  };

  // Change track when album changes
  useEffect(() => {
    if (audioReady) playTrack(currentAlbumIndex);
  }, [currentAlbumIndex, audioReady]);

  // Sync muted state
  useEffect(() => {
    mutedRef.current = muted;
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  return (
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
      <div className="absolute inset-0 z-10" style={{ top: '-8%' }}>
        <Canvas
          camera={{ position: [0, 0, 5.2], fov: 48 }}
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
  );
};

export default AlbumCube;
