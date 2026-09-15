import { productService } from '../../services/product.service.js';
import { productAssets } from '../../services/products/product-assets.js';
import { accountServices } from '../account/services/index.js';
import { createMockAnalyticsService } from '../../services/analytics/mock-analytics.service.js';
export const adminServices = { products: productService, assets: productAssets, orders: accountServices.orderService,
  users: accountServices.userService, analytics: createMockAnalyticsService(productService, accountServices.orderService) };
