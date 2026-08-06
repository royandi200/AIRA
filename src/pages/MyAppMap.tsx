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
}

// Coordenadas aproximadas sobre venue-map.jpg (Joinn Houtel, Guatapé).
// Aún placeholder en su asignación exacta de cabaña — pero ya ubicadas
// sobre los puntos reales de la imagen (muelles, fila de cabañas, entrada).
const POINTS: MapPoint[] = [
  { id: 'entrada',   label: 'Entrada',   emoji: '🚪', x: 0.75,  z: -0.21, color: '#38bdf8' },
  { id: 'escenario', label: 'Escenario', emoji: '🎧', x: -0.05, z: -0.10, color: '#a855f7' },
  { id: 'vip',       label: 'Zona VIP',  emoji: '👑', x: 0.26,  z: 0.16,  color: '#facc15' },
  { id: 'cabana-a',  label: 'Cabaña A',  emoji: '🏠', x: -0.67, z: 0.43,  color: '#22c55e', isMine: true },
  { id: 'cabana-b',  label: 'Cabaña B',  emoji: '🏠', x: 0.14,  z: 0.51,  color: '#22c55e' },
];

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

function Pin({ point, onSelect, selected }: {
  point: MapPoint;
  onSelect: (p: MapPoint) => void;
  selected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const px = (point.x * PLANE_W) / 2;
  const pz = (point.z * PLANE_D) / 2;
  const height = point.isMine ? 1.1 : 0.8;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const bob = Math.sin(clock.getElapsedTime() * 2 + px) * 0.04;
    groupRef.current.position.y = height + bob + (selected ? 0.12 : 0);
  });

  return (
    <group position={[px, 0, pz]}>
      {/* sombra falsa en el suelo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[point.isMine ? 0.22 : 0.16, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>

      <group ref={groupRef} onClick={() => onSelect(point)}>
        {/* punta del pin */}
        <mesh position={[0, -0.18, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.11, 0.22, 16]} />
          <meshStandardMaterial color={point.color} emissive={point.color} emissiveIntensity={selected || point.isMine ? 0.8 : 0.3} />
        </mesh>
        {/* cabeza del pin */}
        <mesh>
          <sphereGeometry args={[0.16, 20, 20]} />
          <meshStandardMaterial color="#0a0a0d" emissive={point.color} emissiveIntensity={0.15} />
        </mesh>
        {point.isMine && (
          <mesh>
            <sphereGeometry args={[0.24, 20, 20]} />
            <meshBasicMaterial color={point.color} transparent opacity={0.18} />
          </mesh>
        )}
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
      {POINTS.map(p => (
        <Pin key={p.id} point={p} selected={selected?.id === p.id} onSelect={onSelect} />
      ))}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2.6}
        maxDistance={6}
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

  const initialCamPos = useMemo<[number, number, number]>(() => [0, 3.4, 3.6], []);

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
