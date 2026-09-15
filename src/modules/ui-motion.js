export function motionOptions(kind = 'normal') {
  const style = getComputedStyle(document.documentElement);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { duration: reduced ? 0 : parseFloat(style.getPropertyValue(`--duration-${kind}`)) || 280, easing: style.getPropertyValue('--ease-premium').trim() || 'ease-out' };
}
export function animateSurface(element, entering = true) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frames = [{ opacity: 0, transform: reduced ? 'none' : 'scale(.96)' }, { opacity: 1, transform: 'none' }];
  return element.animate(entering ? frames : frames.reverse(), { ...motionOptions(entering ? 'normal' : 'fast'), fill: entering ? 'none' : 'forwards' });
}
export function createDialog({ title, html, className = '', onDispose = () => {} }) {
  const trigger = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = `admin-dialog ${className}`;
  const id = `dialog-${crypto.randomUUID()}`;
  dialog.setAttribute('aria-labelledby', id);
  dialog.innerHTML = `<div class="admin-dialog-card"><header><h2 id="${id}"></h2><button type="button" class="icon-button" data-dismiss aria-label="Cerrar">×</button></header>${html}</div>`;
  dialog.querySelector('h2').textContent = title;
  let animation, closing = false, disposed = false;
  const abort = new AbortController();
  function dispose() { if (disposed) return; disposed = true; animation?.cancel(); abort.abort(); dialog.remove(); onDispose(); if (trigger?.isConnected) trigger.focus({ preventScroll: true }); }
  function close(immediate = false) {
    if (disposed) return;
    if (immediate) { dialog.close(); dispose(); return; }
    if (closing) return; closing = true; animation?.cancel(); dialog.classList.add('is-closing');
    animation = animateSurface(dialog.querySelector('.admin-dialog-card'), false);
    animation.finished.then(() => { dialog.close(); dispose(); }).catch(() => {});
  }
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }, { signal: abort.signal });
  dialog.addEventListener('click', event => { if (event.target === dialog || event.target.closest('[data-dismiss]')) close(); }, { signal: abort.signal });
  dialog.addEventListener('close', dispose, { once: true });
  document.body.append(dialog); dialog.showModal(); animation = animateSurface(dialog.querySelector('.admin-dialog-card'));
  return { dialog, close, signal: abort.signal };
}
