export const TILE = 24;
export const WIDTH = 34;
export const HEIGHT = 31;

export const rooms = [
  { x: 2, y: 22, w: 9, h: 7, area: 0 },
  { x: 12, y: 22, w: 8, h: 7, area: 0 },
  { x: 12, y: 12, w: 8, h: 7, area: 0 },
  { x: 22, y: 13, w: 8, h: 7, area: 1 },
  { x: 22, y: 5, w: 9, h: 6, area: 1 },
  { x: 13, y: 5, w: 8, h: 6, area: 2 },
  { x: 4, y: 5, w: 8, h: 7, area: 2 },
  { x: 4, y: 14, w: 7, h: 6, area: 2 },
];

const center = ([x, y]) => ({ x: (x + .5) * TILE, y: (y + .5) * TILE });
const entrance = [4, 25];
const route = [
  { through: [[8, 25]], enemy: [9, 25] },
  { through: [[14, 25]], enemy: [15, 25] },
  { through: [[16, 25], [16, 16], [15, 16]], enemy: [15, 15] },
  { through: [[23, 16]], enemy: [24, 16] },
  { through: [[26, 16], [26, 8]], enemy: [26, 7] },
  { through: [[18, 8]], enemy: [17, 8], backline: [14, 7] },
  { through: [[8, 8]], enemy: [7, 8] },
  { through: [[7, 8], [7, 16]], enemy: [7, 17] },
];

export const legs = route.map(({ through, enemy, backline }, index) => {
  const tiles = [route[index - 1]?.through.at(-1) ?? entrance, ...through];
  const points = tiles.map(center);
  const segments = points.slice(1).map((end, i) => {
    const start = points[i];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    return { start, length, dx: (end.x - start.x) / length, dy: (end.y - start.y) / length };
  });
  return { tiles, segments, length: segments.reduce((sum, segment) => sum + segment.length, 0), enemy: center(enemy), backline: backline && center(backline) };
});

export function marchPosition(wave, distance) {
  while (distance < 0 && wave > 0) {
    wave--;
    distance += legs[wave].length;
  }
  const leg = legs[wave];
  for (const [index, segment] of leg.segments.entries()) {
    const { start, length, dx, dy } = segment;
    if (distance <= length || index === leg.segments.length - 1) {
      const offset = Math.min(length, distance);
      return { x: start.x + dx * offset, y: start.y + dy * offset, dx, dy };
    }
    distance -= length;
  }
}

export function skeletonPosition(wave, distance, rank) {
  const { x, y, dx, dy } = marchPosition(wave, distance - Math.floor(rank / 2) * 12);
  const side = rank % 2 ? 8 : -8;
  return { x: x + dy * side, y: y - dx * side };
}

export function floorTiles() {
  const tiles = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(-1));
  for (const [index, leg] of legs.entries()) {
    for (const [i, start] of leg.tiles.slice(0, -1).entries()) {
      const end = leg.tiles[i + 1];
      for (let y = Math.min(start[1], end[1]) - 1; y <= Math.max(start[1], end[1]) + 1; y++) {
        for (let x = Math.min(start[0], end[0]) - 1; x <= Math.max(start[0], end[0]) + 1; x++) {
          tiles[y][x] = rooms[index].area;
        }
      }
    }
  }
  for (const { x, y, w, h, area } of rooms) {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) tiles[row][col] = area;
    }
  }
  return tiles;
}
