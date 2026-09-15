import { productService } from '../../services/product.service.js';
import { hero, mountHero } from '../../components/hero/hero.js';
import { catalogSection, mountCatalog } from '../../sections/catalog-section.js';
export async function homePage() {
  const products = await productService.list();
  const heroProduct = products.find(product => product.heroFeatured && product.model) || products.find(product => product.model) || products.find(product => product.featured) || products[0];
  return {
    html: `${heroProduct ? hero(heroProduct) : ''}${catalogSection(products)}`,
    mount(root) { const disposeCatalog = mountCatalog(root, products); const disposeHero = mountHero(root, heroProduct); return () => { disposeCatalog(); disposeHero(); }; },
  };
}
