export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - x1, py - y1);

  const projection = clamp(
    ((px - x1) * dx + (py - y1) * dy) / lengthSquared,
    0,
    1,
  );
  return Math.hypot(
    px - (x1 + projection * dx),
    py - (y1 + projection * dy),
  );
}

export function wrapAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function mustGet<K, V>(map: ReadonlyMap<K, V>, key: K): V {
  if (!map.has(key)) throw new Error(`Missing map entry: ${String(key)}`);
  return map.get(key)!;
}
