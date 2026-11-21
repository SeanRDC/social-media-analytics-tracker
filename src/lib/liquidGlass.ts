/**
 * Geometry of Liquid Glass refraction.
 *
 * A glass bar is a rounded rectangle whose rim curves away like the edge of a
 * thick lens. Light passing through that curved band (the bezel) bends, so
 * near the edge you see content from just beyond the bar, squeezed in; the
 * flat middle shows what is directly behind. That bending is drawn as a
 * displacement map for an SVG feDisplacementMap filter: each pixel says from
 * how far away, and in which direction, to sample the page behind.
 *
 * The map covers the bar grown by `margin` on every side, so there is real
 * content out there to pull in; the result is clipped back to the bar.
 */
export interface LensShape {
  width: number;
  height: number;
  radius: number;
  /** extra content sampled around the bar, in px */
  margin: number;
  /** width of the curved rim, in px */
  bezel: number;
}

/** How quickly the bend builds towards the edge: 1 is linear, higher keeps the middle flatter. */
export const RIM_POWER = 1.8;

/** Signed distance from (x, y) to a rounded rectangle at the origin: negative inside, 0 on the edge. */
function roundedRectDistance(x: number, y: number, w: number, h: number, r: number) {
  const qx = Math.abs(x - w / 2) - (w / 2 - r);
  const qy = Math.abs(y - h / 2) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/**
 * How far to shift the sample at map pixel (x, y), as a unit-scaled vector
 * pointing outwards (0 in the flat middle, up to length 1 at the rim).
 *
 * The rim is shaped like the side of a glass rod: the shift starts from
 * nothing where the curve begins and grows smoothly (t^RIM_POWER) towards the
 * edge, so lines behind the glass curve evenly instead of being crushed into
 * the last pixels (a circular profile, steep at the edge, reads as streaks).
 */
export function displacementAt(x: number, y: number, s: LensShape): [number, number] {
  const { width: w, height: h, margin: m, bezel } = s;
  const r = Math.min(s.radius, w / 2, h / 2);
  const px = x - m;
  const py = y - m;
  const d = roundedRectDistance(px, py, w, h, r);
  const inset = -d;
  if (inset >= bezel) return [0, 0];
  const t = inset <= 0 ? 1 : 1 - inset / bezel;
  const mag = Math.pow(t, RIM_POWER);
  // outward normal: the gradient of the distance field
  const e = 0.5;
  const nx = roundedRectDistance(px + e, py, w, h, r) - roundedRectDistance(px - e, py, w, h, r);
  const ny = roundedRectDistance(px, py + e, w, h, r) - roundedRectDistance(px, py - e, w, h, r);
  const len = Math.hypot(nx, ny) || 1;
  return [(nx / len) * mag, (ny / len) * mag];
}

/** Map size for a shape: the bar plus its margin on every side. */
export const mapSize = (s: LensShape) => ({ width: Math.round(s.width + 2 * s.margin), height: Math.round(s.height + 2 * s.margin) });

/**
 * Paints the displacement map (red = x, green = y, 128 = no shift) and returns
 * it as a PNG data URL for <feImage>. `density` draws it at the screen's pixel
 * ratio so the bend stays smooth on retina screens. Browser only.
 */
export function displacementMapUrl(s: LensShape, density = 1): string {
  const size = mapSize(s);
  const width = Math.round(size.width * density);
  const height = Math.round(size.height * density);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(width, height);
  const px = img.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [dx, dy] = displacementAt((x + 0.5) / density, (y + 0.5) / density, s);
      const i = (y * width + x) * 4;
      px[i] = Math.round(128 + dx * 127);
      px[i + 1] = Math.round(128 + dy * 127);
      px[i + 2] = 128;
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}
