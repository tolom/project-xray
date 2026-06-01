"use client";

import { useEffect, useRef, useState } from "react";
import { ScanResult } from "@/lib/xray-analyzer";

interface ScanAnimationState {
  /** Beam movement progress from 0 to 1. */
  beamProgress: number;
  /** IDs of files or nodes that have already been scanned and should be active. */
  activatedNodeIds: Set<string>;
  /** IDs of nodes that were activated recently for the glow effect. */
  recentlyActivated: Set<string>;
  /** Whether the scan beam should be visible. */
  isBeamVisible: boolean;
  /** Whether the animation is complete. */
  isComplete: boolean;
}

interface UseScanAnimationOptions {
  /** Total beam animation duration in milliseconds. */
  duration?: number;
  /** Whether the animation is enabled. */
  enabled?: boolean;
}

/**
 * Controls the scan beam animation and progressive node activation.
 * Used together with XRayMap and ScanBeamOverlay.
 */
export function useScanAnimation(
  result: ScanResult | null,
  isScanning: boolean,
  scanProgress: number = 0,
  options: UseScanAnimationOptions = {}
): ScanAnimationState {
  const { duration = 2200, enabled = true } = options;

  const [state, setState] = useState<ScanAnimationState>({
    beamProgress: 0,
    activatedNodeIds: new Set(),
    recentlyActivated: new Set(),
    isBeamVisible: false,
    isComplete: false,
  });

  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const activatedNodeIdsRef = useRef<Set<string>>(new Set());

  // Reset state when a new scan starts.
  useEffect(() => {
    if (isScanning) {
      startTimeRef.current = 0;
      activatedNodeIdsRef.current = new Set();

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        setState({
          beamProgress: 0,
          activatedNodeIds: new Set(),
          recentlyActivated: new Set(),
          isBeamVisible: true,
          isComplete: false,
        });
      });
    }
  }, [isScanning]);

  // Start when scan results are available and the progress indicator is near completion.
  const shouldStartAnimation = result && !isScanning && (scanProgress >= 82 || !isScanning);

  useEffect(() => {
    if (!shouldStartAnimation || !enabled) {
      return;
    }

    const allNodeIds = result.nodes.map((n) => n.path);
    startTimeRef.current = Date.now();
    activatedNodeIdsRef.current = new Set();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const rawProgress = Math.min(elapsed / duration, 1);

      const beamProgress = easeOutCubic(rawProgress);
      const activationCount = Math.floor(rawProgress * allNodeIds.length);
      const activated = new Set<string>();
      const newlyActivated = new Set<string>();

      for (let i = 0; i < activationCount; i++) {
        if (allNodeIds[i]) {
          activated.add(allNodeIds[i]);
        }
      }

      activated.forEach((id) => {
        if (!activatedNodeIdsRef.current.has(id)) {
          newlyActivated.add(id);
        }
      });

      const isComplete = rawProgress >= 1;
      activatedNodeIdsRef.current = activated;

      setState({
        beamProgress,
        activatedNodeIds: activated,
        recentlyActivated: newlyActivated,
        isBeamVisible: !isComplete,
        isComplete,
      });

      if (!isComplete) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            isBeamVisible: false,
            recentlyActivated: new Set(),
          }));
        }, 350);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [result, isScanning, scanProgress, duration, enabled, shouldStartAnimation]);

  return state;
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}
