import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { LocateFixed } from 'lucide-react';

/**
 * Mapa 3D del venue — Opción A: plano inclinado con textura satelital
 * (la foto ya trae la perspectiva oblicua "horneada") + pines 3D flotantes.
 * Liviano: sin datos de elevación externos, sin llamadas a APIs de mapas.
 */

interface MapPoint {
  id: string;
  label: string;
  emoji: string;
  x: number; // -1..1 sobre el plano
  z: number; // -1..1 sobre el plano
  color: string;
  isMine?: boolean; // resalta la cabaña del asistente actual
  kind?: 'cabana' | 'landmark'; // cambia el tipo de marcador 3D
}

// Puntos generales del venue — coordenadas aproximadas, pendientes de
// ubicar con /map-editor.html igual que se hizo con las cabañas.
const LANDMARKS: MapPoint[] = [
  { id: 'entrada',   label: 'Entrada',   emoji: '🚪', x: 0.75,  z: -0.21, color: '#38bdf8', kind: 'landmark' },
  { id: 'escenario', label: 'Escenario', emoji: '🎧', x: -0.05, z: -0.10, color: '#a855f7', kind: 'landmark' },
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

// Demo: resalta una cabaña como "la tuya" mientras se conecta el dato real
const DEMO_MINE_ID = 'cabana-9';

const POINTS: MapPoint[] = [
  ...LANDMARKS,
  ...CABANAS.map(p => ({ ...p, kind: 'cabana' as const })),
].map(p => (p.id === DEMO_MINE_ID ? { ...p, isMine: true } : p));

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

/** Casita 3D — usada para las cabañas. Pequeña, pegada al suelo. */
function CabanaMarker({ point, onSelect, selected }: {
  point: MapPoint;
  onSelect: (p: MapPoint) => void;
  selected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const px = (point.x * PLANE_W) / 2;
  const pz = (point.z * PLANE_D) / 2;
  const MARKER_SCALE = 4; // tamaño de las casitas 3D — aumentado 4x
  const scale = (selected || point.isMine ? 1.35 : 1) * MARKER_SCALE;
  const wallColor = point.isMine ? point.color : '#f4f1ea';

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const bob = point.isMine ? Math.sin(clock.getElapsedTime() * 2.2) * 0.004 : 0;
    groupRef.current.position.y = bob; // el cuerpo ya toca el suelo en su espacio local
  });

  return (
    <group position={[px, 0, pz]} onClick={(e) => { e.stopPropagation(); onSelect(point); }}>
      {/* sombra pegada al suelo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[0.032 * scale, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>

      {(selected || point.isMine) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <ringGeometry args={[0.034 * scale, 0.042 * scale, 24]} />
          <meshBasicMaterial color={point.color} transparent opacity={0.9} />
        </mesh>
      )}

      <group ref={groupRef} scale={scale}>
        {/* cuerpo de la cabaña */}
        <mesh position={[0, 0.011, 0]}>
          <boxGeometry args={[0.034, 0.022, 0.034]} />
          <meshStandardMaterial color={wallColor} roughness={0.8} />
        </mesh>
        {/* techo a dos aguas */}
        <mesh position={[0, 0.026, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.026, 0.018, 4]} />
          <meshStandardMaterial
            color={point.isMine ? point.color : '#7c4a2d'}
            emissive={point.isMine ? point.color : '#000000'}
            emissiveIntensity={point.isMine ? 0.5 : 0}
            roughness={0.6}
          />
        </mesh>
      </group>
    </group>
  );
}

/** Baliza fina — usada para entrada / escenario / VIP (no son cabañas). */
function LandmarkMarker({ point, onSelect, selected }: {
  point: MapPoint;
  onSelect: (p: MapPoint) => void;
  selected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const px = (point.x * PLANE_W) / 2;
  const pz = (point.z * PLANE_D) / 2;
  const markerScale = (selected ? 1.25 : 1) * 4; // mismo factor x4 que las casitas
  const height = 0.09 * markerScale; // el poste debe llegar hasta el suelo con el nuevo tamaño

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const bob = Math.sin(clock.getElapsedTime() * 2 + px) * 0.006;
    groupRef.current.position.y = height + bob;
  });

  return (
    <group position={[px, 0, pz]} onClick={(e) => { e.stopPropagation(); onSelect(point); }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[0.026 * (markerScale / 4), 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
      <group ref={groupRef} scale={markerScale}>
        <mesh position={[0, -0.045, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.09, 8]} />
          <meshStandardMaterial color="#ffffff" opacity={0.7} transparent />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshStandardMaterial color={point.color} emissive={point.color} emissiveIntensity={selected ? 0.9 : 0.5} />
        </mesh>
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

function Scene({ image, selected, onSelect, geo }: {
  image: string;
  selected: MapPoint | null;
  onSelect: (p: MapPoint) => void;
  geo: GeoState;
}) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 2]} intensity={1.1} />
      <Suspense fallback={null}>
        <Terrain image={image} />
      </Suspense>
      {POINTS.map(p =>
        p.kind === 'cabana'
          ? <CabanaMarker key={p.id} point={p} selected={selected?.id === p.id} onSelect={onSelect} />
          : <LandmarkMarker key={p.id} point={p} selected={selected?.id === p.id} onSelect={onSelect} />
      )}
      {geo.status === 'active' && geo.lat !== null && geo.lon !== null && (
        <UserLocationMarker lat={geo.lat} lon={geo.lon} accuracy={geo.accuracy} />
      )}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={1.6}
        maxDistance={4.5}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.35}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function MyAppMap({ image = '/venue-map.jpg' }: { image?: string }) {
  const [selected, setSelected] = useState<MapPoint | null>(
    POINTS.find(p => p.isMine) ?? null
  );
  const geo = useGeolocation();

  const initialCamPos = useMemo<[number, number, number]>(() => [0, 2.1, 2.3], []);

  const toggleLocate = () => {
    if (geo.status === 'active' || geo.status === 'locating') geo.stop();
    else geo.start();
  };

  return (
    <div className="mapa-panel">
      <div className="mapa-canvas-wrap">
        <Canvas
          camera={{ position: initialCamPos, fov: 42 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene image={image} selected={selected} onSelect={setSelected} geo={geo} />
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

      <div className="mapa-legend">
        {POINTS.map(p => (
          <button
            key={p.id}
            className={`mapa-legend-item ${selected?.id === p.id ? 'is-active' : ''} ${p.isMine ? 'is-mine' : ''}`}
            style={{ ['--pin-color' as any]: p.color }}
            onClick={() => setSelected(p)}
          >
            <span className="mapa-legend-dot" />
            <span className="mapa-legend-emoji">{p.emoji}</span>
            <span className="mapa-legend-label">{p.label}</span>
            {p.isMine && <span className="mapa-legend-tag">Tú</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
