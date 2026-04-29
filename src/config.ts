// =============================================================================
// Site Configuration - AIRA Electronic Music Festival
// Edit ONLY this file to customize all content across the site.
// All animations, layouts, and styles are controlled by the components.
// =============================================================================

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
      image: "/yacht-party.jpg",
    },
    {
      id: 2,
      title: "MAJESTIC",
      subtitle: "DÍA 2",
      description: "El yate de agua dulce más grande de Latinoamérica se convierte en el escenario más exclusivo. Fiesta en Majestic y noche en Stage Joinn.",
      tag: "16 AGO",
      price: "$150.000",
      image: "/main-stage.jpg",
    },
    {
      id: 3,
      title: "OPEN DECK",
      subtitle: "DÍA 3",
      description: "El cierre perfecto. Open deck en el embalse al atardecer, con sessiones de meditación y la mejor música para despedir el festival.",
      tag: "17 AGO",
      price: "$50.000",
      image: "/beach-party.jpg",
    },
    {
      id: 4,
      title: "PASS VIP",
      subtitle: "UPGRADE",
      description: "Acceso exclusivo al Yate VIP, Zona VIP en Majestic y Zona VIP en Stage Joinn. La experiencia AIRA en su máxima expresión.",
      tag: "3 DÍAS",
      price: "$500.000",
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
  // Experience detail
  subtitle?: string;
  description?: string;
  detail?: string;
  highlights?: string[];
  images?: string[];
  badge?: string;
  accent?: string;
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
  sectionTitle: "AIRA 2026",
  galleryLabel: "GALERÍA",
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
    {
      id: 1,
      src: `${CLD}/IMG_6978_azjins`,
      title: "Floating Stage",
      date: "2026",
      subtitle: "Escenario principal",
      badge: "MAIN STAGE",
      accent: "#e1fe52",
      description: "Una plataforma flotante en la mitad del embalse de Guatapé. Rodeado de agua, montañas y cielo abierto — el corazón de AIRA donde la música electrónica y la naturaleza se fusionan en algo que no existe en ningún otro festival de Colombia.",
      detail: "Sound system de clase mundial, producción de luces y visuales inmersivos sobre el agua. El reflejo de los lasers en el embalse crea una experiencia única. Opera desde el atardecer hasta el amanecer los 3 días del festival.",
      highlights: ["Sound system clase mundial", "Producción visual inmersiva", "Vista 360° del embalse", "2.000+ personas"],
      images: [`${CLD}/IMG_6978_azjins`, `${CLD}/IMG_7035_zyvogp`, `${CLD}/IMG_6953_d31rco`],
    },
    {
      id: 2,
      src: `${CLD}/majestic1_rugvtk`,
      title: "Majestic Yacht",
      date: "2026",
      subtitle: "El yate más grande de LATAM",
      badge: "EXCLUSIVO",
      accent: "#00D4FF",
      description: "A bordo del yate de agua dulce más grande de Latinoamérica. Los mejores DJs mezclan en cubierta mientras navegas el embalse. Una experiencia que pocas personas en el mundo han vivido.",
      detail: "Cupos muy limitados. Bar premium a bordo, atardecer sobre el embalse y la sensación de bailar mientras el agua se mueve bajo tus pies. El Majestic opera como escenario privado exclusivo durante AIRA 2026.",
      highlights: ["Cupos exclusivos limitados", "DJs en cubierta", "Bar premium a bordo", "Navegación en el embalse"],
      images: [`${CLD}/majestic1_rugvtk`, `${CLD}/majestic2_jkxdyj`, `${CLD}/IMG_6998_vjiohx`],
    },
    {
      id: 3,
      src: `${CLD}/IMG_7023_dbkww0`,
      title: "Beach Stage",
      date: "2026",
      subtitle: "La playa del festival",
      accent: "#FF6B35",
      description: "Ubicado en la playa del hotel, el Beach Stage es el corazón social de AIRA. Música desde el mediodía, zona de descanso, food trucks y el agua del embalse a pasos de distancia.",
      detail: "Opera desde mediodía hasta la noche con sets que van de lo relajado a lo intenso conforme avanza el día. Hamacas, zona de descanso y el ambiente más íntimo del festival.",
      highlights: ["Acceso directo al agua", "Food & drinks toda la tarde", "Sets diurnos y nocturnos", "Ambiente íntimo"],
      images: [`${CLD}/IMG_7023_dbkww0`, `${CLD}/IMG_7069_de6ohx`, `${CLD}/Ver_fotos_recientes_6_zdeq7j`],
    },
    {
      id: 4,
      src: `${CLD}/Bombillos_Amarillos_bqjry7`,
      title: "Lobby Stage",
      date: "2026",
      subtitle: "Epicentro de bienvenida",
      accent: "#B06EFF",
      description: "El primer impacto cuando llegas a AIRA. Punto de encuentro, actividades de bienestar en las mañanas y música sin parar desde el mediodía hasta que todos migran al Floating Stage.",
      detail: "El Lobby Stage conecta todas las áreas del festival. Meditación y yoga en la mañana. Música en vivo desde el mediodía. Punto de reunión antes de cada sesión en el Floating Stage.",
      highlights: ["Actividades de bienestar", "Música desde el mediodía", "Centro del festival", "Incluido en todos los paquetes"],
      images: [`${CLD}/Bombillos_Amarillos_bqjry7`, `${CLD}/IMG_7070_s1zkxl`, `${CLD}/IMG_6881_hqab2v`],
    },
    {
      id: 5,
      src: `${CLD}/Balcon_Suite_smpfes`,
      title: "Cabañas Privadas",
      date: "2026",
      subtitle: "Tu casa en el embalse",
      badge: "LIMITADO",
      accent: "#e1fe52",
      description: "Hasta 7 personas. Balcón directo al embalse. 3 noches. Acceso completo al festival. Las cabañas privadas convierten AIRA en un retiro que va mucho más allá de un festival.",
      detail: "Incluye acceso completo los 3 días, desayunos, terraza privada con vista al embalse y servicio durante todo el evento. Históricamente son lo primero en agotarse.",
      highlights: ["Hasta 7 personas", "3 noches en el embalse", "Balcón privado con vista", "Acceso completo incluido"],
      images: [`${CLD}/Balcon_Suite_smpfes`, `${CLD}/Golfo_ob1g78`, `${CLD}/Fraternidad_Bar_y_Restaurante_ujuwfo`],
    },
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
  category?: string;
  description?: string;
  price?: string;
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
