import { productService } from '../../services/product.service.js';
import { productAssets } from '../../services/products/product-assets.js';
import { accountServices } from '../account/services/index.js';
import { analyticsService } from '../../services/analytics/analytics.service.js';

export const adminServices = {
  products: productService,
  assets: productAssets,
  orders: accountServices.orderService,
  users: accountServices.userAdminService,
  analytics: analyticsService,
};
