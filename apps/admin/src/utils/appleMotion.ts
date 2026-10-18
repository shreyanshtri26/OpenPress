/**
 * Apple Design System - Motion & Physics Utilities
 * Distilled from WWDC "Designing Fluid Interfaces" & Emil Kowalski's Web Translation Framework
 */

// 1. Apple's Momentum Projection
// Projects where a gesture will rest based on exponential deceleration
export function projectMomentum(initialVelocity: number, decelerationRate: number = 0.998): number {
  if (Math.abs(initialVelocity) < 0.01) return 0;
  return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
}

// 2. Apple's Rubber-banding Formula
// Continuous progressive resistance past boundaries (prevents frozen/hard-stop feel)
export function rubberband(overshoot: number, dimension: number, constant: number = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

// 3. Apple Spring Parameters (Critically damped & Momentum tuned)
export const appleSprings = {
  // Default critically damped: smooth, zero overshoot, elegant settle
  default: {
    type: 'spring',
    damping: 1.0,
    stiffness: 320,
    mass: 0.8,
  },
  // Snappy: fast response for micro-interactions, toggles, icon flips
  snappy: {
    type: 'spring',
    damping: 1.0,
    stiffness: 450,
    mass: 0.6,
  },
  // Sheet & Drawer: gentle, natural physical motion without bounce
  sheet: {
    type: 'spring',
    damping: 1.0,
    stiffness: 280,
    mass: 1.0,
  },
  // Momentum flick: slight bounce ONLY when a physical throw occurred
  momentum: {
    type: 'spring',
    damping: 0.82,
    stiffness: 300,
    mass: 0.9,
  },
  // Popovers & Tooltips: subtle scale-in from anchor
  popover: {
    type: 'spring',
    damping: 0.88,
    stiffness: 400,
    mass: 0.7,
  },
} as const;

// 4. Multimodal Audio-Haptic trigger (respecting Utility & Harmony)
export function triggerHaptic(type: 'selection' | 'impact' | 'success' | 'warning' = 'selection'): void {
  if (typeof window === 'undefined' || !navigator.vibrate) return;
  
  try {
    switch (type) {
      case 'selection':
        navigator.vibrate(8);
        break;
      case 'impact':
        navigator.vibrate(15);
        break;
      case 'success':
        navigator.vibrate([10, 40, 15]);
        break;
      case 'warning':
        navigator.vibrate([20, 50, 30]);
        break;
    }
  } catch {
    // Gracefully ignore devices with vibration restrictions
  }
}
