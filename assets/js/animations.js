/* ============================================
   AIRA Festival — Animations
   GSAP + Three.js immersive 3D scene
   Brand: Electric Blue #004fff + Lime #e1fe52
   ============================================ */

/* === LOADER === */
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('is-hidden');
    }, 2200);
  }
});

/* === COUNTDOWN TIMER === */
(function initCountdown() {
  const targetDate = new Date('August 14, 2026 16:00:00').getTime();
  
  function updateCountdown() {
    const now = new Date().getTime();
    const distance = targetDate - now;
    
    if (distance > 0) {
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      const daysEl = document.getElementById('days');
      const hoursEl = document.getElementById('hours');
      const minutesEl = document.getElementById('minutes');
      const secondsEl = document.getElementById('seconds');
      
      if (daysEl) daysEl.textContent = String(days).padStart(3, '0');
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
      if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }
  }
  
  updateCountdown();
  setInterval(updateCountdown, 1000);
})();

/* === GSAP ANIMATIONS === */
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);

  // Wait for loader to finish
  gsap.delayedCall(2.4, () => {
    // Hero entrance timeline
    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    
    heroTl
      .from('.hero-date', { 
        opacity: 0, 
        y: -30, 
        duration: 1 
      })
      .from('.hero-logo', { 
        opacity: 0, 
        scale: 0.8, 
        duration: 1.2,
        ease: 'elastic.out(1, 0.5)'
      }, '-=0.6')
      .from('.hero-tagline', { 
        opacity: 0, 
        y: 20, 
        duration: 0.8 
      }, '-=0.4')
      .from('.hero-location', { 
        opacity: 0, 
        y: 20, 
        duration: 0.8 
      }, '-=0.4')
      .from('.hero-cta .btn', { 
        opacity: 0, 
        y: 30, 
        stagger: 0.15, 
        duration: 0.8 
      }, '-=0.3')
      .from('.hero-scroll', { 
        opacity: 0, 
        y: 20, 
        duration: 0.8 
      }, '-=0.2');

    // Header fade in
    gsap.from('.site-header', {
      opacity: 0,
      y: -20,
      duration: 0.8,
      ease: 'power2.out',
      delay: 2.6
    });
  });

  // Countdown section parallax
  gsap.to('.countdown-section', {
    backgroundPositionY: '30%',
    ease: 'none',
    scrollTrigger: {
      trigger: '.countdown-section',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true
    }
  });

  // Section reveals
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: 50,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      onComplete: () => el.classList.add('is-visible')
    });
  });

  // Lineup cards stagger
  ScrollTrigger.batch('.lineup-day', {
    onEnter: (elements) => {
      gsap.from(elements, {
        opacity: 0,
        y: 60,
        stagger: 0.15,
        duration: 0.8,
        ease: 'power3.out'
      });
    },
    start: 'top 85%'
  });

  // Experience cards stagger
  ScrollTrigger.batch('.experience-card', {
    onEnter: (elements) => {
      gsap.from(elements, {
        opacity: 0,
        y: 40,
        scale: 0.95,
        stagger: 0.1,
        duration: 0.7,
        ease: 'power2.out'
      });
    },
    start: 'top 85%'
  });

  // Ticket cards stagger
  ScrollTrigger.batch('.ticket-card', {
    onEnter: (elements) => {
      gsap.from(elements, {
        opacity: 0,
        y: 50,
        stagger: 0.12,
        duration: 0.8,
        ease: 'power3.out'
      });
    },
    start: 'top 85%'
  });

  // Parallax effect on experience image
  gsap.to('.experience-img', {
    yPercent: -15,
    ease: 'none',
    scrollTrigger: {
      trigger: '.experience-visual',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1
    }
  });

  // Header background on scroll
  ScrollTrigger.create({
    start: 100,
    onUpdate: (self) => {
      const header = document.querySelector('.site-header');
      if (header) {
        if (self.scroll() > 100) {
          header.style.background = 'rgba(0, 0, 0, 0.95)';
        } else {
          header.style.background = 'rgba(0, 0, 0, 0.8)';
        }
      }
    }
  });
}

/* === THREE.JS 3D BACKGROUND === */
if (typeof THREE !== 'undefined') {
  const canvas = document.getElementById('canvas-3d');
  if (canvas) {
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: true, 
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 6;

    // Particle system - floating particles
    const particleCount = 500;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      sizes[i] = Math.random() * 2 + 0.5;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x004fff,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Accent particles (lime)
    const accentParticleCount = 100;
    const accentGeometry = new THREE.BufferGeometry();
    const accentPositions = new Float32Array(accentParticleCount * 3);

    for (let i = 0; i < accentParticleCount; i++) {
      accentPositions[i * 3] = (Math.random() - 0.5) * 15;
      accentPositions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      accentPositions[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }

    accentGeometry.setAttribute('position', new THREE.BufferAttribute(accentPositions, 3));

    const accentMaterial = new THREE.PointsMaterial({
      color: 0xe1fe52,
      size: 0.12,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const accentParticles = new THREE.Points(accentGeometry, accentMaterial);
    scene.add(accentParticles);

    // Wireframe sphere (sound wave visualization)
    const sphereGeometry = new THREE.IcosahedronGeometry(2, 2);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x004fff,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Inner sphere
    const innerSphereGeometry = new THREE.IcosahedronGeometry(1.2, 1);
    const innerSphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xe1fe52,
      wireframe: true,
      transparent: true,
      opacity: 0.1
    });
    const innerSphere = new THREE.Mesh(innerSphereGeometry, innerSphereMaterial);
    scene.add(innerSphere);

    // Mouse parallax
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;
    
    document.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Resize handler
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Audio-reactive simulation (sine wave)
    let audioTime = 0;

    // Render loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      audioTime += 0.016;

      // Smooth mouse follow
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Rotate particles
      particles.rotation.y = t * 0.05 + targetX * 0.3;
      particles.rotation.x = t * 0.03 + targetY * 0.3;
      
      accentParticles.rotation.y = -t * 0.08 + targetX * 0.2;
      accentParticles.rotation.x = t * 0.04 - targetY * 0.2;

      // Pulsate spheres (simulating audio reactivity)
      const pulse = Math.sin(audioTime * 2) * 0.1 + 1;
      const pulse2 = Math.sin(audioTime * 3 + 1) * 0.15 + 1;
      
      sphere.scale.set(pulse, pulse, pulse);
      sphere.rotation.x = t * 0.1 + targetY * 0.5;
      sphere.rotation.y = t * 0.15 + targetX * 0.5;
      
      innerSphere.scale.set(pulse2, pulse2, pulse2);
      innerSphere.rotation.x = -t * 0.12 - targetY * 0.3;
      innerSphere.rotation.y = -t * 0.18 - targetX * 0.3;

      // Animate particle positions subtly
      const posArray = particleGeometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        posArray[i3 + 1] += Math.sin(t + i * 0.1) * 0.002;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }
    animate();
  }
}

/* === SMOOTH SCROLL FOR ANCHOR LINKS === */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const headerHeight = document.querySelector('.site-header')?.offsetHeight || 80;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  });
});

/* === NEWSLETTER FORM === */
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = newsletterForm.querySelector('input');
    const button = newsletterForm.querySelector('button');
    
    if (input && input.value) {
      button.textContent = 'Enviado!';
      button.style.background = '#22c55e';
      input.value = '';
      
      setTimeout(() => {
        button.textContent = 'Suscribirse';
        button.style.background = '';
      }, 3000);
    }
  });
}
