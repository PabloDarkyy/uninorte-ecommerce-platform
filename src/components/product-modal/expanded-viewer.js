import { animateSurface } from '../../modules/ui-motion.js';
import { icon } from '../../utils/icons.js';

export function mountExpandedViewer(parent, viewer, label) {
  const source = parent.querySelector('[data-model-mount]');
  const button = document.createElement('button');
  button.className = 'icon-button viewer-expand';
  button.setAttribute('aria-label', 'Ampliar modelo 3D');
  button.title = 'Ampliar modelo 3D';
  button.innerHTML = icon('expand');
  parent.querySelector('.modal-visual').append(button);
  const abort = new AbortController();
  let dialog, marker, animation, scrollPosition, closing = false;

  function restore() {
    if (!dialog) return;
    animation?.cancel();
    const current = dialog;
    dialog = null;
    marker.replaceWith(source);
    viewer.setExpanded(false);
    current.remove();
    closing = false;
    if (parent.open) {
      parent.scrollTop = scrollPosition.detail;
      scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'instant' });
      button.focus({ preventScroll: true });
    }
  }
  function close(immediate = false) {
    if (!dialog) return;
    if (immediate) { dialog.close(); restore(); return; }
    if (closing) return;
    closing = true;
    animation?.cancel();
    dialog.classList.add('is-closing');
    animation = animateSurface(dialog, false);
    animation.finished.then(() => { if (dialog) { dialog.close(); restore(); } }).catch(() => {});
  }
  button.addEventListener('click', () => {
    if (dialog) return;
    scrollPosition = { x: scrollX, y: scrollY, detail: parent.scrollTop };
    dialog = document.createElement('dialog');
    dialog.className = 'expanded-viewer';
    dialog.setAttribute('aria-label', `Vista ampliada de ${label}`);
    dialog.innerHTML = `<button class="icon-button expanded-close" aria-label="Cerrar modelo ampliado" autofocus>${icon('close')}</button><div class="expanded-stage"></div><p class="expanded-hint">Arrastra para girar · Rueda o pellizco para acercar</p>`;
    marker = document.createComment('Origen del visor 3D');
    source.replaceWith(marker);
    dialog.querySelector('.expanded-stage').append(source);
    document.body.append(dialog);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    const openedDialog = dialog;
    dialog.addEventListener('close', () => { if (dialog === openedDialog) restore(); }, { once: true });
    dialog.querySelector('button').addEventListener('click', () => close());
    dialog.showModal();
    viewer.setExpanded(true);
    animation = animateSurface(dialog);
  }, { signal: abort.signal });
  return () => { close(true); abort.abort(); button.remove(); };
}
