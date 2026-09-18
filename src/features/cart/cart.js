import { cartService } from '../../services/cart.service.js';
export const getCartSummary = () => cartService.getSummary();
