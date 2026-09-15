import { productService } from '../../../services/product.service.js';
import { createAccountRepository } from './repository.js';
import { createMockAccountServices } from './mock-services.js';
let storage;
try { storage = globalThis.localStorage; } catch { /* Demo en memoria si el navegador impide almacenamiento. */ }
export const accountServices = createMockAccountServices(createAccountRepository(storage), productService);
