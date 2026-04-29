import { useRef, useState } from 'react';
import { MapPin, Users, Music, Anchor, Home, Star, ChevronRight, X } from 'lucide-react';

const CLD = "https://res.cloudinary.com/dqfpxf3zq/image/upload/f_auto,q_auto,w_1200";

interface Zone {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  detail: string;
  highlights: string[];
  images: string[];
  icon: React.ReactNode;
  accent: string;
  badge?: string;
}

const ZONES: Zone[] = [
  {
    id: 1,
    tag: "ESCENARIO PRINCIPAL",
    title: "Floating Stage",
    subtitle: "La pista más épica del embalse",
    description: "Una plataforma flotante en la mitad del embalse de Guatapé. Rodeado de agua, montañas y el cielo abierto, el Floating Stage es el corazón de AIRA — donde la música electrónica y la naturaleza se fusionan en algo que no existe en ningún otro festival.",
    detail: "Música electrónica de alta potencia desde el anochecer hasta el amanecer, con producción de luces y sonido de nivel internacional. El reflejo de los visuales en el agua crea una experiencia que no se puede describir — solo vivir.",
    highlights: ["Sound system de clase mundial", "Producción visual inmersiva", "Vista 360° del embalse", "Capacidad 2.000+ personas"],
    images: [
      `${CLD}/IMG_6978_azjins`,
      `${CLD}/IMG_7035_zyvogp`,
      `${CLD}/IMG_6953_d31rco`,
    ],
    icon: <Music className="w-5 h-5" />,
    accent: "#e1fe52",
    badge: "MAIN STAGE",
  },
  {
    id: 2,
    tag: "EXPERIENCIA NÁUTICA",
    title: "Majestic Yacht",
    subtitle: "El yate más grande de agua dulce en LATAM",
    description: "A bordo del Majestic — el yate de agua dulce más grande de Latinoamérica — la fiesta cobra otra dimensión. Navegas el embalse mientras los mejores DJs del continente mezclan en cubierta. Una experiencia que pocas personas en el mundo han vivido.",
    detail: "El Majestic opera como escenario privado exclusivo durante AIRA 2026. Cupos muy limitados. Si logras estar a bordo, es el highlight del festival — garantizado.",
    highlights: ["Cupos exclusivos y limitados", "DJs en cubierta durante la navegación", "Bar premium a bordo", "Atardecer sobre el embalse"],
    images: [
      `${CLD}/majestic1_rugvtk`,
      `${CLD}/majestic2_jkxdyj`,
      `${CLD}/IMG_6998_vjiohx`,
    ],
    icon: <Anchor className="w-5 h-5" />,
    accent: "#00D4FF",
    badge: "EXCLUSIVO",
  },
  {
    id: 3,
    tag: "ZONA SOCIAL",
    title: "Beach Stage",
    subtitle: "La playa del festival",
    description: "Ubicado en la playa del hotel, el Beach Stage es el punto de encuentro de la comunidad AIRA. Música más relajada durante el día, sets de mayor energía al caer la tarde. El lugar ideal para conocer gente, bailar descalzo y vivir el festival a tu ritmo.",
    detail: "El Beach Stage opera desde mediodía hasta la noche. Zona de descanso, hamacas, food trucks y bar. La energía aquí es diferente — más íntima, más conectada.",
    highlights: ["Acceso directo al agua", "Food & drinks toda la tarde", "Sets diurnos y nocturnos", "Zona de descanso y hamacas"],
    images: [
      `${CLD}/IMG_7023_dbkww0`,
      `${CLD}/IMG_7069_de6ohx`,
      `${CLD}/IMG_7056_psidvj`,
    ],
    icon: <Users className="w-5 h-5" />,
    accent: "#FF6B35",
  },
  {
    id: 4,
    tag: "BIENVENIDA",
    title: "Lobby Stage",
    subtitle: "El epicentro de entrada al festival",
    description: "El Lobby Stage es el primer impacto. Cuando llegas a AIRA, la música ya está sonando. Diseñado como zona de bienvenida y encuentro, este escenario conecta todas las áreas del festival y sirve de punto de partida para explorar la experiencia completa.",
    detail: "Durante las mañanas es punto de reunión para actividades grupales y meditación. A partir del mediodía empieza la programación musical y no para hasta que el último asistente se va al Floating Stage.",
    highlights: ["Acceso incluido en todos los paquetes", "Actividades de bienestar en la mañana", "Música desde el mediodía", "Centro logístico del festival"],
    images: [
      `${CLD}/Bombillos_Amarillos_bqjry7`,
      `${CLD}/IMG_7070_s1zkxl`,
      `${CLD}/IMG_6881_hqab2v`,
    ],
    icon: <MapPin className="w-5 h-5" />,
    accent: "#B06EFF",
  },
  {
    id: 5,
    tag: "ALOJAMIENTO PREMIUM",
    title: "Cabañas Privadas",
    subtitle: "Tu casa en el embalse",
    description: "Para quienes quieren vivirlo todo sin límites: las cabañas privadas del festival. Hasta 7 personas por cabaña, con balcón directo al embalse, acceso prioritario a todos los escenarios y una experiencia de 3 noches que convierte AIRA en algo más que un festival — en un retiro.",
    detail: "Las cabañas incluyen acceso completo al festival, desayunos, terraza privada con vista al embalse y servicio durante todo el evento. Disponibilidad muy limitada — se agotan primero.",
    highlights: ["Hasta 7 personas por cabaña", "3 noches en el embalse", "Balcón privado con vista", "Acceso completo al festival"],
    images: [
      `${CLD}/Balcon_Suite_smpfes`,
      `${CLD}/Golfo_ob1g78`,
      `${CLD}/Fraternidad_Bar_y_Restaurante_ujuwfo`,
    ],
    icon: <Home className="w-5 h-5" />,
    accent: "#e1fe52",
    badge: "LIMITADO",
  },
];

interface ZoneModalProps {
  zone: Zone;
  onClose: () => void;
}

const ZoneModal = ({ zone, onClose }: ZoneModalProps) => {
  const [activeImg, setActiveImg] = useState(0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      style={{ background: 'rgba(3,6,18,0.92)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full md:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl"
        style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Image carousel */}
        <div className="relative h-64 md:h-80 overflow-hidden rounded-t-3xl md:rounded-t-3xl">
          <img
            src={zone.images[activeImg]}
            alt={zone.title}
            className="w-full h-full object-cover transition-all duration-500"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0a0f1e 0%, transparent 60%)' }}/>

          {/* Thumbnail row */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {zone.images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className="transition-all duration-200"
                style={{
                  width: i === activeImg ? 24 : 8, height: 8,
                  borderRadius: 4,
                  background: i === activeImg ? zone.accent : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Badge */}
          {zone.badge && (
            <div
              className="absolute top-4 left-4 px-3 py-1 rounded-full font-mono-custom text-[9px] uppercase tracking-[0.3em]"
              style={{ background: zone.accent, color: '#000' }}
            >
              {zone.badge}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          <p className="font-mono-custom text-[9px] uppercase tracking-[0.3em] mb-2" style={{ color: zone.accent }}>
            {zone.tag} · AIRA 2026
          </p>
          <h3 className="font-display text-4xl md:text-5xl text-white mb-1">{zone.title}</h3>
          <p className="text-white/50 text-sm mb-5">{zone.subtitle}</p>

          <p className="text-white/70 text-sm leading-relaxed mb-4">{zone.description}</p>
          <p className="text-white/50 text-sm leading-relaxed mb-6">{zone.detail}</p>

          {/* Highlights */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {zone.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: zone.accent }} />
                <span className="text-xs text-white/60">{h}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl font-display text-sm uppercase tracking-[0.2em] transition-all"
            style={{ background: zone.accent, color: '#000' }}
          >
            Ver paquetes →
          </button>
        </div>
      </div>
    </div>
  );
};

const Experience = () => {
  const [activeZone, setActiveZone] = useState<Zone | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <section
        id="experiencia"
        ref={sectionRef}
        className="relative bg-aira-darkBlue overflow-hidden"
        style={{ paddingTop: '6rem', paddingBottom: '6rem' }}
      >
        {/* Background subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle,#e1fe52 1px,transparent 1px)', backgroundSize: '40px 40px' }}
        />

        {/* Glow top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(225,254,82,0.06) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8">

          {/* Header */}
          <div className="mb-14 md:mb-20">
            <p className="font-mono-custom text-[10px] uppercase tracking-[0.35em] text-aira-lime/60 mb-3">
              MOMENTOS AIRA · 2026
            </p>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <h2 className="font-display text-5xl md:text-7xl text-white leading-none">
                LA<br className="md:hidden"/> EXPERIENCIA
              </h2>
              <p className="text-white/40 text-sm max-w-sm leading-relaxed md:text-right">
                Tres días en el embalse de Guatapé. Cuatro escenarios. Un solo festival que combina música electrónica, naturaleza y comunidad como ningún otro en Colombia.
              </p>
            </div>
          </div>

          {/* Zone grid — asymmetric layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

            {/* ZONE 1 — Floating Stage — large hero card */}
            <ZoneCard
              zone={ZONES[0]}
              hovered={hovered}
              onHover={setHovered}
              onOpen={setActiveZone}
              className="md:col-span-7 md:row-span-2"
              imgHeight="h-72 md:h-[480px]"
              titleSize="text-4xl md:text-5xl"
            />

            {/* ZONE 2 — Majestic Yacht */}
            <ZoneCard
              zone={ZONES[1]}
              hovered={hovered}
              onHover={setHovered}
              onOpen={setActiveZone}
              className="md:col-span-5"
              imgHeight="h-52 md:h-56"
              titleSize="text-3xl"
            />

            {/* ZONE 3 — Beach Stage */}
            <ZoneCard
              zone={ZONES[2]}
              hovered={hovered}
              onHover={setHovered}
              onOpen={setActiveZone}
              className="md:col-span-5"
              imgHeight="h-52 md:h-56"
              titleSize="text-3xl"
            />

            {/* ZONE 4 — Lobby Stage */}
            <ZoneCard
              zone={ZONES[3]}
              hovered={hovered}
              onHover={setHovered}
              onOpen={setActiveZone}
              className="md:col-span-4"
              imgHeight="h-52 md:h-64"
              titleSize="text-2xl md:text-3xl"
            />

            {/* ZONE 5 — Cabañas — wide banner */}
            <ZoneCard
              zone={ZONES[4]}
              hovered={hovered}
              onHover={setHovered}
              onOpen={setActiveZone}
              className="md:col-span-8"
              imgHeight="h-52 md:h-64"
              titleSize="text-3xl md:text-4xl"
              horizontal
            />

          </div>

          {/* Bottom CTA */}
          <div className="mt-14 text-center">
            <p className="text-white/30 text-xs uppercase tracking-[0.3em] font-mono-custom mb-2">
              15 · 16 · 17 AGOSTO 2026 · EMBALSE DE GUATAPÉ, COLOMBIA
            </p>
            <p className="text-white/50 text-sm mt-1">
              Haz clic en cada zona para conocer todos los detalles
            </p>
          </div>
        </div>
      </section>

      {/* Modal */}
      {activeZone && (
        <ZoneModal zone={activeZone} onClose={() => setActiveZone(null)} />
      )}
    </>
  );
};

interface ZoneCardProps {
  zone: Zone;
  hovered: number | null;
  onHover: (id: number | null) => void;
  onOpen: (zone: Zone) => void;
  className?: string;
  imgHeight?: string;
  titleSize?: string;
  horizontal?: boolean;
}

const ZoneCard = ({ zone, hovered, onHover, onOpen, className = '', imgHeight = 'h-56', titleSize = 'text-3xl', horizontal = false }: ZoneCardProps) => {
  const isHov = hovered === zone.id;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl cursor-pointer group transition-all duration-300 ${className}`}
      style={{
        border: `1px solid ${isHov ? zone.accent + '40' : 'rgba(255,255,255,0.07)'}`,
        transform: isHov ? 'translateY(-2px)' : 'none',
        boxShadow: isHov ? `0 0 40px ${zone.accent}18` : 'none',
      }}
      onClick={() => onOpen(zone)}
      onMouseEnter={() => onHover(zone.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Image */}
      <div className={`relative overflow-hidden ${horizontal ? 'absolute inset-0' : imgHeight}`}>
        <img
          src={zone.images[0]}
          alt={zone.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div
          className="absolute inset-0"
          style={{
            background: horizontal
              ? 'linear-gradient(to right, rgba(3,6,18,0.95) 0%, rgba(3,6,18,0.7) 50%, rgba(3,6,18,0.2) 100%)'
              : 'linear-gradient(to top, rgba(3,6,18,0.97) 0%, rgba(3,6,18,0.5) 50%, rgba(3,6,18,0.1) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className={`relative z-10 p-5 md:p-6 ${horizontal ? 'md:max-w-[55%]' : ''}`}
        style={horizontal ? { position: 'relative' } : {}}>

        {/* Badge + tag */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="font-mono-custom text-[9px] uppercase tracking-[0.28em]"
            style={{ color: zone.accent + 'aa' }}
          >
            {zone.tag}
          </span>
          {zone.badge && (
            <span
              className="px-2 py-0.5 rounded-full font-mono-custom text-[8px] uppercase tracking-[0.2em]"
              style={{ background: zone.accent + '20', color: zone.accent, border: `1px solid ${zone.accent}40` }}
            >
              {zone.badge}
            </span>
          )}
        </div>

        {/* Icon + title */}
        <div className="flex items-start gap-2 mb-2">
          <span style={{ color: zone.accent, marginTop: 4 }}>{zone.icon}</span>
          <h3 className={`font-display ${titleSize} text-white leading-none`}>{zone.title}</h3>
        </div>

        <p className="text-white/50 text-xs mb-3">{zone.subtitle}</p>

        {/* Description — truncated */}
        <p className="text-white/55 text-sm leading-relaxed line-clamp-2 mb-4">
          {zone.description}
        </p>

        {/* Highlights pills — show 2 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {zone.highlights.slice(0, 2).map((h, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div
          className="flex items-center gap-1.5 text-xs font-medium transition-all duration-200"
          style={{ color: isHov ? zone.accent : 'rgba(255,255,255,0.3)' }}
        >
          Descubrir zona
          <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
};

export default Experience;
