import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { LocateFixed, ChevronLeft, ChevronRight, Navigation } from 'lucide-react';

/**
 * Mapa 3D del venue — Opción A: plano inclinado con textura satelital
 * (venue-map.jpg) + pines 3D para cabañas y puntos de interés.
 */

interface MapPoint {
  id: string;
  label: string;
  emoji: string;
  x: number; // -1..1 relativo al plano
  z: number; // -1..1 relativo al plano
  color: string;
  isMine?: boolean;
  kind?: 'cabana' | 'landmark' | 'balloon'; // cambia el tipo de marcador 3D
}

// Puntos generales del venue — los 3 escenarios ya son coordenadas reales
// (map-editor.html); entrada y VIP siguen aproximados, pendientes de ubicar.
const LANDMARKS: MapPoint[] = [
  { id: 'entrada',     label: 'Entrada',     emoji: '🚪', x: 0.75,   z: -0.21,  color: '#38bdf8', kind: 'landmark' },
  { id: 'vip',         label: 'Zona VIP',    emoji: '👑', x: 0.26,   z: 0.16,   color: '#facc15', kind: 'landmark' },
  { id: 'japi-stage',  label: 'Japi Stage',  emoji: '🎈', x: -0.156, z: 0.053,  color: '#22c55e', kind: 'balloon' },
  { id: 'aira-stage',  label: 'AIRA Stage',  emoji: '🎈', x: 0.040,  z: 0.268,  color: '#ef4444', kind: 'balloon' },
  { id: 'joinn-stage', label: 'Joinn Stage', emoji: '🎈', x: 0.268,  z: 0.743,  color: '#ec4899', kind: 'balloon' },
];

// ── Caminos reales (vías peatonales) ────────────────────────────────────
// Trazados a mano con /map-editor.html (modo "Caminos"), punto por punto
// sobre venue-map.jpg. Es un solo sendero maestro que recorre el venue —
// la guía busca el punto más cercano a tu ubicación y al destino dentro
// de este mismo camino, y traza el tramo entre esos dos puntos (en vez
// de adivinar cómo conectar varios caminos sueltos entre sí). Se había
// perdido en un deploy paralelo — restaurado tal cual estaba.
interface PathSegment { id: string; name: string; points: { x: number; z: number }[]; }

const PATHS: PathSegment[] = [
  { id: 'completo-bxth', name: 'Completo', points: [
    { x: 0.387, z: 0.825 }, { x: 0.346, z: 0.765 }, { x: 0.282, z: 0.784 }, { x: 0.266, z: 0.746 },
    { x: 0.257, z: 0.711 }, { x: 0.234, z: 0.692 }, { x: 0.215, z: 0.679 }, { x: 0.184, z: 0.667 },
    { x: 0.195, z: 0.648 }, { x: 0.236, z: 0.626 }, { x: 0.263, z: 0.6 },   { x: 0.302, z: 0.581 },
    { x: 0.325, z: 0.556 }, { x: 0.361, z: 0.512 }, { x: 0.393, z: 0.471 }, { x: 0.407, z: 0.315 },
    { x: 0.401, z: 0.41 },  { x: 0.401, z: 0.239 }, { x: 0.389, z: 0.16 },  { x: 0.375, z: 0.113 },
    { x: 0.377, z: 0.059 }, { x: 0.369, z: -0.036 },{ x: 0.362, z: -0.074 },{ x: 0.316, z: -0.175 },
    { x: 0.272, z: -0.261 },{ x: 0.289, z: -0.229 },{ x: 0.247, z: -0.324 },{ x: 0.206, z: -0.378 },
    { x: 0.222, z: -0.362 },{ x: 0.168, z: 0.638 }, { x: 0.15, z: 0.619 },  { x: 0.175, z: 0.6 },
    { x: 0.216, z: 0.553 }, { x: 0.122, z: 0.616 }, { x: 0.104, z: 0.597 }, { x: 0.093, z: 0.572 },
    { x: 0.117, z: 0.524 }, { x: 0.138, z: 0.502 }, { x: 0.158, z: 0.477 }, { x: 0.179, z: 0.42 },
    { x: 0.177, z: 0.379 }, { x: 0.168, z: 0.366 }, { x: 0.181, z: 0.284 }, { x: 0.211, z: 0.119 },
    { x: 0.19, z: 0.217 },  { x: 0.225, z: 0.062 }, { x: 0.211, z: -0.09 },{ x: 0.184, z: -0.163 },
    { x: 0.161, z: -0.229 },{ x: 0.14, z: -0.292 }, { x: 0.236, z: -0.017 },{ x: 0.168, z: 0.252 },
    { x: 0.136, z: 0.227 }, { x: 0.108, z: 0.192 }, { x: 0.086, z: 0.167 }, { x: 0.065, z: 0.141 },
    { x: 0.045, z: 0.103 }, { x: 0.029, z: 0.084 }, { x: 0.003, z: 0.078 },{ x: -0.02, z: 0.072 },
    { x: -0.033, z: 0.043 },{ x: -0.053, z: 0.04 }, { x: 0.067, z: 0.179 },{ x: 0.058, z: 0.23 },
    { x: 0.035, z: 0.265 }, { x: 0.029, z: 0.29 },  { x: 0.131, z: 0.379 },{ x: 0.067, z: 0.398 },
    { x: 0.036, z: 0.41 },  { x: -0.01, z: 0.426 }, { x: -0.065, z: 0.401 },{ x: -0.122, z: 0.401 },
    { x: -0.159, z: 0.395 },{ x: -0.199, z: 0.385 },{ x: -0.245, z: 0.369 },{ x: -0.291, z: 0.353 },
    { x: -0.337, z: 0.331 },{ x: -0.385, z: 0.296 },{ x: -0.426, z: 0.249 },{ x: -0.482, z: 0.224 },
    { x: -0.521, z: 0.179 },{ x: -0.564, z: 0.135 },{ x: -0.59, z: 0.075 },{ x: -0.624, z: 0.072 },
    { x: -0.651, z: 0.091 },{ x: -0.67, z: 0.145 }, { x: -0.67, z: 0.205 },{ x: -0.654, z: 0.262 },
    { x: -0.638, z: 0.284 },{ x: -0.612, z: 0.306 },{ x: -0.587, z: 0.35 },{ x: -0.556, z: 0.369 },
  ] },
];

/**
 * Busca, dentro del camino trazado, el punto más cercano al origen y al
 * destino (coordenadas normalizadas -1..1, igual que MapPoint), y
 * devuelve el tramo del camino entre esos dos índices — en el orden
 * correcto para ir de origen a destino. Si el camino está vacío/muy
 * corto o el origen y destino caen en el mismo punto, devuelve null (el
 * caller cae de vuelta a la línea recta).
 */
function findRouteOnPath(
  fromXZ: { x: number; z: number },
  toXZ: { x: number; z: number }
): { x: number; z: number }[] | null {
  const path = PATHS[0];
  if (!path || path.points.length < 2) return null;

  let fromIdx = 0, toIdx = 0, fromBest = Infinity, toBest = Infinity;
  path.points.forEach((p, i) => {
    const df = Math.hypot(p.x - fromXZ.x, p.z - fromXZ.z);
    const dt = Math.hypot(p.x - toXZ.x, p.z - toXZ.z);
    if (df < fromBest) { fromBest = df; fromIdx = i; }
    if (dt < toBest)   { toBest = dt; toIdx = i; }
  });
  if (fromIdx === toIdx) return null;

  const slice = fromIdx < toIdx
    ? path.points.slice(fromIdx, toIdx + 1)
    : path.points.slice(toIdx, fromIdx + 1).reverse();

  // Sanity check — el sendero es UN solo trazo continuo, así que el
  // tramo entre dos índices puede terminar dando un rodeo enorme por
  // zonas de cabañas que no hacen falta (ej. para llegar a un escenario
  // que el trazo "visita" tarde en el recorrido). Si el tramo resultante
  // es mucho más largo que la línea recta real entre origen y destino,
  // es una señal de que ese tramo no sirve como ruta — se descarta y el
  // caller cae de vuelta a la flecha directa en vez de mostrar un rodeo
  // que confunde más de lo que ayuda.
  let routeLength = 0;
  for (let i = 1; i < slice.length; i++) {
    routeLength += Math.hypot(slice[i].x - slice[i - 1].x, slice[i].z - slice[i - 1].z);
  }
  const straightLength = Math.hypot(toXZ.x - fromXZ.x, toXZ.z - fromXZ.z);
  if (straightLength > 0 && routeLength > straightLength * 2.2) return null;

  return slice;
}

// Las 19 cabañas reales del venue — ubicadas con /map-editor.html sobre
// venue-map.jpg (coordenadas reales, digitalizadas a mano, no un grid
// aproximado). El id `cabana-N` es lo que usa buildPoints() para
// resaltar la cabaña real de cada asistente según su `paquete` — no
// cambiar ese patrón de id.
const CABANAS: MapPoint[] = [
  { id: 'cabana-1',  label: 'Cabaña 1 - La Roca',              emoji: '🏠', x: 0.211,  z: -0.333, color: '#38bdf8', kind: 'cabana' },
  { id: 'cabana-2',  label: 'Cabaña 2 - El Mirador',           emoji: '🏠', x: 0.261,  z: -0.245, color: '#a855f7', kind: 'cabana' },
  { id: 'cabana-3',  label: 'Cabaña 3 - Aguas Vivas',          emoji: '🏠', x: 0.305,  z: -0.159, color: '#facc15', kind: 'cabana' },
  { id: 'cabana-4',  label: 'Cabaña 4 - La Cumbre',            emoji: '🏠', x: 0.343,  z: -0.052, color: '#22c55e', kind: 'cabana' },
  { id: 'cabana-5',  label: 'Cabaña 5 - Deluxe',               emoji: '🏠', x: 0.362,  z: 0.164,  color: '#ef4444', kind: 'cabana' },
  { id: 'cabana-6',  label: 'Cabaña 6 - Beatlink',             emoji: '🏠', x: 0.375,  z: 0.268,  color: '#ec4899', kind: 'cabana' },
  { id: 'cabana-7',  label: 'Cabaña 7 - Selva Adentro',        emoji: '🏠', x: 0.369,  z: 0.404,  color: '#f97316', kind: 'cabana' },
  { id: 'cabana-8',  label: 'Cabaña 8 - La Fogata',            emoji: '🏠', x: 0.307,  z: 0.512,  color: '#10b981', kind: 'cabana' },
  { id: 'cabana-9',  label: 'Cabaña 9 - Río Arriba',           emoji: '🏠', x: -0.539, z: 0.088,  color: '#38bdf8', kind: 'cabana' },
  { id: 'cabana-10', label: 'Cabaña 10 - Aïra',                emoji: '🏠', x: -0.003, z: 0.401,  color: '#a855f7', kind: 'cabana' },
  { id: 'cabana-11', label: 'Cabaña 11 - Punta Sur',           emoji: '🏠', x: -0.115, z: 0.382,  color: '#facc15', kind: 'cabana' },
  { id: 'cabana-12', label: 'Cabaña 12 - La Terraza',          emoji: '🏠', x: -0.222, z: 0.353,  color: '#22c55e', kind: 'cabana' },
  { id: 'cabana-13', label: 'Cabaña 13 - Viento Sur',          emoji: '🏠', x: -0.328, z: 0.312,  color: '#ef4444', kind: 'cabana' },
  { id: 'cabana-14', label: 'Cabaña 14 - Casa Volcán',         emoji: '🏠', x: -0.416, z: 0.233,  color: '#ec4899', kind: 'cabana' },
  { id: 'cabana-15', label: 'Cabaña 15 - El Faro Individual',  emoji: '👑', x: -0.613, z: 0.255,  color: '#f97316', kind: 'cabana' },
  { id: 'cabana-16', label: 'Cabaña 16 - La Bahía',            emoji: '👑', x: -0.597, z: 0.268,  color: '#10b981', kind: 'cabana' },
  { id: 'cabana-17', label: 'Cabaña 17 - Monte Alto',          emoji: '👑', x: -0.558, z: 0.315,  color: '#38bdf8', kind: 'cabana' },
  { id: 'cabana-18', label: 'Cabaña 18 - Casa Piedra',         emoji: '👑', x: -0.539, z: 0.334,  color: '#a855f7', kind: 'cabana' },
  { id: 'cabana-19', label: 'Cabaña 19 - El Retiro',           emoji: '👑', x: 0.197,  z: 0.534,  color: '#facc15', kind: 'cabana' },
];

const BASE_POINTS: MapPoint[] = [...CABANAS, ...LANDMARKS];

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
      <meshStandardMaterial map={texture} />
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
 * orbe brillante en la punta. Se usa para cabañas y entrada/VIP; los
 * 3 escenarios reales tienen cada uno su propio marcador (ver abajo).
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

// Antes en 0.55 (y luego 0.2) seguían quedando muy altos — se bajan a
// un nivel realmente pegado al suelo, cerca del halo que ya dibujan en
// el terreno, para que se vean "parados" sobre el mapa, no flotando.
const STAGE_FLOAT_HEIGHT = 0.08;

/** Halo base compartido por los 3 marcadores de escenario — mismo lenguaje visual que BeaconMarker */
function StageGroundHalo({ color, selected, radius = 0.05 }: { color: string; selected: boolean; radius?: number }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[radius, 28]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.4 : 0.22} />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <ringGeometry args={[radius * 1.05, radius * 1.3, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} />
        </mesh>
      )}
    </>
  );
}

/**
 * Japi Stage — globo aerostático bicolor (cuerpo azul + casquete morado),
 * flotando alto sobre el venue y girando 360° sin parar (además del
 * balanceo suave) para que se note claramente desde cualquier ángulo.
 */
function BalloonStageMarker({ point, index, onSelect, selected }: MarkerProps) {
  const spinRef = useRef<THREE.Group>(null);
  const floatRef = useRef<THREE.Group>(null);
  const px = (point.x * PLANE_W) / 2;
  const pz = (point.z * PLANE_D) / 2;
  const scale = (selected ? 1.2 : 1) * 4.4;
  const BODY_COLOR = '#38bdf8'; // azul
  const CAP_COLOR  = '#7c3aed'; // morado

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (floatRef.current) floatRef.current.position.y = STAGE_FLOAT_HEIGHT + Math.sin(t * 0.9) * 0.012;
    if (spinRef.current) spinRef.current.rotation.y = t * 0.9; // giro 360 continuo
  });

  return (
    <group position={[px, 0, pz]} onClick={(e) => { e.stopPropagation(); onSelect(index); }}>
      <StageGroundHalo color={point.color} selected={selected} radius={0.055} />

      <group ref={floatRef}>
        <group ref={spinRef} scale={scale}>
          {/* globo — esfera alargada en dos tonos: cuerpo azul + casquete morado */}
          <mesh position={[0, 0.05, 0]} scale={[1, 1.25, 1]}>
            <sphereGeometry args={[0.024, 20, 20]} />
            <meshStandardMaterial color={BODY_COLOR} emissive={BODY_COLOR} emissiveIntensity={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.05, 0]} scale={[1.03, 1.28, 1.03]}>
            <sphereGeometry args={[0.024, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
            <meshStandardMaterial color={CAP_COLOR} emissive={CAP_COLOR} emissiveIntensity={0.55} roughness={0.4} />
          </mesh>
          {/* cuello del globo */}
          <mesh position={[0, 0.023, 0]}>
            <coneGeometry args={[0.006, 0.012, 8]} />
            <meshStandardMaterial color={CAP_COLOR} />
          </mesh>
          {/* cuerdas */}
          {[[-0.012, -0.012], [0.012, -0.012], [-0.012, 0.012], [0.012, 0.012]].map(([ox, oz], i) => (
            <mesh key={i} position={[ox, 0.008, oz]}>
              <cylinderGeometry args={[0.0008, 0.0008, 0.03, 4]} />
              <meshBasicMaterial color="#e5e7eb" />
            </mesh>
          ))}
          {/* canasta */}
          <mesh position={[0, -0.008, 0]}>
            <boxGeometry args={[0.026, 0.016, 0.026]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * AIRA Stage — el logo real de AIRA en un plano flotante con halo debajo,
 * girando 360° sobre su eje Y para que se lea desde cualquier ángulo.
 */
function LogoStageMarker({ point, index, onSelect, selected }: MarkerProps) {
  const texture = useTexture('/AIRA BLANCO.png');
  const spinRef = useRef<THREE.Group>(null);
  const floatRef = useRef<THREE.Group>(null);
  const px = (point.x * PLANE_W) / 2;
  const pz = (point.z * PLANE_D) / 2;
  const scale = selected ? 1.25 : 1;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (floatRef.current) floatRef.current.position.y = STAGE_FLOAT_HEIGHT + Math.sin(t * 0.9 + 1) * 0.012;
    if (spinRef.current) spinRef.current.rotation.y = t * 0.9; // giro 360 continuo
  });

  return (
    <group position={[px, 0, pz]} onClick={(e) => { e.stopPropagation(); onSelect(index); }}>
      <StageGroundHalo color={point.color} selected={selected} radius={0.055} />

      <group ref={floatRef}>
        <group ref={spinRef} scale={scale}>
          {/* halo suave detrás del logo */}
          <mesh position={[0, 0, -0.001]}>
            <circleGeometry args={[0.075, 32]} />
            <meshBasicMaterial color={point.color} transparent opacity={0.25} />
          </mesh>
          {/* logo AIRA — visible desde ambos lados */}
          <mesh>
            <planeGeometry args={[0.13, 0.13]} />
            <meshStandardMaterial map={texture} transparent emissive="#ffffff" emissiveIntensity={0.15} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * Joinn Stage — cristal/orbe brillante con el texto 3D "JOINN" flotando
 * encima, girando 360° sobre su eje Y.
 */
function TextStageMarker({ point, index, onSelect, selected }: MarkerProps) {
  const spinRef = useRef<THREE.Group>(null);
  const floatRef = useRef<THREE.Group>(null);
  const orbRef = useRef<THREE.Mesh>(null);
  const px = (point.x * PLANE_W) / 2;
  const pz = (point.z * PLANE_D) / 2;
  const scale = selected ? 1.2 : 1;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (floatRef.current) floatRef.current.position.y = STAGE_FLOAT_HEIGHT + Math.sin(t * 0.9 + 2) * 0.012;
    if (spinRef.current) spinRef.current.rotation.y = t * 0.9; // giro 360 continuo
    if (orbRef.current) {
      const mat = orbRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.1 + Math.sin(t * 2.4) * 0.3;
    }
  });

  return (
    <group position={[px, 0, pz]} onClick={(e) => { e.stopPropagation(); onSelect(index); }}>
      <StageGroundHalo color={point.color} selected={selected} radius={0.055} />

      <group ref={floatRef}>
        <group ref={spinRef} scale={scale}>
          {/* cristal/orbe brillante */}
          <mesh ref={orbRef}>
            <icosahedronGeometry args={[0.045, 0]} />
            <meshStandardMaterial
              color={point.color}
              emissive={point.color}
              emissiveIntensity={1.1}
              roughness={0.15}
              metalness={0.3}
            />
          </mesh>
          {/* texto 3D "JOINN" flotando encima del cristal */}
          <Text
            position={[0, 0.075, 0]}
            fontSize={0.03}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.002}
            outlineColor={point.color}
          >
            JOINN
          </Text>
        </group>
      </group>
    </group>
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

// Mapeo por defecto según 'kind' (cabañas, entrada, VIP) + excepciones
// puntuales por id para los 3 escenarios reales, que ya no comparten un
// marcador genérico entre sí.
const MARKERS_BY_KIND: Record<NonNullable<MapPoint['kind']>, typeof BeaconMarker> = {
  cabana: BeaconMarker,
  landmark: BeaconMarker,
  balloon: BeaconMarker,
};

const MARKERS_BY_ID: Record<string, typeof BeaconMarker> = {
  'japi-stage': BalloonStageMarker,
  'aira-stage': LogoStageMarker,
  'joinn-stage': TextStageMarker,
};

function getMarkerComponent(point: MapPoint) {
  return MARKERS_BY_ID[point.id] ?? MARKERS_BY_KIND[point.kind ?? 'landmark'];
}

/**
 * Guía de ruta — dibuja el tramo del camino real entre el usuario y el
 * punto seleccionado (findRouteOnPath) cuando hay uno disponible; si no,
 * cae de vuelta a la línea recta punteada ("línea de aire"). Se había
 * perdido en un deploy paralelo — restaurada tal cual estaba.
 */
function GuideLine({ worldPoints, color, isRealPath }: { worldPoints: [number, number][]; color: string; isRealPath: boolean }) {
  const points = useMemo<[number, number, number][]>(
    () => worldPoints.map(([x, z]) => [x, 0.018, z]),
    [worldPoints]
  );

  return (
    <Line
      points={points}
      color={color}
      lineWidth={isRealPath ? 3 : 2}
      dashed={!isRealPath}
      dashScale={12}
      dashSize={1}
      gapSize={0.6}
      transparent
      opacity={isRealPath ? 0.95 : 0.85}
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

  // Intenta trazar el tramo real del camino entre el usuario y el punto
  // seleccionado — si no hay camino cerca de alguno de los dos, usa la
  // línea recta como respaldo.
  const routeOnPath = hasGeo
    ? findRouteOnPath({ x: (userWorld!.x * 2) / PLANE_W, z: (userWorld!.z * 2) / PLANE_D }, { x: selected.x, z: selected.z })
    : null;
  const routeWorldPoints: [number, number][] = routeOnPath
    ? routeOnPath.map(p => [(p.x * PLANE_W) / 2, (p.z * PLANE_D) / 2] as [number, number])
    : hasGeo ? [[userWorld!.x, userWorld!.z], targetWorld] : [];

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 2]} intensity={1.1} castShadow />
      <Suspense fallback={null}>
        <Terrain image={image} />
      </Suspense>
      {points.map((p, i) => {
        const MarkerComp = getMarkerComponent(p);
        return <MarkerComp key={p.id} point={p} index={i} selected={selectedIdx === i} onSelect={onSelect} />;
      })}
      {hasGeo && (
        <>
          <UserLocationMarker lat={geo.lat!} lon={geo.lon!} accuracy={geo.accuracy} />
          <GuideLine worldPoints={routeWorldPoints} color={selected.color} isRealPath={!!routeOnPath} />
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

export default function MyAppMap({ image = '/venue-map.jpg', attendee }: { image?: string; attendee?: { paquete: string | null } | null }) {
  const points = useMemo(() => buildPoints(attendee?.paquete), [attendee?.paquete]);
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const mineIdx = points.findIndex(p => p.isMine);
    return mineIdx >= 0 ? mineIdx : 0;
  });
  const selected = points[selectedIdx];
  const swipeRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

  // Al entrar al Radar se pide el permiso de ubicación de una vez —
  // antes había que tocar el botón "Ubícame" manualmente. Si el usuario
  // ya lo negó antes, el navegador simplemente no vuelve a preguntar
  // (geo.status pasa a 'denied' y se muestra el aviso de siempre).
  const geo = useGeolocation();
  useEffect(() => {
    if (geo.supported) geo.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialCamPos = useMemo<[number, number, number]>(() => [0, 2.1, 2.3], []);

  const toggleLocate = () => {
    if (geo.status === 'active' || geo.status === 'locating') geo.stop();
    else geo.start();
  };

  const goPrev = () => setSelectedIdx(i => (i - 1 + points.length) % points.length);
  const goNext = () => setSelectedIdx(i => (i + 1) % points.length);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeRef.current = { x: t.clientX, y: t.clientY, active: true };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!swipeRef.current?.active) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeRef.current.x;
    const dy = t.clientY - swipeRef.current.y;
    swipeRef.current.active = false;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext(); else goPrev();
    }
  };

  return (
    <div className="mapa-panel">
      <div className="mapa-canvas-wrap" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <Canvas
          camera={{ position: initialCamPos, fov: 42 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene image={image} points={points} selectedIdx={selectedIdx} onSelect={setSelectedIdx} geo={geo} />
        </Canvas>
        <div className="mapa-hint">Arrastra para girar · Pellizca para zoom</div>

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
      </div>

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
  );
}
