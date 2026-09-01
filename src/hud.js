// Thin wrapper over the DOM overlay in index.html.
const $ = (id) => document.getElementById(id);

export function fmt(t) {
  if (t == null) return '--:--.---';
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(3).padStart(6, '0');
  return `${String(m).padStart(2, '0')}:${s}`;
}

export const hud = {
  time(t) {
    $('time').textContent = fmt(t);
  },
  speed(kmh) {
    $('speed').textContent = `${Math.max(0, Math.round(kmh))} km/h`;
  },
  pb(t) {
    $('pb').textContent = t == null ? 'PB  --:--.---' : `PB  ${fmt(t)}`;
  },
  split(d) {
    const el = $('split');
    if (d == null) { el.textContent = ''; return; }
    const sign = d < 0 ? '-' : '+';
    el.textContent = `${sign}${Math.abs(d).toFixed(2)}`;
    el.style.color = d < 0 ? '#3d6' : '#e55';
  },
  msg(html) {
    $('msg').innerHTML = html || '';
  },
};
