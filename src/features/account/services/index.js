import { createMockAccountServices } from './mock-services.js';
import { createAccountRepository } from './repository.js';
import { productService } from '../../../services/product.service.js';
import { createApiAccountServices } from './api-services.js';

// La aplicación usa el proveedor HTTP/BD real. La factoría mock se conserva
// para pruebas de UI y regresiones sin Backend.
let storage;
try { storage = globalThis.localStorage; } catch { /* memoria para pruebas sin navegador */ }
const mockRepository = createAccountRepository(storage);
export const accountServices = typeof window !== 'undefined' ? createApiAccountServices() : createMockAccountServices(mockRepository, productService);

export function activateAccount(user) {
  // Compatibilidad con el contrato anterior. La identidad ya la controla el token Bearer.
  void user;
}

export { createMockAccountServices, createAccountRepository, productService };
