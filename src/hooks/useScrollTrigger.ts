import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollTriggerOptions {
  trigger?: string | Element;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  pin?: boolean;
  markers?: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
  onEnterBack?: () => void;
  onLeaveBack?: () => void;
}

export const useScrollTrigger = (
  ref: RefObject<Element>,
  animation: gsap.core.Tween | gsap.core.Timeline | null,
  options: ScrollTriggerOptions = {}
) => {
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    if (!ref.current || !animation) return;

    const st = ScrollTrigger.create({
      trigger: ref.current,
      start: options.start || 'top 80%',
      end: options.end || 'bottom 20%',
      scrub: options.scrub,
      pin: options.pin,
      markers: options.markers,
      animation,
      onEnter: options.onEnter,
      onLeave: options.onLeave,
      onEnterBack: options.onEnterBack,
      onLeaveBack: options.onLeaveBack,
    });

    scrollTriggerRef.current = st;

    return () => { st.kill(); };
  }, [ref, animation]);

  return scrollTriggerRef;
};

export default useScrollTrigger;
