// DOM overlay: three screens (menu / race hud / finish card) + value setters.
const $ = (id) => document.getElementById(id);

export function fmt(t) {
  if (t == null) return '--:--.---';
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(3).padStart(6, '0');
  return `${String(m).padStart(2, '0')}:${s}`;
}
const signed = (d, dp = 2) => (d < 0 ? '-' : '+') + Math.abs(d).toFixed(dp);

export const hud = {
  screen(name) {
    // 'menu' | 'race' | 'finish'
    $('menu').classList.toggle('show', name === 'menu');
    $('finish').classList.toggle('show', name === 'finish');
    $('hud').classList.toggle('show', name === 'race');
  },

  time(t) {
    $('time').textContent = fmt(t);
  },
  speed(kmh) {
    $('speed').textContent = Math.max(0, Math.round(kmh));
  },
  pb(t) {
    $('pb').textContent = `PB ${fmt(t)}`;
  },
  split(d) {
    const el = $('split');
    if (d == null) { el.textContent = ''; return; }
    el.textContent = signed(d);
    el.style.color = d < 0 ? 'var(--good)' : 'var(--bad)';
  },
  tip(text) {
    const el = $('tip');
    if (text) { el.textContent = text; el.hidden = false; } else el.hidden = true;
  },

  menuTrack(name) {
    $('menu-track').textContent = name;
  },

  finish({ track, time, isPB, pbTime, delta }) {
    $('f-track').textContent = track;
    const head = $('f-head');
    head.textContent = isPB ? 'NEW PERSONAL BEST' : 'FINISH';
    head.classList.toggle('pb', isPB);
    $('f-time').textContent = fmt(time);

    const cmp = $('f-cmp');
    if (delta == null) {
      cmp.textContent = 'first clean run';
      cmp.style.color = 'var(--ink-soft)';
    } else {
      cmp.textContent = `PB ${fmt(pbTime)}   (${signed(delta, 3)})`;
      cmp.style.color = delta < 0 ? 'var(--good)' : 'var(--bad)';
    }
  },
};
