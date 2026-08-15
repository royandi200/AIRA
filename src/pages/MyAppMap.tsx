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

// Las 19 cabañas reales del venue — ubicadas con /map-editor.html sobre
// venue-map.jpg. Colores en rotación para diferenciarlas visualmente.
const CABANA_COLORS = ['#22c55e', '#38bdf8', '#f97316', '#a855f7', '#facc15', '#ec4899', '#14b8a6'];

const CABANAS_RAW: { id: string; label: string; x: number; z: number }[] = [
  { id: 'cabana-1',  label: 'Cabaña 1',  x: -0.716, z: -0.714 },
  { id: 'cabana-2',  label: 'Cabaña 2',  x: -0.612, z: -0.681 },
  { id: 'cabana-3',  label: 'Cabaña 3',  x: -0.512, z: -0.646 },
  { id: 'cabana-4',  label: 'Cabaña 4',  x: -0.408, z: -0.611 },
  { id: 'cabana-5',  label: 'Cabaña 5',  x: -0.304, z: -0.578 },
  { id: 'cabana-6',  label: 'Cabaña 6',  x: -0.700, z: -0.500 },
  { id: 'cabana-7',  label: 'Cabaña 7',  x: -0.596, z: -0.466 },
  { id: 'cabana-8',  label: 'Cabaña 8',  x: -0.492, z: -0.432 },
  { id: 'cabana-9',  label: 'Cabaña 9',  x: -0.388, z: -0.398 },
  { id: 'cabana-10', label: 'Cabaña 10', x: -0.284, z: -0.364 },
  { id: 'cabana-11', label: 'Cabaña 11', x: -0.684, z: -0.286 },
  { id: 'cabana-12', label: 'Cabaña 12', x: -0.580, z: -0.252 },
  { id: 'cabana-13', label: 'Cabaña 13', x: -0.476, z: -0.218 },
  { id: 'cabana-14', label: 'Cabaña 14', x: -0.372, z: -0.184 },
  { id: 'cabana-15', label: 'Cabaña 15', x: -0.268, z: -0.150 },
  { id: 'cabana-16', label: 'Cabaña 16', x: -0.860, z: -0.072 },
  { id: 'cabana-17', label: 'Cabaña 17', x: -0.756, z: -0.038 },
  { id: 'cabana-18', label: 'Cabaña 18', x: -0.652, z: -0.004 },
  { id: 'cabana-20', label: 'Cabaña 20', x: -0.716, z: 0.714 },
];

const CABANAS: MapPoint[] = CABANAS_RAW.map((c, i) => ({
  ...c,
  emoji: '🏠',
  color: CABANA_COLORS[i % CABANA_COLORS.length],
  kind: 'cabana',
}));

// El campo real en toda la app (Attendee, manual_registros, el admin
// dashboard) es "paquete", con formato "Cabaña N - Nombre" — no
// "cabana" a secas. Se extrae el número y se compara por número, no
// por texto exacto (los labels de este mapa son solo "Cabaña N").
function cabinNumberFromPaquete(paquete: string | null | undefined): number | null {
  const m = paquete?.match(/Caba[ñn]a\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

function buildPoints(attendee?: { paquete?: string | null } | null): MapPoint[] {
  const mineNumber = cabinNumberFromPaquete(attendee?.paquete);
  const cabanas = CABANAS.map(c => {
    const n = cabinNumberFromPaquete(c.label);
    return { ...c, isMine: mineNumber !== null && n === mineNumber };
  });
  return [...cabanas, ...LANDMARKS];
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

const STAGE_FLOAT_HEIGHT = 0.55;

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

export default function MyAppMap({ image = '/venue-map.jpg', attendee }: { image?: string; attendee?: { paquete?: string | null } | null }) {
  const points = useMemo(() => buildPoints(attendee), [attendee]);
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

      <div className="mapa-selector">
        <button className="mapa-nav-arrow" onClick={goPrev} aria-label="Punto anterior">
          <ChevronLeft size={20} />
        </button>
        <div className="mapa-selector-center">
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
