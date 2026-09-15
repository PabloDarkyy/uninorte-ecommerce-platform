import { clamp01, getTransitionState } from './hero-transition.js';

export function createHeroScroll(hero, catalog, viewer) {
  const abort = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const wrapper = hero.closest('.hero-transition');
  const sticky = wrapper.querySelector('.hero-sticky');
  const overlay = wrapper.querySelector('.hero-canvas-overlay');
  const source = hero.querySelector('[data-model-mount]');
  const copy = hero.querySelector('.hero-copy');
  const exhibit = hero.querySelector('.hero-exhibit');
  const header = document.querySelector('#header');
  let frame = 0, needsMeasure = true, metrics;
  let debug;
  if (new URLSearchParams(location.search).get('debugScroll') === '1') {
    debug = document.createElement('output');
    debug.className = 'hero-scroll-debug';
    debug.setAttribute('aria-label', 'Progreso de la transición');
    sticky.append(debug);
  }

  function measure() {
    // Se leen tamaños únicamente al montar/redimensionar, nunca en cada evento de scroll.
    const width = document.documentElement.clientWidth;
    const height = innerHeight;
    const stickyRect = sticky.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const visualHeight = sticky.offsetHeight;
    const headerSpace = header.getBoundingClientRect().height + 16;
    const stickyTop = Math.min(headerSpace, height - visualHeight);
    const scrollDistance = wrapperRect.height - visualHeight;
    const origin = {
      x: sourceRect.left + sourceRect.width / 2,
      y: sourceRect.top - stickyRect.top + sourceRect.height / 2 + stickyTop,
      width: sourceRect.width, height: sourceRect.height,
    };
    metrics = { width, height, origin, start: wrapperRect.top + scrollY - stickyTop, distance: Math.max(1, scrollDistance) };
    wrapper.style.setProperty('--hero-visual-height', `${visualHeight}px`);
    wrapper.style.setProperty('--hero-header-space', `${headerSpace}px`);
    wrapper.style.setProperty('--hero-sticky-top', `${stickyTop}px`);
    wrapper.style.setProperty('--hero-overlay-left', `${-stickyRect.left}px`);
    wrapper.style.setProperty('--hero-overlay-top', `${-stickyTop}px`);
    wrapper.style.setProperty('--hero-viewport-width', `${width}px`);
    wrapper.style.setProperty('--hero-viewport-height', `${height}px`);
    viewer.configureTransition({ layer: overlay, width, height, origin });
    needsMeasure = false;
  }

  function update() {
    frame = 0;
    if (needsMeasure) measure();
    const progress = clamp01((scrollY - metrics.start) / metrics.distance);
    const state = getTransitionState(progress, { ...metrics, reducedMotion: motion.matches });
    wrapper.dataset.scrollProgress = progress.toFixed(6);
    document.documentElement.style.setProperty('--nature-mix', `${state.colorMix * 100}%`);
    wrapper.style.setProperty('--transition-progress', String(progress));
    wrapper.style.setProperty('--hero-model-opacity', String(state.opacity));
    wrapper.style.setProperty('--hero-copy-opacity', String(state.textOpacity));
    wrapper.style.setProperty('--hero-copy-shift', `${state.textShift}px`);
    wrapper.style.setProperty('--hero-decoration-opacity', String(state.decorationOpacity));
    copy.inert = state.textOpacity < 0.05;
    exhibit.inert = state.decorationOpacity < 0.05;
    viewer.setTransitionFrame(state);
    if (debug) debug.textContent = `scrollProgress: ${progress.toFixed(3)}`;
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const invalidateSize = () => { needsMeasure = true; schedule(); };
  window.addEventListener('scroll', schedule, { passive: true, signal: abort.signal });
  window.addEventListener('resize', invalidateSize, { signal: abort.signal });
  window.addEventListener('pageshow', invalidateSize, { signal: abort.signal });
  motion.addEventListener('change', invalidateSize, { signal: abort.signal });
  const resizeObserver = new ResizeObserver(invalidateSize);
  resizeObserver.observe(hero);
  resizeObserver.observe(source);
  resizeObserver.observe(wrapper);
  resizeObserver.observe(sticky);
  resizeObserver.observe(header);
  document.fonts?.ready.then(() => { if (!abort.signal.aborted) invalidateSize(); });
  schedule();
  return () => {
    abort.abort();
    resizeObserver.disconnect();
    cancelAnimationFrame(frame);
    debug?.remove();
    copy.inert = false;
    exhibit.inert = false;
    document.documentElement.style.removeProperty('--nature-mix');
    wrapper.removeAttribute('style');
    delete wrapper.dataset.scrollProgress;
  };
}

