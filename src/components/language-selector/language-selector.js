import { languageOptions } from '../../config/languages.js';
import { escapeHtml as e } from '../../utils/html.js';
export const languageSelector = ({ id = 'language', value = 'es', disabled = true } = {}) => `<label class="visual-selector"><span class="${disabled ? 'sr-only' : ''}">${disabled ? 'Idioma (vista previa, no disponible)' : 'Idioma preferido'}</span><select id="${e(id)}" name="language" ${disabled ? 'disabled' : ''}>${languageOptions.map(option => `<option value="${option.value}" ${value === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}</select></label>`;
