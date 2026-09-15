let active;
export function cancelCatalogNavigation() { active?.abort(); active = null; }
export function animateToCatalog(target) {
  if (active) return;
  const wrapper = document.querySelector('.hero-transition');
  const sticky = wrapper?.querySelector('.hero-sticky');
  if (!sticky || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
    return;
  }
  const from = scrollY;
  const end = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight,
    target.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(target).scrollMarginTop)));
  const pinEnd = wrapper.getBoundingClientRect().bottom + scrollY - sticky.offsetHeight - parseFloat(getComputedStyle(sticky).top);
  const waypoint = Math.max(from, Math.min(end, pinEnd));
  const travel = waypoint - from;
  const cinematicTime = travel > 1 ? Math.max(650, 1800 * Math.min(1, travel / (innerHeight * 1.4))) : 0;
  const revealTime = 500;
  const abort = new AbortController();
  active = abort;
  let frame, start;
  const cancel = () => { abort.abort(); if (active === abort) active = null; };
  abort.signal.addEventListener('abort', () => cancelAnimationFrame(frame), { once: true });
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'resize']) window.addEventListener(type, cancel, { passive: true, signal: abort.signal });
  window.addEventListener('keydown', event => {
    if (['Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) cancel();
  }, { signal: abort.signal });
  const ease = p => p * p * (3 - 2 * p);
  function tick(time) {
    start ??= time;
    const elapsed = time - start;
    const first = elapsed < cinematicTime;
    const p = Math.min(1, first ? elapsed / cinematicTime : (elapsed - cinematicTime) / revealTime);
    const y = first ? from + travel * ease(p) : waypoint + (end - waypoint) * ease(p);
    scrollTo({ top: y, behavior: 'instant' });
    if (!first && p === 1) { cancel(); target.focus({ preventScroll: true }); }
    else frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
}
