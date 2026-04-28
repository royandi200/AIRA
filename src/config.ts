// =============================================================================
// Site Configuration - AIRA Electronic Music Festival
// Edit ONLY this file to customize all content across the site.
// All animations, layouts, and styles are controlled by the components.
// =============================================================================

// -- Cloudinary Base URL ------------------------------------------------------
const CLD = "https://res.cloudinary.com/dqfpxf3zq/image/upload/f_auto,q_auto,w_1200";

// -- Site-wide settings -------------------------------------------------------
export interface SiteConfig {
  title: string;
  description: string;
  language: string;
}

export const siteConfig: SiteConfig = {
  title: "AIRA - Electronic Music Festival | Guatapé, Colombia",
  description: "Experimenta la magia de AIRA, el festival de música electrónica más esperado en Guatapé, Colombia. Una experiencia inmersiva de sonido, luz y naturaleza.",
  language: "es",
};

// -- Hero Section -------------------------------------------------------------
export interface HeroNavItem {
  label: string;
  sectionId: string;
  icon: "disc" | "play" | "calendar" | "music";
}

export interface HeroConfig {
  backgroundImage: string;
  brandName: string;
  decodeText: string;
  decodeChars: string;
  subtitle: string;
  ctaPrimary: string;
  ctaPrimaryTarget: string;
  ctaSecondary: string;
  ctaSecondaryTarget: string;
  cornerLabel: string;
  cornerDetail: string;
  navItems: HeroNavItem[];
}

export const heroConfig: HeroConfig = {
  backgroundImage: "/hero-bg.jpg",
  brandName: "AIRA",
  decodeText: "GUATAPÉ",
  decodeChars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  subtitle: "Un estado de sentimiento. Música electrónica en el corazón de Colombia.",
  ctaPrimary: "Reservar Ahora",
  ctaPrimaryTarget: "booking",
  ctaSecondary: "Ver Galería",
  ctaSecondaryTarget: "gallery",
  cornerLabel: "PRÓXIMO EVENTO",
  cornerDetail: "15-17 AGO 2025",
  navItems: [
    { label: "Experiencia", sectionId: "albums", icon: "disc" },
    { label: "Galería", sectionId: "gallery", icon: "play" },
    { label: "Booking", sectionId: "booking", icon: "calendar" },
    { label: "Contacto", sectionId: "contact", icon: "music" },
  ],
};

// -- Album Cube Section -------------------------------------------------------
export interface Album {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  price: string;
  image: string;
}

export interface AlbumCubeConfig {
  albums: Album[];
  cubeTextures: string[];
  scrollHint: string;
}

export const albumCubeConfig: AlbumCubeConfig = {
  albums: [
    {
      id: 1,
      title: "AFTER YATES",
      subtitle: "DÍA 1",
      description: "La fiesta arranca en el agua. Yacht party en el embalse más mágico de Colombia, rodeado de naturaleza y música electrónica.",
      tag: "15 AGO",
      price: "$80.000",
      image: `${CLD}/majestic1_rugvtk`,
    },
    {
      id: 2,
      title: "MAJESTIC",
      subtitle: "DÍA 2",
      description: "El yate de agua dulce más grande de Latinoamérica se convierte en el escenario más exclusivo. Fiesta en Majestic y noche en Stage Joinn.",
      tag: "16 AGO",
      price: "$150.000",
      image: `${CLD}/majestic2_jkxdyj`,
    },
    {
      id: 3,
      title: "OPEN DECK",
      subtitle: "DÍA 3",
      description: "El cierre perfecto. Open deck en el embalse al atardecer, con sessiones de meditación y la mejor música para despedir el festival.",
      tag: "17 AGO",
      price: "$50.000",
      image: `${CLD}/majestic3_amqbgj`,
    },
    {
      id: 4,
      title: "PASS VIP",
      subtitle: "UPGRADE",
      description: "Acceso exclusivo al Yate VIP, Zona VIP en Majestic y Zona VIP en Stage Joinn. La experiencia AIRA en su máxima expresión.",
      tag: "3 DÍAS",
      price: "$500.000",
      image: `${CLD}/majestic4_wzvhpd`,
    },
  ],
  cubeTextures: [
    `${CLD}/majestic1_rugvtk`,
    `${CLD}/majestic2_jkxdyj`,
    `${CLD}/majestic3_amqbgj`,
    `${CLD}/majestic4_wzvhpd`,
    `${CLD}/H12_gpah4d`,
    `${CLD}/IMG_7202_vv0oat`,
  ],
  scrollHint: "Desplaza para explorar",
};

// -- Parallax Gallery Section -------------------------------------------------
export interface ParallaxImage {
  id: number;
  src: string;
  alt: string;
}

export interface GalleryImage {
  id: number;
  src: string;        // thumbnail image
  title: string;
  date: string;
  videoUrl?: string;  // optional Vimeo/YouTube/Drive URL
  videoType?: 'vimeo' | 'youtube' | 'external'; // type of video
  transition?: 'morphing' | 'zoom'; // opening transition effect
}

export interface ParallaxGalleryConfig {
  sectionLabel: string;
  sectionTitle: string;
  galleryLabel: string;
  galleryTitle: string;
  marqueeTexts: string[];
  endCtaText: string;
  parallaxImagesTop: ParallaxImage[];
  parallaxImagesBottom: ParallaxImage[];
  galleryImages: GalleryImage[];
}

export const parallaxGalleryConfig: ParallaxGalleryConfig = {
  sectionLabel: "MÚSICA + NATURALEZA",
  sectionTitle: "GALERÍA",
  galleryLabel: "MOMENTOS AIRA",
  galleryTitle: "LA EXPERIENCIA",
  marqueeTexts: [
    "GUATAPÉ",
    "MÚSICA ELECTRÓNICA",
    "NATURALEZA",
    "EXPERIENCIA ÚNICA",
    "COLOMBIA",
    "FIESTA",
    "AIRA",
    "ELECTRONIC MUSIC",
  ],
  endCtaText: "Ver Más Fotos",
  parallaxImagesTop: [
    { id: 1, src: `${CLD}/Bombillos_Amarillos_bqjry7`, alt: "Ambiente nocturno AIRA" },
    { id: 2, src: `${CLD}/Golfo_ob1g78`, alt: "Golfo Guatapé" },
    { id: 3, src: `${CLD}/Fraternidad_Bar_y_Restaurante_ujuwfo`, alt: "Fraternidad Bar" },
    { id: 4, src: `${CLD}/Balcon_Suite_smpfes`, alt: "Balcón Suite" },
    { id: 5, src: `${CLD}/unnamed_g7j6me`, alt: "Venue AIRA" },
    { id: 6, src: `${CLD}/unnamed_1_qllup5`, alt: "Venue AIRA" },
  ],
  parallaxImagesBottom: [
    { id: 1, src: `${CLD}/Ver_fotos_recientes_6_zdeq7j`, alt: "Fiesta AIRA" },
    { id: 2, src: `${CLD}/Ver_fotos_recientes_7_nadnoe`, alt: "Fiesta AIRA" },
    { id: 3, src: `${CLD}/Ver_fotos_recientes_8_pbkrhc`, alt: "Fiesta AIRA" },
    { id: 4, src: `${CLD}/IMG_7069_de6ohx`, alt: "Crowd AIRA" },
    { id: 5, src: `${CLD}/IMG_7056_psidvj`, alt: "Crowd AIRA" },
    { id: 6, src: `${CLD}/IMG_7070_s1zkxl`, alt: "Crowd AIRA" },
  ],
  galleryImages: [
    { id: 1,  src: `${CLD}/IMG_6978_azjins`,  title: "Main Stage",       date: "2024", transition: "morphing" },
    { id: 2,  src: `${CLD}/IMG_7035_zyvogp`,  title: "Headliners",       date: "2024", transition: "zoom"     },
    { id: 3,  src: `${CLD}/IMG_7023_dbkww0`,  title: "La Multitud",      date: "2024", transition: "morphing" },
    { id: 4,  src: `${CLD}/IMG_6953_d31rco`,  title: "Sunset Session",   date: "2024", transition: "zoom"     },
    { id: 5,  src: `${CLD}/IMG_6998_vjiohx`,  title: "Yacht Experience", date: "2024", transition: "morphing" },
    { id: 6,  src: `${CLD}/IMG_6945_dpikoa`,  title: "VIP Lounge",       date: "2024", transition: "zoom"     },
    { id: 7,  src: `${CLD}/IMG_6881_hqab2v`,  title: "After Party",      date: "2024", transition: "morphing" },
    { id: 8,  src: `${CLD}/IMG_6912_i7tth1`,  title: "Open Deck",        date: "2024", transition: "zoom"     },
    { id: 9,  src: `${CLD}/IMG_6737_tujfvd`,  title: "Embalse",          date: "2024", transition: "morphing" },
    { id: 10, src: `${CLD}/IMG_6825_uclttl`,  title: "Crowd Energy",     date: "2024", transition: "zoom"     },
    { id: 11, src: `${CLD}/IMG_6760_newlqz`,  title: "Night Vibes",      date: "2024", transition: "morphing" },
    { id: 12, src: `${CLD}/unnamed_2_zmr1ro`, title: "Venue",            date: "2024", transition: "zoom"     },
  ],
};

// -- Tour Schedule Section (BOOKING) ------------------------------------------
export interface TourDate {
  id: number;
  date: string;
  time: string;
  city: string;
  venue: string;
  status: "on-sale" | "sold-out" | "coming-soon";
  image: string;
  category: "premium" | "daily";  // premium = destacado, daily = por día
  description?: string;           // texto corto descriptivo
  price?: string;                 // precio visible en la card
}

export interface TourStatusLabels {
  onSale: string;
  soldOut: string;
  comingSoon: string;
  default: string;
}

export interface TourScheduleConfig {
  sectionLabel: string;
  sectionTitle: string;
  vinylImage: string;
  buyButtonText: string;
  detailsButtonText: string;
  bottomNote: string;
  bottomCtaText: string;
  statusLabels: TourStatusLabels;
  tourDates: TourDate[];
}

export const tourScheduleConfig: TourScheduleConfig = {
  sectionLabel: "BOOKING",
  sectionTitle: "RESERVA TU EXPERIENCIA",
  vinylImage: "/vinyl.jpg",
  buyButtonText: "Reservar",
  detailsButtonText: "Detalles",
  bottomNote: "Todas las experiencias incluyen acceso a zonas comunes",
  bottomCtaText: "Ver Todos los Paquetes",
  statusLabels: {
    onSale: "DISPONIBLE",
    soldOut: "AGOTADO",
    comingSoon: "PRÓXIMAMENTE",
    default: "RESERVAR",
  },
  tourDates: [
    // ── PREMIUM ────────────────────────────────────────────────────────────
    {
      id: 4,
      date: "2025.08.15",
      time: "18:00",
      city: "GUATAPÉ",
      venue: "PAQUETE 3 DÍAS",
      status: "on-sale",
      image: `${CLD}/majestic4_wzvhpd`,
      category: "premium",
      description: "Los 3 días completos. Acceso total al festival.",
      price: "Desde $ 590.000",
    },
    {
      id: 7,
      date: "2025.08.15",
      time: "18:00",
      city: "GUATAPÉ",
      venue: "PASS VIP",
      status: "on-sale",
      image: `${CLD}/majestic4_wzvhpd`,
      category: "premium",
      description: "Zona VIP exclusiva en todos los escenarios.",
      price: "$ 450.000",
    },
    {
      id: 8,
      date: "2025.08.15",
      time: "07:00",
      city: "MEDELLÍN",
      venue: "TRANSPORTE",
      status: "on-sale",
      image: `${CLD}/Fraternidad_Bar_y_Restaurante_ujuwfo`,
      category: "premium",
      description: "Bus directo ida y vuelta Medellín → Guatapé.",
      price: "$ 180.000",
    },
    {
      id: 5,
      date: "2025.08.15",
      time: "14:00",
      city: "GUATAPÉ",
      venue: "SUITE PRIVADA",
      status: "on-sale",
      image: `${CLD}/Balcon_Suite_smpfes`,
      category: "premium",
      description: "Alojamiento premium en el embalse. 3 noches.",
      price: "$ 2.200.000",
    },
    {
      id: 9,
      date: "2025.08.15",
      time: "14:00",
      city: "GUATAPÉ",
      venue: "CABAÑA COMPLETA x7",
      status: "on-sale",
      image: `${CLD}/Balcon_Suite_smpfes`,
      category: "premium",
      description: "Cabaña entera para 7 personas. 3 noches en el embalse.",
      price: "$ 5.500.000",
    },
    // ── POR DÍA ────────────────────────────────────────────────────────────
    {
      id: 1,
      date: "2025.08.15",
      time: "18:00",
      city: "GUATAPÉ",
      venue: "DÍA 1 — After Fiesta de Yates",
      status: "on-sale",
      image: `${CLD}/majestic1_rugvtk`,
      category: "daily",
      price: "$ 80.000",
    },
    {
      id: 2,
      date: "2025.08.16",
      time: "18:00",
      city: "GUATAPÉ",
      venue: "DÍA 2 — Fiesta Majestic & Stage Joinn",
      status: "on-sale",
      image: `${CLD}/majestic2_jkxdyj`,
      category: "daily",
      price: "$ 150.000",
    },
    {
      id: 3,
      date: "2025.08.17",
      time: "18:00",
      city: "GUATAPÉ",
      venue: "DÍA 3 — Open Deck",
      status: "on-sale",
      image: `${CLD}/majestic3_amqbgj`,
      category: "daily",
      price: "$ 50.000",
    },
  ],
};

// -- Footer Section -----------------------------------------------------------
export interface FooterImage {
  id: number;
  src: string;
}

export interface SocialLink {
  icon: "instagram" | "twitter" | "youtube" | "music";
  label: string;
  href: string;
}

export interface FooterConfig {
  portraitImage: string;
  portraitAlt: string;
  heroTitle: string;
  heroSubtitle: string;
  artistLabel: string;
  artistName: string;
  artistSubtitle: string;
  brandName: string;
  brandDescription: string;
  quickLinksTitle: string;
  quickLinks: string[];
  contactTitle: string;
  emailLabel: string;
  email: string;
  phoneLabel: string;
  phone: string;
  addressLabel: string;
  address: string;
  newsletterTitle: string;
  newsletterDescription: string;
  newsletterButtonText: string;
  subscribeAlertMessage: string;
  copyrightText: string;
  bottomLinks: string[];
  socialLinks: SocialLink[];
  galleryImages: FooterImage[];
}

export const footerConfig: FooterConfig = {
  portraitImage: `${CLD}/IMG_7202_vv0oat`,
  portraitAlt: "DJ AIRA",
  heroTitle: "AIRA",
  heroSubtitle: "A State of Feeling",
  artistLabel: "FESTIVAL",
  artistName: "AIRA",
  artistSubtitle: "Electronic Music Experience",
  brandName: "AIRA",
  brandDescription: "El festival de música electrónica que fusiona la energía de la música con la magia natural de Guatapé, Colombia. Una experiencia inmersiva que despierta todos tus sentidos.",
  quickLinksTitle: "Enlaces Rápidos",
  quickLinks: ["Experiencia", "Galería", "Booking", "Contacto"],
  contactTitle: "Contacto",
  emailLabel: "Email",
  email: "info@viveaira.live",
  phoneLabel: "Teléfono",
  phone: "+57 (604) 123-4567",
  addressLabel: "Ubicación",
  address: "Guatapé, Antioquia, Colombia",
  newsletterTitle: "Newsletter",
  newsletterDescription: "Suscríbete para recibir noticias y ofertas exclusivas",
  newsletterButtonText: "Suscribirse",
  subscribeAlertMessage: "¡Gracias por suscribirte! Pronto recibirás nuestras novedades.",
  copyrightText: "© 2025 AIRA Festival. Todos los derechos reservados.",
  bottomLinks: ["Términos y Condiciones", "Política de Privacidad"],
  socialLinks: [
    { icon: "instagram", label: "Instagram", href: "https://instagram.com/airafestival" },
    { icon: "twitter", label: "Twitter", href: "https://twitter.com/airafestival" },
    { icon: "youtube", label: "YouTube", href: "https://youtube.com/airafestival" },
    { icon: "music", label: "Spotify", href: "https://spotify.com/airafestival" },
  ],
  galleryImages: [
    { id: 1, src: `${CLD}/Ver_fotos_recientes_6_zdeq7j` },
    { id: 2, src: `${CLD}/IMG_6912_i7tth1` },
    { id: 3, src: `${CLD}/Golfo_ob1g78` },
    { id: 4, src: `${CLD}/Bombillos_Amarillos_bqjry7` },
  ],
};
