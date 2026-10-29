import { createMockAccountServices } from './mock-services.js';
import { createAccountRepository } from './repository.js';
import { productService } from '../../../services/product.service.js';
import { createApiAccountServices } from './api-services.js';
import { DEMO_MODE } from '../../../config/api.js';

// El navegador usa HTTP salvo cuando Pages activa explícitamente la demostración.
let storage;
try { storage = globalThis.localStorage; } catch { /* memoria para pruebas sin navegador */ }
const mockRepository = createAccountRepository(storage);
const useMocks = typeof window === 'undefined' || DEMO_MODE;
export const accountServices = useMocks ? createMockAccountServices(mockRepository, productService) : createApiAccountServices();

export function activateAccount(user) {
  if (!useMocks) return;
  mockRepository.activate(user);
  accountServices.resetSession();
}

export { createMockAccountServices, createAccountRepository, productService };
