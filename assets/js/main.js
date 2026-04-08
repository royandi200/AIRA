/* ============================================
   AIRA Festival — Main JS
   Core interactions and utilities
   ============================================ */

// === SCROLL REVEAL (Intersection Observer) ===
const revealItems = document.querySelectorAll('[data-reveal]');
if (revealItems.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );
  revealItems.forEach((el) => observer.observe(el));
}

// === MOBILE MENU (placeholder for future) ===
const mobileMenuBtn = document.querySelector('[data-mobile-menu]');
if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener('click', () => {
    document.body.classList.toggle('menu-open');
  });
}

// === PRELOAD CRITICAL IMAGES ===
const criticalImages = [
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AIRA%20BLANCO-y8BmNLjSpTGo7EK6q9vll0pauH161f.png'
];

criticalImages.forEach(src => {
  const img = new Image();
  img.src = src;
});

// === PARALLAX ON SCROLL (simple) ===
let ticking = false;

function updateParallax() {
  const scrolled = window.pageYOffset;
  const heroLogo = document.querySelector('.hero-logo');
  
  if (heroLogo && scrolled < window.innerHeight) {
    heroLogo.style.transform = `scale(${1 - scrolled * 0.0003}) translateY(${scrolled * 0.3}px)`;
    heroLogo.style.opacity = 1 - scrolled * 0.002;
  }
  
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(updateParallax);
    ticking = true;
  }
});
