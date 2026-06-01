"use client";

interface ScanBeamOverlayProps {
  /** Beam progress from 0 to 1. */
  progress: number;
  /** Whether to show the overlay. */
  isVisible: boolean;
  /** Additional classes. */
  className?: string;
  /** Movement direction. Currently only left-to-right is supported. */
  direction?: "left-to-right";
}

/**
 * Visual scan beam overlay: a translucent neon gradient that moves over the React Flow map.
 */
export function ScanBeamOverlay({
  progress,
  isVisible,
  className,
}: ScanBeamOverlayProps) {
  if (!isVisible) return null;

  // The beam is wider than it looks and slightly leads progress for a smoother effect.
  const beamLeft = `${(progress - 0.32) * 100}%`;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden rounded-2xl z-10 ${className || ""}`}
    >
      {/* Main scan beam. */}
      <div
        className="absolute top-0 h-full w-[45%] transition-[left] duration-[50ms] ease-out"
        style={{
          left: beamLeft,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(103,232,249,0.35) 30%, rgba(103,232,249,0.48) 48%, rgba(103,232,249,0.35) 66%, transparent 100%)",
          filter: "blur(11px)",
          transform: "skewX(-13deg)",
          boxShadow: "0 0 90px rgba(103,232,249,0.38)",
        }}
      />

      {/* Brighter center line for emphasis. */}
      <div
        className="absolute top-0 h-full w-[16%] transition-[left] duration-[50ms] ease-out"
        style={{
          left: `${(progress - 0.16) * 100}%`,
          background:
            "linear-gradient(90deg, transparent, rgba(103,232,249,0.65), transparent)",
          filter: "blur(2px)",
          transform: "skewX(-13deg)",
        }}
      />
    </div>
  );
}
