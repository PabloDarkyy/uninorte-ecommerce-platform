import { productService } from '../../../services/product.service.js';
import { createAccountRepository } from './repository.js';
import { createMockAccountServices } from './mock-services.js';
let storage;
try { storage = globalThis.localStorage; } catch { /* Demo en memoria si el navegador impide almacenamiento. */ }
const repository=createAccountRepository(storage);
export const accountServices = createMockAccountServices(repository, productService);
export function activateAccount(user){repository.activate(user);accountServices.resetSession();}
