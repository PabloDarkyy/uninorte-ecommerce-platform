import { productService } from '../../services/product.service.js';
import { productAssets } from '../../services/products/product-assets.js';
import { accountServices } from '../account/services/index.js';
import { analyticsService } from '../../services/analytics/analytics.service.js';
import { createMockAnalyticsService } from '../../services/analytics/mock-analytics.service.js';
import { DEMO_MODE } from '../../config/api.js';

const useMocks = typeof window === 'undefined' || DEMO_MODE;

export const adminServices = {
  products: productService,
  assets: productAssets,
  orders: accountServices.orderService,
  users: useMocks ? accountServices.userService : accountServices.userAdminService,
  analytics: useMocks ? createMockAnalyticsService(productService, accountServices.orderService) : analyticsService,
};
