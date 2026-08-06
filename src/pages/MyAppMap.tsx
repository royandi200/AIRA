import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

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
  const scale = selected || point.isMine ? 1.35 : 1;
  const wallColor = point.isMine ? point.color : '#f4f1ea';

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const bob = point.isMine ? Math.sin(clock.getElapsedTime() * 2.2) * 0.004 : 0;
    groupRef.current.position.y = 0.028 + bob;
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
  const height = 0.09;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const bob = Math.sin(clock.getElapsedTime() * 2 + px) * 0.006;
    groupRef.current.position.y = height + bob;
  });

  return (
    <group position={[px, 0, pz]} onClick={(e) => { e.stopPropagation(); onSelect(point); }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[0.026, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
      <group ref={groupRef} scale={selected ? 1.25 : 1}>
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

function Scene({ image, selected, onSelect }: {
  image: string;
  selected: MapPoint | null;
  onSelect: (p: MapPoint) => void;
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

  const initialCamPos = useMemo<[number, number, number]>(() => [0, 2.1, 2.3], []);

  return (
    <div className="mapa-panel">
      <div className="mapa-canvas-wrap">
        <Canvas
          camera={{ position: initialCamPos, fov: 42 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene image={image} selected={selected} onSelect={setSelected} />
        </Canvas>
        <div className="mapa-hint">Arrastra para girar · Pellizca para zoom</div>
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
