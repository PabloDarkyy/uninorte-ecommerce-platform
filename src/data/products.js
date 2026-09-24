// Datos académicos: precios, stock y presentaciones de ejemplo, sin valor comercial.
const entries = [
  ['mani', 'Maní', 'Peanuts', 'Alimentos', 'Food', '#A36B43'],
  ['miel', 'Miel de abeja', 'Bee honey', 'Alimentos', 'Food', '#C89535', './src/assets/models/miel.glb'],
  ['harina', 'Harina de trigo', 'Wheat flour', 'Alimentos', 'Food', '#C0A77A'],//faltan agregar las variantes(son tres variantes), los modelos ya estan en la carpeta correspondiente
  ['petitgrain', 'Esencia de petitgrain', 'Petitgrain essence', 'Esencias', 'Essences', '#719B65', './src/assets/models/petitgrain.glb', true],
  ['licor', 'Licor de mandioca', 'Cassava liqueur', 'Bebidas', 'Drinks', '#AF7545', './src/assets/models/licor-mandioca.glb', true],
  ['yuyo', 'Mix de yuyo', 'Herbal mix', 'Hierbas', 'Herbs', '#70864B', './src/assets/models/burrito.glb', true], //faltan agregar las variantes, los modelos ya estan en la carpeta correspondiente
];
export const products = entries.map(([id, es, en, categoryEs, categoryEn, accentColor, model = null, heroFeatured = false], index) => ({
  id, slug: id, name: { es, en }, category: { es: categoryEs, en: categoryEn },
  shortDescription: { es: 'Una propuesta de los grupos de UniNorte. La descripción y presentación final serán proporcionadas por el equipo responsable.', en: 'A proposal from the UniNorte student groups. Final details will be provided by the responsible team.' },
  description: { es: 'Descripción pendiente del grupo responsable.', en: 'Description pending from the responsible group.' },
  basePrice: 10000, baseCurrency: 'PYG', stock: 10,
  image: null, model, accentColor, heroFeatured,
  variants: [{ id: 'demo', name: { es: 'Presentación de ejemplo', en: 'Sample option' }, stock: 10 }],
  brand: { es: 'Empresa por confirmar', en: 'Company to be confirmed' }, featured: index < 3,
}));

// Explicit product/variant associations; files never create products automatically.
const variantModels = {
  harina: [['demo','Tipo 000','Type 000','harinaazul_tipo000.glb'],['tipo-0000','Tipo 0000','Type 0000','harinaroja_tipo0000.glb'],['integral','Integral','Whole wheat','harinamarron_tipointegral.glb']],
  yuyo: [['demo','Burrito','Burrito','burrito.glb'],['cedron','Cedrón','Lemon verbena','cedron.glb'],['menta','Menta','Mint','menta.glb']],
};
for (const [id,variants] of Object.entries(variantModels)) {
  const product=products.find(p=>p.id===id);
  product.variants=variants.map(([id,es,en,file])=>({id,name:{es,en},stock:10,price:null,model3dUrl:`./src/assets/models/${file}`}));
  product.model ||= product.variants[0].model3dUrl;
}
