import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { LocateFixed, ChevronLeft, ChevronRight, Navigation } from 'lucide-react';

/**
 * Mapa 3D del venue — Opción A: plano inclinado con textura satelital
 * (la foto ya trae la perspectiva oblicua "horneada") + pines 3D flotantes.
 * Liviano: sin datos de elevación externos, sin llamadas a APIs de mapas.
 *
 * A pantalla completa. La navegación entre puntos es un selector tipo
 * carrusel (nombre grande + flechas, o swipe horizontal) — no hay lista.
 */

interface MapPoint {
  id: string;
  label: string;
  emoji: string;
  x: number; // -1..1 sobre el plano
  z: number; // -1..1 sobre el plano
  color: string;
  isMine?: boolean; // resalta la cabaña del asistente actual
  kind?: 'cabana' | 'landmark' | 'balloon'; // cambia el tipo de marcador 3D
}

// Puntos generales del venue — coordenadas aproximadas, pendientes de
// ubicar con /map-editor.html igual que se hizo con las cabañas.
const LANDMARKS: MapPoint[] = [
  { id: 'entrada',   label: 'Entrada',   emoji: '🚪', x: 0.75,  z: -0.21, color: '#38bdf8', kind: 'landmark' },
  { id: 'escenario', label: 'Escenario', emoji: '🎈', x: -0.05, z: -0.10, color: '#a855f7', kind: 'balloon' },
  { id: 'vip',       label: 'Zona VIP',  emoji: '👑', x: 0.26,  z: 0.16,  color: '#facc15', kind: 'landmark' },
];

// Las 19 cabañas reales del venue — ubicadas con /map-editor.html
// sobre venue-map.jpg. La cabaña asignada a cada asistente (isMine)
// se decide dinámicamente cuando se conecte al backend (orders.cabana_id).
const CABANAS: MapPoint[] = [
  { id: 'cabana-1',  label: 'Cabaña 1',  emoji: '🏠', x: 0.220,  z: -0.889, color: '#22c55e' },
  { id: 'cabana-2',  label: 'Cabaña 2',  emoji: '🏠', x: 0.361,  z: -0.736, color: '#22c55e' },
  { id: 'cabana-3',  label: 'Cabaña 3',  emoji: '🏠', x: 0.442,  z: -0.614, color: '#22c55e' },
  { id: 'cabana-4',  label: 'Cabaña 4',  emoji: '🏠', x: 0.533,  z: -0.487, color: '#22c55e' },
  { id: 'cabana-5',  label: 'Cabaña 5',  emoji: '🏠', x: 0.596,  z: -0.327, color: '#22c55e' },
  { id: 'cabana-6',  label: 'Cabaña 6',  emoji: '🏠', x: 0.661,  z: -0.159, color: '#22c55e' },
  { id: 'cabana-7',  label: 'Cabaña 7',  emoji: '🏠', x: 0.740,  z: 0.025,  color: '#22c55e' },
  { id: 'cabana-8',  label: 'Cabaña 8',  emoji: '🏠', x: 0.783,  z: 0.264,  color: '#22c55e' },
  { id: 'cabana-9',  label: 'Cabaña 9',  emoji: '🏠', x: 0.742,  z: 0.482,  color: '#22c55e' },
  { id: 'cabana-10', label: 'Cabaña 10', emoji: '🏠', x: 0.555,  z: 0.573,  color: '#22c55e' },
  { id: 'cabana-11', label: 'Cabaña 11', emoji: '🏠', x: 0.198,  z: 0.451,  color: '#22c55e' },
  { id: 'cabana-12', label: 'Cabaña 12', emoji: '🏠', x: 0.018,  z: 0.494,  color: '#22c55e' },
  { id: 'cabana-13', label: 'Cabaña 13', emoji: '🏠', x: -0.156, z: 0.525,  color: '#22c55e' },
  { id: 'cabana-14', label: 'Cabaña 14', emoji: '🏠', x: -0.339, z: 0.518,  color: '#22c55e' },
  { id: 'cabana-15', label: 'Cabaña 15', emoji: '🏠', x: -0.506, z: 0.446,  color: '#22c55e' },
  { id: 'cabana-16', label: 'Cabaña 16', emoji: '🏠', x: -0.645, z: 0.379,  color: '#22c55e' },
  { id: 'cabana-17', label: 'Cabaña 17', emoji: '🏠', x: -0.776, z: 0.281,  color: '#22c55e' },
  { id: 'cabana-19', label: 'Cabaña 19', emoji: '🏠', x: -0.831, z: 0.628,  color: '#22c55e' },
  { id: 'cabana-20', label: 'Cabaña 20', emoji: '🏠', x: -0.716, z: 0.714,  color: '#22c55e' },
];

const BASE_POINTS: MapPoint[] = [
  ...LANDMARKS,
  ...CABANAS.map(p => ({ ...p, kind: 'cabana' as const })),
];

/**
 * Marca como "isMine" la cabaña real del asistente, extrayendo el número
 * de `attendee.paquete` (ej. "Cabaña 9 - Río Arriba" -> cabana-9). Si el
 * paquete es una suite o pasadía (no hay marcador para esos todavía) o no
 * matchea ninguna cabaña, no se resalta nada — mejor que apuntar a la
 * cabaña equivocada.
 */
function buildPoints(paquete: string | null | undefined): MapPoint[] {
  const match = paquete?.match(/Caba[ñn]a\s*(\d+)/i);
  const myId = match ? `cabana-${match[1]}` : null;
  if (!myId) return BASE_POINTS;
  return BASE_POINTS.map(p => (p.id === myId ? { ...p, isMine: true } : p));
}

const PLANE_W = 6;
const PLANE_D = 4.2;

// ══ Georreferenciación (GPS → plano 3D) ═══════════════════════════════════
// No usa ninguna API de mapas — solo navigator.geolocation (nativo del
// navegador/celular, gratis) + una transformación lineal calibrada con
// 2 puntos de referencia reales (Cabaña 1 y Cabaña 20), medidos con
// Google Maps. Al ser un área chiquita (cientos de metros) no hace falta
// lidiar con la curvatura de la Tierra: alcanza con proyectar a metros
// locales (este/norte) y aplicar una rotación + escala fija.
const GPS_REF        = { lat: 6.233305555555556, lon: -75.23014444444445 }; // Cabaña 20
const GPS_REF_WORLD   = { x: (-0.716 * PLANE_W) / 2, z: (0.714 * PLANE_D) / 2 }; // su posición en el plano
const GPS_K           = { a: -0.020093304378655072, b: -0.02120206483940115 }; // escala+rotación (unidades del plano / metro)
const METERS_PER_DEG_LAT = 111320;

/** Convierte lat/lon reales a coordenadas del plano 3D (mismo sistema que los pines) */
function latLonToWorld(lat: number, lon: number): { x: number; z: number } {
  const north = (lat - GPS_REF.lat) * METERS_PER_DEG_LAT;
  const east  = (lon - GPS_REF.lon) * METERS_PER_DEG_LAT * Math.cos((GPS_REF.lat * Math.PI) / 180);
  const dx = GPS_K.a * east - GPS_K.b * north;
  const dz = GPS_K.b * east + GPS_K.a * north;
  return { x: GPS_REF_WORLD.x + dx, z: GPS_REF_WORLD.z + dz };
}

/** Radio de precisión del GPS (metros) → unidades del plano */
function metersToWorld(m: number): number {
  return m * Math.hypot(GPS_K.a, GPS_K.b);
}

const METERS_PER_WORLD_UNIT = 1 / Math.hypot(GPS_K.a, GPS_K.b);

/** Distancia real (línea recta) entre dos puntos del plano, en metros */
function worldDistanceMeters(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz) * METERS_PER_WORLD_UNIT;
}

interface GeoState {
  supported: boolean;
  status: 'idle' | 'locating' | 'active' | 'denied' | 'error';
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
}

/** Hook de geolocalización — API nativa del navegador, sin costo ni API key */
function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    supported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    status: 'idle',
    lat: null,
    lon: null,
    accuracy: null,
  });
  const watchIdRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!state.supported) return;
    setState(s => ({ ...s, status: 'locating' }));
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          supported: true,
          status: 'active',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setState(s => ({ ...s, status: err.code === err.PERMISSION_DENIED ? 'denied' : 'error' }));
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 }
    );
  }, [state.supported]);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setState(s => ({ ...s, status: 'idle' }));
  }, []);

  useEffect(() => () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); }, []);

  return { ...state, start, stop };
}

function Terrain({ image }: { image: string }) {
  const texture = useLoader(THREE.TextureLoader, image);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[PLANE_W, PLANE_D]} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  );
}

interface MarkerProps { point: MapPoint; index: number; onSelect: (i: number) => void; selected: boolean; }

// Altura/grosor del haz según el tipo de punto — el escenario se ve más
// alto e imponente, las cabañas más discretas, entrada/VIP intermedio.
const BEACON_PRESET: Record<NonNullable<MapPoint['kind']>, { height: number; radius: number; orbSize: number }> = {
  cabana:   { height: 0.16, radius: 0.0028, orbSize: 0.011 },
  landmark: { height: 0.24, radius: 0.0034, orbSize: 0.014 },
  balloon:  { height: 0.42, radius: 0.0045, orbSize: 0.02 },
};

/**
 * Baliza láser — un haz de luz delgado que sube desde el suelo con un
 * orbe brillante en la punta. Mismo lenguaje visual para cabañas,
 * entrada/VIP y el escenario; solo cambian alto/grosor/brillo según
 * el tipo y si está seleccionado o es "la mía".
 */
function BeaconMarker({ point, index, onSelect, selected }: MarkerProps) {
  const beamRef = useRef<THREE.Mesh>(null);
  const orbRef  = useRef<THREE.Mesh>(null);
  const px = (point.x * PLANE_W) / 2;
  const pz = (point.z * PLANE_D) / 2;
  const preset = BEACON_PRESET[point.kind ?? 'landmark'];
  const emphasis = selected || point.isMine;
  const scaleMul = emphasis ? 1.3 : 1;
  const height = preset.height * scaleMul;
  const color = point.color;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (orbRef.current) {
      orbRef.current.position.y = height + Math.sin(t * 2 + px) * 0.008;
    }
    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (emphasis ? 0.55 : 0.32) + Math.sin(t * 2.4 + pz) * 0.06;
    }
  });

  return (
    <group position={[px, 0, pz]} onClick={(e) => { e.stopPropagation(); onSelect(index); }}>
      {/* halo en el suelo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[preset.orbSize * 1.6 * scaleMul, 24]} />
        <meshBasicMaterial color={color} transparent opacity={emphasis ? 0.35 : 0.18} />
      </mesh>
      {emphasis && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <ringGeometry args={[preset.orbSize * 1.7 * scaleMul, preset.orbSize * 2.1 * scaleMul, 28]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} />
        </mesh>
      )}

      {/* haz vertical */}
      <mesh ref={beamRef} position={[0, height / 2, 0]}>
        <cylinderGeometry args={[preset.radius * 0.4 * scaleMul, preset.radius * scaleMul, height, 10, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* orbe brillante en la punta */}
      <mesh ref={orbRef} position={[0, height, 0]}>
        <sphereGeometry args={[preset.orbSize * scaleMul, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emphasis ? 1.4 : 0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}

const MARKERS: Record<NonNullable<MapPoint['kind']>, typeof BeaconMarker> = {
  cabana: BeaconMarker,
  landmark: BeaconMarker,
  balloon: BeaconMarker,
};

/**
 * Guía de ruta — línea recta punteada del usuario al punto seleccionado.
 * Es orientación "línea de aire" (dirección + distancia real), no una
 * ruta peatonal trazada sobre los caminos reales del venue.
 */
function GuideLine({ from, to, color }: { from: [number, number]; to: [number, number]; color: string }) {
  const points = useMemo<[number, number, number][]>(() => [
    [from[0], 0.018, from[1]],
    [to[0], 0.018, to[1]],
  ], [from, to]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      dashed
      dashScale={12}
      dashSize={1}
      gapSize={0.6}
      transparent
      opacity={0.85}
    />
  );
}

function Scene({ image, points, selectedIdx, onSelect, geo }: {
  image: string;
  points: MapPoint[];
  selectedIdx: number;
  onSelect: (i: number) => void;
  geo: GeoState;
}) {
  const selected = points[selectedIdx];
  const targetWorld: [number, number] = [(selected.x * PLANE_W) / 2, (selected.z * PLANE_D) / 2];
  const hasGeo = geo.status === 'active' && geo.lat !== null && geo.lon !== null;
  const userWorld = hasGeo ? latLonToWorld(geo.lat!, geo.lon!) : null;

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 2]} intensity={1.1} />
      <Suspense fallback={null}>
        <Terrain image={image} />
      </Suspense>
      {points.map((p, i) => {
        const MarkerComp = MARKERS[p.kind ?? 'landmark'];
        return <MarkerComp key={p.id} point={p} index={i} selected={selectedIdx === i} onSelect={onSelect} />;
      })}
      {hasGeo && (
        <>
          <UserLocationMarker lat={geo.lat!} lon={geo.lon!} accuracy={geo.accuracy} />
          <GuideLine from={[userWorld!.x, userWorld!.z]} to={targetWorld} color={selected.color} />
        </>
      )}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={1.6}
        maxDistance={8.5}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.35}
        target={[0, 0, 0]}
      />
    </>
  );
}

/** Punto "estás aquí" — se posiciona con GPS real, sin ninguna API de mapas */
function UserLocationMarker({ lat, lon, accuracy }: { lat: number; lon: number; accuracy: number | null }) {
  const dotRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const { worldX, worldZ, offMap } = useMemo(() => {
    const { x, z } = latLonToWorld(lat, lon);
    const halfW = PLANE_W / 2;
    const halfD = PLANE_D / 2;
    const outside = Math.abs(x) > halfW || Math.abs(z) > halfD;
    // Si está fuera del área mapeada, lo dejamos pegado al borde más cercano
    // en vez de desaparecer — sigue indicando la dirección aproximada.
    const cx = Math.max(-halfW * 0.96, Math.min(halfW * 0.96, x));
    const cz = Math.max(-halfD * 0.96, Math.min(halfD * 0.96, z));
    return { worldX: cx, worldZ: cz, offMap: outside };
  }, [lat, lon]);

  const accuracyRadius = accuracy ? Math.max(0.05, Math.min(0.6, metersToWorld(accuracy))) : 0.08;

  useFrame(({ clock }) => {
    if (dotRef.current) dotRef.current.position.y = 0.06 + Math.sin(clock.getElapsedTime() * 2.4) * 0.006;
    if (ringRef.current) {
      const t = (clock.getElapsedTime() % 1.6) / 1.6;
      ringRef.current.scale.setScalar(0.4 + t * 1.4);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
    }
  });

  return (
    <group position={[worldX, 0, worldZ]}>
      {/* círculo de precisión GPS */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[accuracyRadius, 32]} />
        <meshBasicMaterial color="#4285F4" transparent opacity={0.14} />
      </mesh>
      {/* onda expansiva en loop */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.013, 0]}>
        <ringGeometry args={[0.05, 0.062, 24]} />
        <meshBasicMaterial color="#4285F4" transparent opacity={0.4} />
      </mesh>
      {/* punto azul */}
      <group ref={dotRef}>
        <mesh>
          <sphereGeometry args={[0.045, 20, 20]} />
          <meshStandardMaterial color="#4285F4" emissive="#4285F4" emissiveIntensity={0.6} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.052, 20, 20]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.BackSide} />
        </mesh>
      </group>
      {offMap && (
        <mesh position={[0, 0.09, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.035, 0.05, 3]} />
          <meshBasicMaterial color="#4285F4" />
        </mesh>
      )}
    </group>
  );
}

export default function MyAppMap({ image = '/venue-map.jpg', attendee }: { image?: string; attendee?: { paquete: string | null } | null }) {
  const points = useMemo(() => buildPoints(attendee?.paquete), [attendee?.paquete]);
  const [selectedIdx, setSelectedIdx] = useState<number>(() => {
    const i = points.findIndex(p => p.isMine);
    return i >= 0 ? i : 0;
  });
  const geo = useGeolocation();
  const selected = points[selectedIdx];
  const swipeRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

  const initialCamPos = useMemo<[number, number, number]>(() => [0, 2.1, 2.3], []);

  const toggleLocate = () => {
    if (geo.status === 'active' || geo.status === 'locating') geo.stop();
    else geo.start();
  };

  const goPrev = () => setSelectedIdx(i => (i - 1 + points.length) % points.length);
  const goNext = () => setSelectedIdx(i => (i + 1) % points.length);

  // Swipe horizontal sobre el mapa — igual de intuitivo que las flechas
  const onPointerDown = (e: React.PointerEvent) => {
    swipeRef.current = { x: e.clientX, y: e.clientY, active: true };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = swipeRef.current;
    if (!s?.active) return;
    const dx = e.clientX - s.x;
    const dy = Math.abs(e.clientY - s.y);
    if (Math.abs(dx) > 70 && dy < 50) {
      s.active = false;
      dx < 0 ? goNext() : goPrev();
    }
  };

  return (
    <div className="mapa-panel">
      <div
        className="mapa-canvas-wrap"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <Canvas
          camera={{ position: initialCamPos, fov: 42 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene image={image} points={points} selectedIdx={selectedIdx} onSelect={setSelectedIdx} geo={geo} />
        </Canvas>

        {geo.supported && (
          <button
            className={`mapa-locate-btn ${geo.status === 'active' ? 'is-active' : ''} ${geo.status === 'locating' ? 'is-locating' : ''}`}
            onClick={toggleLocate}
            aria-label="Ubícame"
          >
            <LocateFixed size={18} />
          </button>
        )}

        {geo.status === 'denied' && (
          <div className="mapa-geo-msg">
            Activa el permiso de ubicación en tu navegador para verte en el mapa.
          </div>
        )}
        {geo.status === 'error' && (
          <div className="mapa-geo-msg">No pudimos obtener tu ubicación. Intenta de nuevo.</div>
        )}

        {/* Selector inferior — reemplaza la lista: nombre grande + flechas / swipe */}
        <div className="mapa-selector" style={{ ['--pin-color' as any]: selected.color }}>
          <button className="mapa-nav-arrow" onClick={goPrev} aria-label="Punto anterior">
            <ChevronLeft size={20} />
          </button>
          <div className="mapa-selector-label">
            <span className="mapa-selector-tag">{selected.isMine ? 'Tu cabaña' : selected.kind === 'cabana' ? 'Cabaña' : 'Punto de interés'}</span>
            <span key={selected.id} className="mapa-selector-name">{selected.emoji} {selected.label}</span>
            {geo.status === 'active' && geo.lat !== null && geo.lon !== null && (() => {
              const user = latLonToWorld(geo.lat, geo.lon);
              const target = { x: (selected.x * PLANE_W) / 2, z: (selected.z * PLANE_D) / 2 };
              const meters = worldDistanceMeters(user.x, user.z, target.x, target.z);
              return (
                <span className="mapa-selector-distance">
                  <Navigation size={11} /> {meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`}
                </span>
              );
            })()}
          </div>
          <button className="mapa-nav-arrow" onClick={goNext} aria-label="Punto siguiente">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
