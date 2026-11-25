/* The 2D scene. Everything on screen is a pure function of
   (distance driven, progress of each chapter), so scrolling back rewinds it. */
import { scenery, widthOf, thief, THIEF_PLACE, TOW_PLACE, CAR_BODY, TRUCK_BODY, WHEELS, wheelArt } from './art.js';

export const Scene = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const GAP = 1300; // road distance between two chapter stops
  const NAMES = ['hero', 'glass', 'collision', 'flood', 'theft', 'roadside', 'arrive'];

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (t, a, b) => clamp((t - a) / (b - a));       // 0→1 while t goes a→b
  const lerp = (a, b, k) => a + (b - a) * k;
  const pop = (k) => 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2; // overshoot ease
  const mod = (v, m) => ((v % m) + m) % m;

  // Sky colour at each stop: clear day ×3, storm, night, clear day ×2
  const SKY = ['#60c3c7', '#60c3c7', '#60c3c7', '#8598ab', '#1e2a4a', '#60c3c7', '#60c3c7'];
  const mix = (a, b, k) => {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], k))).join(',')})`;
  };

  const shield = (id) => `
    <g data-id="${id}" opacity="0">
      <circle r="62" fill="#22c55e" opacity=".22" data-id="${id}-ring"/>
      <path d="M0-50 42-34V4C42 30 22 46 0 54-22 46-42 30-42 4V-34Z" fill="#16a34a" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
      <path data-id="${id}-tick" d="M-19 2-5 16 21-12" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;

  const wheel = (id, spec) => `
    <g data-id="${id}" transform="translate(${spec.x} ${spec.y})">
      <g data-id="${id}-spin">${wheelArt(spec)}</g>
    </g>`;

  const repeat = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');

  /* Countryside backdrop. Each layer is drawn once per period and repeated sideways. */
  const layer = (period, content) =>
    repeat(5, (i) => `<g transform="translate(${(i - 2) * period} 0)">${content}</g>`);

  const CLOUD_PERIOD = 1500, HILL_PERIOD = 1500;
  const clouds = [['cloud-1', 40, -400, 66], ['cloud-3', 520, -440, 92], ['cloud-2', 1060, -370, 58]]
    .map(([name, x, bottom, h]) => scenery(name, x, bottom, h)).join('');

  const hills = [
    scenery('hill-tall', -40, -12, 330), scenery('hill-tall', 780, -12, 265),
    // only the domed top shows; the rest sits below the road
    scenery('hill-round', 480, 800, 1000, 560), scenery('hill-round', 1170, 830, 1000, 600),
  ].join('');

  // A continuous hedge: the two bush pieces alternate edge to edge
  const hedgeParts = Array.from({ length: 16 }, (_, i) => (i % 2 ? ['bushes-right', 56] : ['bushes-left', 74]));
  let hedgeEnd = 0;
  const hedge = hedgeParts.map(([name, h]) => {
    const w = widthOf(name, h), x = hedgeEnd;
    hedgeEnd += w;
    return scenery(name, x, -24, h, w + 2);
  }).join('');
  const PLANT_PERIOD = hedgeEnd;
  const plants = hedge + [
    ['tree-tall', 60, 300], ['bush-yellow-large', 170, 66], ['tree-small', 570, 235], ['bush-yellow-small', 650, 46],
    ['tree-small', 1010, 190], ['bush-yellow-large', 1300, 58], ['tree-tall', 1420, 245], ['bush-yellow-small', 1690, 42],
  ].map(([name, x, h]) => scenery(name, x, -22, h)).join('');

  const markup = () => `
    <rect data-id="sky" x="-4000" y="-4000" width="8000" height="4000"/>
    <circle data-id="sun" cx="260" cy="-460" r="40" fill="#fde047"/>
    <g data-id="clouds">${layer(CLOUD_PERIOD, clouds)}</g>
    <g data-id="hills">${layer(HILL_PERIOD, hills)}</g>
    <g data-id="plants">${layer(PLANT_PERIOD, plants)}</g>
    <rect x="-4000" y="-30" width="8000" height="20" fill="#66a03d"/>
    <rect data-id="shade" x="-4000" y="-4000" width="8000" height="4000" opacity="0"/>
    <circle data-id="moon" cx="260" cy="-460" r="40" fill="#f1f5f9" opacity="0"/>
    <g data-id="stars" fill="#fff" opacity="0">${repeat(40, (i) => `<circle cx="${mod(i * 337, 1800) - 900}" cy="${-390 - mod(i * 131, 320)}" r="${1.5 + (i % 3)}"/>`)}</g>

    <rect x="-4000" y="-12" width="8000" height="4000" fill="#5b5b5b"/>
    <rect x="-4000" y="-12" width="8000" height="8" fill="#7c7c7c"/>
    <g data-id="dashes" fill="#d9d9d9">${repeat(40, (i) => `<rect x="${i * 160 - 3200}" y="34" width="80" height="9" rx="4"/>`)}</g>

    <!-- Props that stay at a fixed place on the road -->
    <g data-id="p-glass">${scenery('tree-tall', 150, -8, 480)}</g>
    <g data-id="p-theft">
      <rect x="236" y="-300" width="10" height="300" fill="#334155"/>
      <path d="M241-300H190" stroke="#334155" stroke-width="10"/>
      <path d="M190-290 90-4H290Z" fill="#fde68a" opacity=".22"/>
      <circle cx="190" cy="-292" r="14" fill="#fde047"/>
    </g>
    <g data-id="p-arrive">${scenery('house', -260, -8, 470)}</g>
    <path data-id="nail" d="M-18-12H8L0-34-4-14H-18Z" fill="#e2e8f0" stroke="#0f172a" stroke-width="2"/>

    <!-- Tow truck: drawn hooked to the car, slides in from ahead -->
    <g data-id="truck" opacity="0">
      <ellipse cx="455" cy="0" rx="270" ry="8" fill="#25282a" opacity=".35"/>
      <g transform="${TOW_PLACE}">${TRUCK_BODY}</g>
      ${wheel('t-front', WHEELS.truckFront)}${wheel('t-rear', WHEELS.truckRear)}
    </g>

    <!-- The car -->
    <g data-id="car">
      <ellipse cy="0" rx="205" ry="8" fill="#25282a" opacity=".35"/>
      <g data-id="body"><g transform="${TOW_PLACE}">${CAR_BODY}</g></g>
      ${wheel('rear', WHEELS.rear)}${wheel('front', WHEELS.front)}
    </g>

    <!-- Thief creeps up behind the car -->
    <g data-id="thief" opacity="0">
      <g transform="${THIEF_PLACE}">${thief()}</g>
    </g>

    <!-- Hazards -->
    <g data-id="branch" opacity="0">
      <path d="M-46 8 44-8" stroke="#6b4a2f" stroke-width="16" stroke-linecap="round"/>
      <path d="M-6 0 12-30M18-4 36 18" stroke="#6b4a2f" stroke-width="8" stroke-linecap="round"/>
      <g fill="#4d9a5f"><circle cx="14" cy="-34" r="13"/><circle cx="40" cy="22" r="11"/><circle cx="-46" cy="4" r="12"/></g>
    </g>
    <g data-id="tyre" opacity="0">
      <circle r="36" fill="#0f172a"/><circle r="17" fill="#94a3b8"/>
      <path d="M-15 0H15M0-15V15" stroke="#334155" stroke-width="5"/>
    </g>
    <g data-id="water" opacity="0">
      <path data-id="wave" fill="#38bdf8" opacity=".72"/>
    </g>
    <path data-id="dome" d="M-215-8C-215-160-120-235 0-235S215-160 215-8" fill="#22c55e" fill-opacity=".12" stroke="#16a34a" stroke-width="7" stroke-dasharray="18 12" opacity="0"/>

    ${shield('s-glass')}${shield('s-collision')}${shield('s-flood')}${shield('s-theft')}${shield('s-roadside')}${shield('s-arrive')}

    <g data-id="rain" stroke="#e0f2fe" stroke-width="3" stroke-linecap="round" opacity="0">${repeat(90, (i) => `<path d="M${mod(i * 197, 1800) - 900} ${-mod(i * 89, 640)}l-8 26"/>`)}</g>
  `;

  function create(svg) {
    svg.innerHTML = markup();
    const el = {};
    svg.querySelectorAll('[data-id]').forEach((n) => { el[n.dataset.id] = n; });

    const set = (id, attrs) => {
      for (const k in attrs) el[id].setAttribute(k, attrs[k]);
    };
    const place = (id, x, y, rotate = 0, scale = 1) =>
      set(id, { transform: `translate(${x} ${y}) rotate(${rotate}) scale(${scale})` });

    // Shield pops in, pulses on impact, draws its tick, then leaves with the drive.
    const guard = (id, t, x, y, from = .2, impact = .36, size = 1) => {
      const inK = span(t, from, from + .09);
      const out = 1 - span(t, .68, .8);
      const hit = Math.sin(Math.PI * span(t, impact, impact + .08));
      set(id, { opacity: Math.min(inK * 2, 1) * out });
      place(id, x, y, 0, Math.max(0, pop(inK)) * size * (1 + hit * .28));
      set(`${id}-ring`, { r: 62 + hit * 34 });
      set(`${id}-tick`, { 'stroke-dashoffset': 1 - span(t, impact + .02, impact + .12) });
    };

    /* d: distance driven. t: { chapterName: 0..1 }. time: ms, for idle motion only. */
    function render(d, t, time = 0) {
      const stop = (name) => NAMES.indexOf(name) * GAP - d;   // x of a stop relative to car
      const near = (name) => clamp(1 - Math.abs(stop(name)) / (GAP * .8));

      // Sky, weather
      const i = clamp(Math.floor(d / GAP), 0, SKY.length - 2);
      set('sky', { fill: mix(SKY[i], SKY[i + 1], clamp(d / GAP - i)) });
      set('stars', { opacity: near('theft') });
      const night = near('theft'), storm = near('flood');
      set('shade', night > storm ? { fill: '#0f172a', opacity: night * .68 } : { fill: '#475569', opacity: storm * .55 });
      set('clouds', { opacity: 1 - night * .75 });
      set('sun', { opacity: (1 - storm) * (1 - night) });
      set('moon', { opacity: night });
      set('rain', { opacity: near('flood') * .85, transform: `translate(0 ${mod(time * .5 + d, 120) - 60})` });

      // Parallax layers
      set('clouds', { transform: `translate(${-mod(d * .06, CLOUD_PERIOD)} 0)` });
      set('hills', { transform: `translate(${-mod(d * .12, HILL_PERIOD)} 0)` });
      set('plants', { transform: `translate(${-mod(d * .4, PLANT_PERIOD)} 0)` });
      set('dashes', { transform: `translate(${-mod(d, 160)} 0)` });

      ['glass', 'theft', 'arrive'].forEach((n) => place(`p-${n}`, stop(n), 0));

      // Car
      const spin = (d / WHEELS.rear.r) * (180 / Math.PI);
      set('rear-spin', { transform: `rotate(${spin})` });
      const bob = Math.sin(d / 38) * 2;
      set('body', { transform: `translate(0 ${bob})` });

      // 1. Branch falls on the side mirror and bounces off the shield
      const g = t.glass;
      const fall = span(g, .24, .36), bounce = span(g, .36, .6);
      const gx = stop('glass');
      guard('s-glass', g, 84, -188, .2, .36, .66);
      set('branch', { opacity: g > .001 && g < .85 ? 1 - span(g, .74, .85) : 0 });
      if (bounce > 0) {
        place('branch', lerp(100, 324, bounce) + (g > .6 ? gx : 0),
          lerp(-242, -14, bounce) - Math.sin(Math.PI * bounce) * 190, 20 + bounce * 250);
      } else {
        place('branch', lerp(136, 100, fall) + gx, lerp(-370, -242, fall * fall), fall * 20);
      }

      // 2. Loose tyre rolls in and bounces off the bumper shield
      const c = t.collision;
      const roll = span(c, .1, .36), back = span(c, .36, .64);
      guard('s-collision', c, 218, -70);
      set('tyre', { opacity: c > .1 && c < .85 ? 1 - span(c, .72, .85) : 0 });
      if (back > 0) {
        place('tyre', lerp(294, 660, back), -36 - Math.abs(Math.sin(Math.PI * back * 2)) * (1 - back) * 190, -back * 500);
      } else {
        place('tyre', lerp(840, 294, roll), -36 - Math.abs(Math.sin(Math.PI * roll * 3)) * 46, -roll * 800);
      }

      // 3. Water rises, protective dome keeps the car safe
      const f = t.flood;
      const rise = span(f, .12, .4) * (1 - span(f, .7, .9));
      const level = -12 - rise * 62;
      const phase = time * .003 + d * .02;
      let wave = `M-1400 80V${level}`;
      for (let x = -1400; x <= 1400; x += 70) wave += `Q${x + 35} ${level + Math.sin(phase + x / 70) * 11} ${x + 70} ${level}`;
      set('wave', { d: `${wave}V80Z` });
      set('water', { opacity: rise > 0 ? 1 : 0 });
      set('dome', { opacity: span(f, .25, .36) * (1 - span(f, .68, .8)), 'stroke-dashoffset': -f * 300 });
      guard('s-flood', f, 0, -238, .26, .4);

      // 4. Thief sneaks up, gets pushed back
      const th = t.theft;
      const sneak = span(th, .08, .36), flee = span(th, .39, .62);
      // Offsets from the character's drawn spot at the rear bumper; leans about his feet
      const tx = flee > 0 ? lerp(-90, -518, flee) : lerp(-538, -90, sneak);
      const lean = flee > 0 ? -16 * Math.sin(Math.PI * Math.min(flee * 1.6, 1)) : 0;
      const hop = -Math.abs(Math.sin(th * 70)) * 8;
      set('thief', {
        opacity: th > .08 && th < .62 ? 1 - span(th, .52, .62) : 0,
        transform: `translate(${tx} ${hop}) rotate(${lean} -228 0)`,
      });
      guard('s-theft', th, -192, -100, .2, .36, .7);

      // 5. Nail, flat tyre, tow truck reverses in, tyre restored, truck drives off
      const r = t.roadside;
      const flat = span(r, .22, .27) * (1 - span(r, .44, .52));
      const { front } = WHEELS;
      set('nail', { opacity: r < .27 ? 1 : 0 });
      place('nail', stop('roadside') + front.x + 10, 0);
      set('front', { transform: `translate(${front.x} ${front.y + flat * 8}) scale(${1 + flat * .14} ${1 - flat * .27})` });
      set('front-spin', { transform: `rotate(${spin})` });
      place('car', 0, 0, flat * 2);
      const arrive = span(r, .27, .42), leave = span(r, .62, .8);
      const truckX = 900 * (1 - arrive) ** 3 + 900 * leave * leave;
      set('truck', { opacity: arrive > 0 && leave < 1 ? 1 : 0 });
      place('truck', truckX, 0);
      // rolls backwards on the way in, forwards on the way out
      ['t-front', 't-rear'].forEach((id) => set(`${id}-spin`, { transform: `rotate(${(truckX / WHEELS.truckRear.r) * (180 / Math.PI)})` }));
      guard('s-roadside', r, 10, -216, .4, .42, .9);

      // 6. Parked at home, shield over the car
      // pops as the car pulls in; tick is complete before it stops (t runs 0→1 on the approach)
      guard('s-arrive', t.arrive * .5, 0, -214, 0, .3, .9);
    }

    return { render };
  }

  return { create, NAMES, GAP, clamp, span };
})();
