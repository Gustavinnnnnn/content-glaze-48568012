/**
 * Deterministic "social proof" numbers for a model.
 * Always >= the real count, never zero, never identical between models.
 */
const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const fakeModelStats = (modelId: string, real?: { posts?: number; photos?: number; videos?: number }) => {
  const h = hash(modelId);
  const postsBase = (h % 180) + 60;          // 60–239
  const photosBase = (h % 90) + 24;          // 24–113
  const videosBase = ((h >> 4) % 45) + 12;   // 12–56
  const likesBase = ((h >> 2) % 18_000) + 4_500; // 4.5k–22.5k

  const posts = Math.max(real?.posts ?? 0, postsBase);
  const photos = Math.max(real?.photos ?? 0, photosBase);
  const videos = Math.max(real?.videos ?? 0, videosBase);
  // Likes scale a bit with content count for realism
  const likes = likesBase + posts * 73 + photos * 41;
  return { posts, photos, videos, likes };
};

export const formatCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}k`;
  return n.toLocaleString("pt-BR");
};
