// Resolve legacy /src/assets/x.jpg paths (used in seed data) to bundled imports.
// Once admins upload real images, these will be full URLs and pass through unchanged.
const assets = import.meta.glob("/src/assets/*.{jpg,png,webp,jpeg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export function resolveImage(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/src/assets/")) {
    return assets[path] ?? path;
  }
  return path;
}
