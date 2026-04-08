/* ============================================
   AIRA — Animations
   GSAP + Three.js scene setup
   Requires: gsap@3.x, three@latest (via CDN)
   ============================================ */

/* --- GSAP ScrollTrigger Init --- */
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);

  // Hero entrance
  gsap.from('.hero-tag', { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out', delay: 0.2 });
  gsap.from('.hero-title', { opacity: 0, y: 40, duration: 1, ease: 'power3.out', delay: 0.4 });
  gsap.from('.hero-subtitle', { opacity: 0, y: 30, duration: 0.9, ease: 'power3.out', delay: 0.6 });
  gsap.from('.hero-cta', { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out', delay: 0.8 });

  // Section reveals via ScrollTrigger
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: 50,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });
}

/* --- Three.js 3D Background --- */
if (typeof THREE !== 'undefined') {
  const canvas = document.getElementById('canvas-3d');
  if (canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    // Floating torus knot
    const geometry = new THREE.TorusKnotGeometry(1.4, 0.4, 120, 20);
    const material = new THREE.MeshStandardMaterial({
      color: 0x01696f,
      roughness: 0.3,
      metalness: 0.6,
      wireframe: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x4f98a3, 3, 20);
    pointLight.position.set(3, 3, 3);
    scene.add(pointLight);

    // Mouse parallax
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.5;
    });

    // Resize handler
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Render loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      mesh.rotation.x = t * 0.15 + mouseY;
      mesh.rotation.y = t * 0.2 + mouseX;
      renderer.render(scene, camera);
    }
    animate();
  }
}
