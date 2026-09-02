// Tiny top-down SVG of a track's block layout, for the track-select cards.
import { GRID } from './config.js';

export function minimapSVG(blocks, startCell, finishCell) {
  const C = GRID.CELL;
  const xs = blocks.map((b) => b.cell[0]);
  const zs = blocks.map((b) => b.cell[2]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const pad = C * 0.6;
  const w = (maxX - minX + 1) * C;
  const h = (maxZ - minZ + 1) * C;

  const px = (cx) => (cx - minX) * C;
  const pz = (cz) => (maxZ - cz) * C; // flip: start (low z) ends up at the bottom

  const rects = blocks
    .filter((b) => b.type !== 'gap')
    .map((b) => `<rect x="${px(b.cell[0])}" y="${pz(b.cell[2])}" width="${C}" height="${C}" rx="1.5" fill="#eef2ff"/>`)
    .join('');
  const dot = (cell, color) =>
    `<circle cx="${px(cell[0]) + C / 2}" cy="${pz(cell[2]) + C / 2}" r="${C * 0.34}" fill="${color}"/>`;

  return `<svg viewBox="${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">${rects}${dot(startCell, '#54e08a')}${dot(finishCell, '#ff6b5e')}</svg>`;
}
