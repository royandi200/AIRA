import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Play, Music, Disc, Calendar } from 'lucide-react';
import { heroConfig } from '../config';

const ICON_MAP = {
  disc: Disc,
  play: Play,
  calendar: Calendar,
  music: Music,
};

const Hero = () => {
  if (!heroConfig.decodeText && !heroConfig.brandName && heroConfig.navItems.length === 0) {
    return null;
  }

  const heroRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const TARGET_TEXT = heroConfig.decodeText;
  const CHARS = heroConfig.decodeChars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  const [displayText, setDisplayText] = useState(' '.repeat(TARGET_TEXT.length));
  const [isDecoding, setIsDecoding] = useState(true);

  useEffect(() => {
    let iteration = 0;
    const maxIterations = TARGET_TEXT.length * 8;
    const interval = setInterval(() => {
      setDisplayText(() =>
        TARGET_TEXT.split('').map((_, index) => {
          if (index < iteration / 8) return TARGET_TEXT[index];
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join('')
      );
      iteration += 1;
      if (iteration >= maxIterations) {
        clearInterval(interval);
        setDisplayText(TARGET_TEXT);
        setIsDecoding(false);
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(navRef.current, { y: -100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.3 });
      gsap.fromTo(subtitleRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 1.5 });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section ref={heroRef} className="relative w-full h-screen overflow-hidden bg-void-black">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroConfig.backgroundImage})` }} />
        <div className="absolute inset-0 video-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void-black/30 to-void-black" />
      </div>

      {/* Navigation pill — fixed, centered, constrained on mobile */}
      <nav
        ref={navRef}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 nav-pill rounded-full px-2 py-2"
        style={{ maxWidth: 'calc(100vw - 32px)', width: 'max-content' }}
      >
        <div className="flex items-center gap-0.5 md:gap-1 overflow-hidden">
          {heroConfig.navItems.map((item) => {
            const IconComponent = ICON_MAP[item.icon];
            return (
              <button
                key={item.sectionId}
                onClick={() => scrollToSection(item.sectionId)}
                className="flex items-center gap-1.5 px-3 py-2 md:px-4 text-[10px] md:text-xs font-mono-custom uppercase tracking-wider text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/5 whitespace-nowrap"
              >
                <IconComponent className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center justify-end h-full pb-20 px-4">
        {/* Logo / Brand */}
        <div className="absolute top-8 left-8">
          <img src="/AIRA BLANCO.png" alt="AIRA Logo" className="h-10 w-auto" />
        </div>

        {/* Main title with decode effect */}
        <h1
          ref={titleRef}
          className="decode-text text-[12vw] md:text-[10vw] lg:text-[8vw] font-bold text-white leading-none tracking-tighter mb-4"
        >
          <span className={`${isDecoding ? 'text-glow-cyan' : ''} transition-all duration-300`}>
            {displayText}
          </span>
        </h1>

        {/* Subtitle */}
        <p ref={subtitleRef} className="font-mono-custom text-sm md:text-base text-aira-lime/70 uppercase tracking-[0.3em] mb-8">
          {heroConfig.subtitle}
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => scrollToSection(heroConfig.ctaPrimaryTarget)}
            className="px-8 py-3 bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-wider rounded-full hover:bg-white transition-colors duration-300"
          >
            {heroConfig.ctaPrimary}
          </button>
          <button
            onClick={() => scrollToSection(heroConfig.ctaSecondaryTarget)}
            className="px-8 py-3 border border-white/30 text-white font-display text-sm uppercase tracking-wider rounded-full hover:border-aira-lime hover:text-aira-lime transition-colors duration-300"
          >
            {heroConfig.ctaSecondary}
          </button>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-aira-lime/30 to-transparent" />
      <div className="absolute top-8 right-8 text-right">
        <p className="font-mono-custom text-xs text-white/40 uppercase tracking-wider">{heroConfig.cornerLabel}</p>
        <p className="font-mono-custom text-xs text-aira-lime/60">{heroConfig.cornerDetail}</p>
      </div>
    </section>
  );
};

export default Hero;
