/**
 * Returns a "social-proof" view count: never below ~1k, never above ~20k floor,
 * but always >= the real count. Deterministic per video id so it doesn't jump.
 */
export const displayViews = (videoId: string, real: number) => {
  let h = 0;
  for (let i = 0; i < videoId.length; i++) h = (h * 31 + videoId.charCodeAt(i)) | 0;
  const seeded = (Math.abs(h) % 19_000) + 1_000; // 1.000 – 19.999
  return Math.max(real, seeded);
};

export const formatViews = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}k`;
  return n.toLocaleString("pt-BR");
};
