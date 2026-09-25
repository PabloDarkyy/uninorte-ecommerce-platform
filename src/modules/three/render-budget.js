// Limit backing buffers (including the full-screen flight) on high-DPR phones.
export function sizeProductRenderer(renderer, width, height) {
  const mobile = matchMedia('(pointer: coarse)').matches;
  const gl = renderer.getContext();
  const limit = Math.min(renderer.capabilities.maxTextureSize, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
  const ratio = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2,
    Math.sqrt((mobile ? 2_000_000 : 8_000_000) / Math.max(1, width * height)),
    limit / Math.max(1, width, height));
  renderer.transmissionResolutionScale = mobile ? 0.5 : 1;
  // Reset the old size first to avoid an intermediate oversized allocation.
  renderer.setSize(1, 1, false);
  renderer.setPixelRatio(ratio);
  renderer.setSize(width, height, false);
}
