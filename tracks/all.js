// Track registry. Tracks are .js modules (not fetched JSON) so the game runs
// from any host AND straight off disk (file://) on a locked-down machine.
// Add a track: make ./NN-name.js with `export default { ... }`, import it here.
import warmup from './01-warmup.js';

export const TRACKS = {
  '01-warmup': warmup,
};

export const DEFAULT_TRACK = '01-warmup';
