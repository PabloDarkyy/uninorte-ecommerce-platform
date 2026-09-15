// Todos los estados cinematográficos son funciones puras del progreso, sin reloj ni dirección.
export const transitionConfig = {
  interactionEnd: 0.12,
  horizontalRotation: Math.PI / 2,
  secondaryRotation: 0.35,
  macroZoom: 7,
  tabletZoomFactor: 0.8,
  mobileZoomFactor: 0.65,
  exitGrowth: 1.1,
};
export const clamp01 = value => Math.max(0, Math.min(1, value));
export const lerp = (start, end, value) => start + (end - start) * value;
export const inverseLerp = (start, end, value) => clamp01((value - start) / (end - start));
export const smoothstep = value => value * value * (3 - 2 * value);
const easeInOutCubic = value => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;

export function getTransitionState(progress, { width, height, origin, reducedMotion = false }) {
  const p = clamp01(progress);
  const travel = easeInOutCubic(inverseLerp(0.15, 0.55, p));
  const rotation = smoothstep(inverseLerp(0.15, 0.7, p));
  const macro = inverseLerp(0.8, 0.9, p) ** 3;
  const exit = smoothstep(inverseLerp(0.9, 1, p));
  const deviceFactor = width <= 700 ? transitionConfig.mobileZoomFactor : width <= 1100 ? transitionConfig.tabletZoomFactor : 1;
  // En horizontal cabe la botella completa antes del macro, también en pantallas estrechas.
  const centerScale = Math.min(2.5, width * (width <= 700 ? 0.82 : 0.64) / (origin.height * 0.7));
  const middleScale = lerp(1, centerScale, smoothstep(inverseLerp(0.15, 0.7, p)));
  const approach = lerp(1, 1.25, smoothstep(inverseLerp(0.7, 0.8, p)));
  const zoom = lerp(approach, transitionConfig.macroZoom * deviceFactor, macro);
  return {
    progress: p,
    locked: !reducedMotion && p >= transitionConfig.interactionEnd,
    x: reducedMotion ? origin.x : lerp(origin.x, width / 2, travel),
    y: reducedMotion ? origin.y : lerp(origin.y, height / 2, travel),
    scale: reducedMotion ? 1 : middleScale * zoom * lerp(1, transitionConfig.exitGrowth, exit),
    rotationZ: reducedMotion ? -0.12 : lerp(-0.12, transitionConfig.horizontalRotation, rotation),
    rotationY: reducedMotion ? 0 : transitionConfig.secondaryRotation * rotation,
    focusY: reducedMotion ? 0 : 0.2 * macro,
    opacity: reducedMotion ? 1 - exit * 0.2 : 1 - exit,
    textOpacity: reducedMotion ? 1 : 1 - smoothstep(inverseLerp(0.3, 0.7, p)),
    textShift: reducedMotion ? 0 : -18 * smoothstep(inverseLerp(0.3, 0.7, p)),
    decorationOpacity: reducedMotion ? 1 : 1 - smoothstep(inverseLerp(0.15, 0.65, p)),
    colorMix: smoothstep(inverseLerp(0.82, 1, p)),
  };
}
