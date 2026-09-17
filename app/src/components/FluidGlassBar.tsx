import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, MeshTransmissionMaterial, Text } from '@react-three/drei';
import { easing } from 'maath';
import { useNavigate, useLocation } from 'react-router-dom';

// ============================================================================
// FluidGlassBar — essai ISOLÉ et RÉVERSIBLE, adapté du composant "FluidGlass"
// (mode "bar") de React Bits : https://reactbits.dev
//
// Ce que ce port change par rapport à la source :
//  - mode="bar" UNIQUEMENT (lens/cube abandonnés : pas de lens.glb/cube.glb
//    téléchargés, et hors du périmètre de l'essai demandé).
//  - Le portail de scène marketing (Typography + carrousel d'images sur
//    ScrollControls) est supprimé : sans lui, MeshTransmissionMaterial capture
//    automatiquement son propre environnement via son FBO interne (comportement
//    par défaut de drei) — plus besoin de la manip manuelle de buffer/clearColor
//    de la source, qui imposait un fond violet opaque (0x5227ff) hors charte.
//  - Résultat honnête à annoncer : la barre est un vrai matériau de verre
//    physique (transmission/IOR/aberration chromatique), mais elle ne
//    « distord » PAS le DOM réel derrière elle — seul son propre environnement
//    3D (quasi vide ici) est refracté. C'est une barre de verre décorative
//    fonctionnelle, pas un vrai effet de loupe sur la page.
//  - Items alimentés par la nav réelle de l'app (NAV) et navigation via
//    react-router (pas de rechargement complet comme dans la source).
// ============================================================================

interface NavItem { to: string; label: string }

export function FluidGlassBar({ items, onExit }: { items: NavItem[]; onExit: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 h-24 md:left-16">
      <FluidGlassErrorBoundary onError={onExit}>
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 20], fov: 15 }} gl={{ alpha: true }}>
            <ambientLight intensity={1} />
            <BarGlass />
            <BarNavItems items={items} />
          </Canvas>
        </Suspense>
      </FluidGlassErrorBoundary>
      <button
        onClick={onExit}
        className="glass absolute right-3 top-2 z-50 rounded-full px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm transition-colors hover:text-brand-600 dark:text-slate-300"
      >
        ✕ Quitter l'essai
      </button>
    </div>
  );
}

// ── Le socle de verre (geometry du .glb + matériau de transmission) ─────────
function BarGlass() {
  const ref = useRef<THREE.Mesh>(null!);
  const { nodes } = useGLTF('./assets/3d/bar.glb') as unknown as { nodes: Record<string, THREE.Mesh> };
  const geoWidthRef = useRef(1);

  useEffect(() => {
    const geo = nodes.Cube?.geometry;
    if (!geo) return;
    geo.computeBoundingBox();
    geoWidthRef.current = (geo.boundingBox!.max.x - geo.boundingBox!.min.x) || 1;
  }, [nodes]);

  useFrame((state, delta) => {
    const v = state.viewport.getCurrentViewport(state.camera, [0, 0, 15]);
    easing.damp3(ref.current.position, [0, -v.height / 2 + 0.2, 15], 0.15, delta);
    const desired = (v.width * 0.92) / geoWidthRef.current;
    ref.current.scale.setScalar(Math.min(0.16, desired));
  });

  if (!nodes.Cube) return null;
  return (
    <mesh ref={ref} rotation-x={Math.PI / 2} geometry={nodes.Cube.geometry}>
      {/* Teinte d'atténuation = brand-500 (pétrole de charte), pas le violet
          générique de la démo — le verre reste identifiable comme « à nous ». */}
      <MeshTransmissionMaterial
        transmission={1}
        roughness={0.06}
        thickness={8}
        ior={1.15}
        chromaticAberration={0.035}
        anisotropy={0.01}
        color="#ffffff"
        attenuationColor="#158375"
        attenuationDistance={0.4}
      />
    </mesh>
  );
}

// ── Libellés de nav flottants, cliquables, ancrés au bas du canvas ─────────
function BarNavItems({ items }: { items: NavItem[] }) {
  const group = useRef<THREE.Group>(null!);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // 9 destinations, pas 3 comme dans la démo d'origine : on resserre police et
  // espacement proportionnellement, sinon les libellés se chevauchent.
  const { fontSize, spacing } = useMemo(() => {
    const base = window.innerWidth < 640 ? 0.026 : window.innerWidth < 1024 ? 0.03 : 0.034;
    const k = Math.min(1, 4 / items.length);
    return { fontSize: base * Math.max(k, 0.62), spacing: (window.innerWidth < 640 ? 0.15 : 0.2) * Math.max(k, 0.62) };
  }, [items.length]);

  useFrame((state) => {
    if (!group.current) return;
    const v = state.viewport.getCurrentViewport(state.camera, [0, 0, 15]);
    group.current.position.set(0, -v.height / 2 + 0.2, 15.1);
    group.current.children.forEach((child, i) => {
      child.position.x = (i - (items.length - 1) / 2) * spacing;
    });
  });

  return (
    <group ref={group} renderOrder={10}>
      {items.map((n) => (
        <Text
          key={n.to}
          fontSize={fontSize}
          color={pathname === n.to ? '#e8613c' /* signal-400 — actif */ : '#ffffff'}
          anchorX="center"
          anchorY="middle"
          material-depthWrite={false}
          material-depthTest={false}
          renderOrder={10}
          outlineWidth={0}
          outlineBlur="18%"
          outlineColor="#000"
          outlineOpacity={0.55}
          onClick={(e) => { e.stopPropagation(); navigate(n.to); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
          {n.label}
        </Text>
      ))}
    </group>
  );
}

// ── Filet de sécurité : un échec WebGL (contexte perdu, .glb introuvable…) ne
//    doit jamais faire disparaître la navigation réelle sous cet essai. ──────
class FluidGlassErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) {
    console.error('[FluidGlassBar] rendu WebGL interrompu — repli sur la navigation normale.', err);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

useGLTF.preload('./assets/3d/bar.glb');
