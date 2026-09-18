export const productModel = (product, variant) => variant?.model3dUrl || variant?.model || product.model3dUrl || product.model || null;
export const productMedia = (product, variant) => ({ ...product, model: productModel(product,variant), image: variant?.image || product.image });
