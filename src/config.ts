// =============================================================================
// Site Configuration - AIRA Electronic Music Festival
// Edit ONLY this file to customize all content across the site.
// All animations, layouts, and styles are controlled by the components.
// =============================================================================

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
      title: "MAIN STAGE",
      subtitle: "EXPERIENCIA",
      image: "/main-stage.jpg",
    },
    {
      id: 2,
      title: "BEACH STAGE",
      subtitle: "NATURALEZA",
      image: "/beach-party.jpg",
    },
    {
      id: 3,
      title: "YACHT PARTY",
      subtitle: "EXCLUSIVIDAD",
      image: "/yacht-party.jpg",
    },
    {
      id: 4,
      title: "VIP LOUNGE",
      subtitle: "LUJO",
      image: "/vip-area.jpg",
    },
  ],
  cubeTextures: [
    "/cube-1.jpg",
    "/cube-2.jpg",
    "/cube-3.jpg",
    "/cube-4.jpg",
    "/cube-5.jpg",
    "/cube-6.jpg",
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
  src: string;
  title: string;
  date: string;
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
  sectionLabel: "LA EXPERIENCIA",
  sectionTitle: "MÚSICA + NATURALEZA",
  galleryLabel: "GALERÍA",
  galleryTitle: "MOMENTOS AIRA",
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
    { id: 1, src: "/dj-1.jpg", alt: "DJ en escenario" },
    { id: 2, src: "/crowd-1.jpg", alt: "Multitud bailando" },
    { id: 3, src: "/stage-1.jpg", alt: "Escenario principal" },
    { id: 4, src: "/dj-female.jpg", alt: "DJ femenina" },
    { id: 5, src: "/celebration.jpg", alt: "Celebración" },
    { id: 6, src: "/dancers.jpg", alt: "Bailarines" },
  ],
  parallaxImagesBottom: [
    { id: 1, src: "/guatape-aerial.jpg", alt: "Vista aérea de Guatapé" },
    { id: 2, src: "/beach-party.jpg", alt: "Fiesta en la playa" },
    { id: 3, src: "/yacht-party.jpg", alt: "Fiesta en yate" },
    { id: 4, src: "/vip-area.jpg", alt: "Zona VIP" },
    { id: 5, src: "/bar.jpg", alt: "Bar de cocteles" },
    { id: 6, src: "/penol.jpg", alt: "Piedra del Peñol" },
  ],
  galleryImages: [
    { id: 1, src: "/main-stage.jpg", title: "Main Stage", date: "2024" },
    { id: 2, src: "/dj-1.jpg", title: "Headliners", date: "2024" },
    { id: 3, src: "/crowd-1.jpg", title: "La Multitud", date: "2024" },
    { id: 4, src: "/beach-party.jpg", title: "Sunset Session", date: "2024" },
    { id: 5, src: "/yacht-party.jpg", title: "Yacht Experience", date: "2024" },
    { id: 6, src: "/vip-area.jpg", title: "VIP Lounge", date: "2024" },
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
    {
      id: 1,
      date: "2025.08.15",
      time: "18:00",
      city: "GUATAPÉ",
      venue: "ENTRADA GENERAL - DÍA 1",
      status: "on-sale",
      image: "/stage-1.jpg",
    },
    {
      id: 2,
      date: "2025.08.16",
      time: "18:00",
      city: "GUATAPÉ",
      venue: "ENTRADA GENERAL - DÍA 2",
      status: "on-sale",
      image: "/main-stage.jpg",
    },
    {
      id: 3,
      date: "2025.08.17",
      time: "18:00",
      city: "GUATAPÉ",
      venue: "ENTRADA GENERAL - DÍA 3",
      status: "on-sale",
      image: "/beach-party.jpg",
    },
    {
      id: 4,
      date: "2025.08.15",
      time: "20:00",
      city: "GUATAPÉ",
      venue: "PAQUETE VIP - 3 DÍAS",
      status: "on-sale",
      image: "/vip-area.jpg",
    },
    {
      id: 5,
      date: "2025.08.16",
      time: "14:00",
      city: "EMBALSE",
      venue: "YACHT PARTY EXPERIENCE",
      status: "coming-soon",
      image: "/yacht-party.jpg",
    },
    {
      id: 6,
      date: "2025.08.17",
      time: "12:00",
      city: "GUATAPÉ",
      venue: "BACKSTAGE EXPERIENCE",
      status: "sold-out",
      image: "/dj-console.jpg",
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
  portraitImage: "/dj-portrait.jpg",
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
  email: "info@airafestival.com",
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
    { id: 1, src: "/AIRA-2.png" },
    { id: 2, src: "/AIRA-3.png" },
    { id: 3, src: "/sunset.jpg" },
    { id: 4, src: "/penol.jpg" },
  ],
};
