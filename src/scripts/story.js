/* Scroll scrubbing: map scroll position to the scene's timeline. */
import { Scene } from './scene.js';

(() => {
  const { NAMES, GAP, clamp, create } = Scene;
  const story = document.getElementById('story');
  const chapters = [...story.querySelectorAll('.chapter')];
  const svg = document.getElementById('scene');
  const bar = document.getElementById('progress');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const DEPART = .66;  // a chapter's car leaves at this point of its scroll
  const ARRIVE = .12;  // ...and reaches the next stop at this point of the next one
  const PARK = .3;     // the finale plays over the last 30% of a screen before the last section fills it
  const LAST = NAMES.length - 1;
  // Where the prev/next buttons stop: each scene played out, its card still in place
  const REST = { glass: .52, collision: .52, flood: .52, theft: .5, roadside: .55 };
  const PROTECTED = { glass: .4, collision: .4, flood: .42, theft: .4, roadside: .52 };

  /* Camera. Upright phones and tablets are too narrow to hold every hazard at one framing,
     so each stop has its own shot: [horizontal centre, zoom out]. */
  const compact = window.matchMedia('(max-width: 1024px) and (orientation: portrait)');
  const SHOTS = { hero: [0, 1], glass: [30, 1], collision: [40, 1.05], flood: [0, 1], theft: [-80, 1.05], roadside: [256, 1.66], arrive: [0, 1] };

  // Wider screens: [where the car sits across the view, zoom out]. The tow truck needs room ahead.
  const wideShot = (name, height) => (name === 'roadside' ? [.5, 1.32] : [height <= 500 ? .72 : .66, 1]);

  const shotAt = (d, shotFor) => {
    const i = Math.min(Math.floor(d / GAP), NAMES.length - 2);
    const k = clamp(d / GAP - i);
    const a = shotFor(NAMES[i]), b = shotFor(NAMES[i + 1]);
    return a.map((v, n) => v + (b[n] - v) * k);
  };

  function frame(target, width, height, d) {
    let x, w, h, road;
    if (compact.matches) {
      const [centre, zoom] = shotAt(d, (name) => SHOTS[name]);
      const scale = Math.min(width / 580, height / 1000) / zoom;
      w = width / scale; h = height / scale;
      x = centre - w / 2;
      road = 150 * zoom;                      // clear of the phone's bottom toolbar
    } else {
      const [carAt, zoom] = shotAt(d, (name) => wideShot(name, height));
      const scale = Math.min(width / 1100, height / 680) / zoom;
      w = width / scale; h = height / scale;
      x = -w * carAt;                         // car sits right of the text card
      road = 130 * zoom;                      // road visible under the wheels
    }
    target.setAttribute('viewBox', `${x} ${-(h - road)} ${w} ${h}`);
  }

  /* Still pictures for people who prefer reduced motion. */
  function showStills() {
    document.documentElement.classList.add('reduced');
    chapters.forEach((section, i) => {
      const still = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      still.classList.add('snapshot');
      still.setAttribute('aria-hidden', 'true');
      section.appendChild(still);
      const t = Object.fromEntries(NAMES.map((n) => [n, 0]));
      t[NAMES[i]] = i === LAST ? 1 : .5;
      create(still).render(i * GAP, t);
      still.setAttribute('viewBox', NAMES[i] === 'roadside' ? '-480 -560 1240 640' : '-470 -510 850 590');
    });
  }

  function startScrub() {
    const scene = create(svg);
    let metrics = [];
    let current = null;
    let last = '';

    const cards = chapters.map((c) => c.querySelector('.card'));
    let fades = [];

    /* A card fades as its chapter ends and pushes it up from its resting height. */
    const fadeCards = () => {
      // every card but the last, which stays solid as the page moves on
      cards.slice(0, LAST).map((card) => card.getBoundingClientRect().top).forEach((top, i) => {
        const { rest, distance } = fades[i];
        const opacity = String(Math.round(clamp(1 - (rest - top) / distance) * 100) / 100);
        if (cards[i].style.opacity !== opacity) {
          cards[i].style.opacity = opacity;
          cards[i].style.pointerEvents = opacity === '0' ? 'none' : '';
        }
      });
    };

    const measure = () => {
      const navHeight = document.querySelector('.nav').offsetHeight;
      fades = cards.map((card) => {
        const rest = parseFloat(getComputedStyle(card).top);
        // gone by the time it reaches the top bar; short screens get a minimum run
        return { rest, distance: Math.max(rest - navHeight, card.offsetHeight * .6) };
      });
      metrics = chapters.map((c) => ({ top: c.getBoundingClientRect().top + scrollY, height: c.offsetHeight }));
      last = '';
    };

    const distanceAt = (y) => {
      for (let i = metrics.length - 1; i > 0; i--) {
        const from = metrics[i - 1].top + metrics[i - 1].height * (i === 1 ? .04 : DEPART);
        // the car is home exactly when the last section fills the screen
        const to = metrics[i].top + (i === LAST ? 0 : metrics[i].height * ARRIVE);
        if (y > from) {
          const k = clamp((y - from) / (to - from));
          return (i - 1 + k * k * (3 - 2 * k)) * GAP;
        }
      }
      return 0;
    };

    const draw = (time) => {
      const d = distanceAt(current);
      const t = {};
      metrics.forEach((m, i) => { t[NAMES[i]] = clamp((current - m.top) / m.height); });
      // The last section ends the story, so its animation runs on the way in
      const run = metrics[LAST].height * PARK;
      t[NAMES[LAST]] = clamp((current - metrics[LAST].top + run) / run);

      // Only redraw when something changed (rain and water also move on their own).
      const raining = Math.abs(d - NAMES.indexOf('flood') * GAP) < GAP * .8;
      const key = `${current}`;
      const visible = story.getBoundingClientRect().bottom > 0;
      if (visible && (key !== last || raining)) {
        frame(svg, svg.clientWidth, svg.clientHeight, d);
        scene.render(d, t, time);
        chapters.forEach((c, i) => c.classList.toggle('is-protected', t[NAMES[i]] >= PROTECTED[NAMES[i]]));
        last = key;
      }
      // story progress: full when the last section fills the screen
      bar.style.transform = `scaleX(${clamp(scrollY / metrics[LAST].top)})`;
    };

    const tick = (time) => {
      // Ease small scroll steps. Big leaps (Home/End keys, back button) snap instead of fast-forwarding.
      const leap = current === null || Math.abs(scrollY - current) > innerHeight * 1.5;
      current = leap ? scrollY : current + (scrollY - current) * .16;
      if (Math.abs(scrollY - current) < .5) current = scrollY;
      draw(time);
      fadeCards();
      requestAnimationFrame(tick);
    };

    /* Prev/next and "Compare plans" scroll at a pace where the animation can be followed. */
    let gliding = 0;
    const stopGlide = () => { cancelAnimationFrame(gliding); gliding = 0; };
    // the visitor takes over as soon as they scroll, touch or press a key
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((type) => addEventListener(type, stopGlide, { passive: true }));

    const glideTo = (end) => {
      stopGlide();
      const from = scrollY;
      const to = Math.min(end, document.documentElement.scrollHeight - innerHeight);
      // about a second per screen, within limits
      const duration = Math.min(3200, Math.max(700, Math.abs(to - from) / innerHeight * 1000));
      const began = performance.now();
      const step = (now) => {
        const k = clamp((now - began) / duration);
        scrollTo({ top: from + (to - from) * (1 - Math.cos(Math.PI * k)) / 2, behavior: 'instant' });
        gliding = k < 1 ? requestAnimationFrame(step) : 0;
      };
      gliding = requestAnimationFrame(step);
    };

    /* Scroll position for a link target. */
    const positionOf = (target, played) => {
      const i = chapters.indexOf(target);
      if (i < 0) return target.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
      if (i === 0 || i === LAST) return metrics[i].top;
      // menu links open a scene as the car arrives; prev/next land after it has played
      return metrics[i].top + metrics[i].height * (played ? REST[NAMES[i]] : ARRIVE);
    };

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      e.preventDefault();
      if (location.hash !== link.hash) history.pushState(null, '', link.hash);
      if ('scroll' in link.dataset) {
        glideTo(positionOf(target, true));
      } else {
        // menu and other links go straight there, skipping the story animation
        stopGlide();
        scrollTo({ top: positionOf(target, false), behavior: 'instant' });
        current = scrollY;
        draw(performance.now());
        fadeCards();
      }
      // Keep keyboard users at the destination, as a native anchor jump would.
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });

    new ResizeObserver(measure).observe(document.body);
    measure();
    requestAnimationFrame(tick);
  }

  if (motionQuery.matches) showStills(); else startScrub();
  motionQuery.addEventListener('change', () => location.reload());

})();
