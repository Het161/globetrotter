"use client";

import * as React from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";

/**
 * TripGlobe — the route, drawn on a globe.
 *
 * This exists because the product literally is "a route between cities", not
 * because 3D is fashionable. It renders on exactly three screens (dashboard,
 * landing, public share) and is dynamically imported with ssr:false so the
 * three.js bundle never reaches the builder or budget routes.
 *
 * Cost control, all of it deliberate:
 *   · pixelRatio capped at 1.5 — a retina globe costs 4× the fragments for no
 *     visible gain at this size
 *   · rendering pauses when the canvas scrolls out of view
 *   · pointer interaction is opt-in; on the dashboard tile it stays off so the
 *     globe never steals a scroll gesture
 *   · textures are committed to public/globe, so this works offline
 */

export type GlobePoint = { name: string; lat: number; lng: number };

export type TripGlobeProps = {
  /** Ordered stops. Two or more draws arcs between them. */
  route?: GlobePoint[];
  /** Shown when there's no route yet — the popular-cities fallback. */
  points?: GlobePoint[];
  interactive?: boolean;
  autoRotate?: boolean;
  showLabels?: boolean;
  className?: string;
};

type Arc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  /** Longer legs arc higher, which reads as distance. */
  altitude: number;
};

const LAGOON = "#36D6C3";
const SOLAR = "#F5B62B";

export default function TripGlobe({
  route = [],
  points = [],
  interactive = false,
  autoRotate = true,
  showLabels = true,
  className,
}: TripGlobeProps) {
  const globeRef = React.useRef<GlobeMethods | undefined>(undefined);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const [visible, setVisible] = React.useState(true);
  const [ready, setReady] = React.useState(false);

  /* --- Size to the container ------------------------------------------- */
  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* --- Pause rendering when off-screen --------------------------------- */
  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.05,
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /**
   * The globe's surface material.
   *
   * Built here rather than left to the default so the sphere still looks
   * deliberate if `earth-night.jpg` is missing: an indigo body with a faint
   * emissive lift, which the atmosphere and arcs sit on top of.
   */
  const globeMaterial = React.useMemo(() => {
    const material = new THREE.MeshPhongMaterial();
    material.color = new THREE.Color("#121829");
    material.emissive = new THREE.Color("#0a0e1a");
    material.emissiveIntensity = 0.32;
    material.shininess = 2;
    return material;
  }, []);

  /* --- Controls and pixel ratio ---------------------------------------- */
  React.useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready) return;

    const controls = globe.controls();
    controls.autoRotate = autoRotate && !reduceMotion;
    controls.autoRotateSpeed = 0.45;
    controls.enableZoom = false;
    controls.enablePan = false;

    // A retina globe costs 4× the fragments for no visible gain at this size.
    globe.renderer().setPixelRatio(Math.min(1.5, window.devicePixelRatio));
  }, [ready, autoRotate, reduceMotion]);

  /* --- Stop rendering entirely while off-screen ------------------------ */
  React.useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready) return;

    if (visible) globe.resumeAnimation();
    else globe.pauseAnimation();
  }, [ready, visible]);

  /* --- Point the camera at the route ----------------------------------- */
  React.useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready) return;

    const focus = route.length ? route : points;
    if (focus.length === 0) return;

    // Aim at the mean position of the stops, backed off far enough to hold
    // the whole route in frame.
    const lat = focus.reduce((sum, p) => sum + p.lat, 0) / focus.length;
    const lng = focus.reduce((sum, p) => sum + p.lng, 0) / focus.length;
    const spread = Math.max(
      ...focus.map((p) => Math.abs(p.lat - lat) + Math.abs(p.lng - lng)),
      12,
    );

    globe.pointOfView(
      { lat, lng, altitude: Math.min(3.2, 1.35 + spread / 55) },
      reduceMotion ? 0 : 1400,
    );
  }, [ready, route, points, reduceMotion]);

  /* --- Data ------------------------------------------------------------- */
  const arcs = React.useMemo<Arc[]>(() => {
    if (route.length < 2) return [];
    return route.slice(0, -1).map((from, index) => {
      const to = route[index + 1];
      const distance = Math.hypot(to.lat - from.lat, to.lng - from.lng);
      return {
        startLat: from.lat,
        startLng: from.lng,
        endLat: to.lat,
        endLng: to.lng,
        altitude: Math.min(0.42, 0.06 + distance / 220),
      };
    });
  }, [route]);

  const markers = route.length ? route : points;

  const rings = React.useMemo(
    () =>
      markers.map((point) => ({
        lat: point.lat,
        lng: point.lng,
        maxR: 3.2,
        propagationSpeed: 1.1,
        repeatPeriod: 1600,
      })),
    [markers],
  );

  if (size.width === 0) {
    // First paint measures the container; the globe mounts on the next frame.
    return <div ref={containerRef} className={className} />;
  }

  return (
    <div ref={containerRef} className={className}>
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        onGlobeReady={() => setReady(true)}
        // Transparent so the page's own aurora and starfield show through.
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="/globe/earth-night.jpg"
        globeMaterial={globeMaterial}
        showAtmosphere
        atmosphereColor={LAGOON}
        atmosphereAltitude={0.18}
        enablePointerInteraction={interactive}
        animateIn={!reduceMotion}
        rendererConfig={{ antialias: true, alpha: true }}
        /* The route, in Lagoon, with the dash animation from §11.4. */
        arcsData={arcs}
        arcStartLat={(d) => (d as Arc).startLat}
        arcStartLng={(d) => (d as Arc).startLng}
        arcEndLat={(d) => (d as Arc).endLat}
        arcEndLng={(d) => (d as Arc).endLng}
        arcAltitude={(d) => (d as Arc).altitude}
        arcColor={() => [`${LAGOON}00`, LAGOON, `${LAGOON}00`]}
        arcStroke={0.55}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={reduceMotion ? 0 : 2500}
        /* Stops as solid dots… */
        pointsData={markers}
        pointLat={(d) => (d as GlobePoint).lat}
        pointLng={(d) => (d as GlobePoint).lng}
        pointColor={() => (route.length ? SOLAR : LAGOON)}
        pointAltitude={0.012}
        pointRadius={0.32}
        /* …with a slow pulse ring under each one. */
        ringsData={reduceMotion ? [] : rings}
        ringColor={() => (t: number) => `rgba(54,214,195,${Math.max(0, 1 - t) * 0.5})`}
        ringMaxRadius={3.2}
        ringPropagationSpeed={1.1}
        ringRepeatPeriod={1600}
        labelsData={showLabels ? markers : []}
        labelLat={(d) => (d as GlobePoint).lat}
        labelLng={(d) => (d as GlobePoint).lng}
        labelText={(d) => (d as GlobePoint).name}
        labelSize={0.9}
        labelDotRadius={0}
        labelColor={() => "rgba(242,238,227,0.75)"}
        labelResolution={2}
        labelAltitude={0.02}
      />
    </div>
  );
}
