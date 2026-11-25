/* Artwork from public/assets. */
const assets = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/assets/`;
const image = (path, x, y, width, height, extra = '') =>
  `<image href="${assets}${path}.svg" x="${x}" y="${y}" width="${width}" height="${height}" ${extra}/>`;

/* The thief (extracted/) keeps its position in the original illustration, which
   faced left, so it is mirrored and scaled to stand by the car. */
export const thief = () => image('extracted/man-thief', 915, 520, 345, 400);
export const THIEF_PLACE = `scale(${-34 / 75} ${34 / 75}) translate(-631.5 -919)`;

/* Scenery (house/): width and height of each file's viewBox. */
const SIZE = {
  house: [1042.6, 940.4],
  'tree-tall': [365, 682],
  'tree-small': [235, 598],
  'hill-tall': [1593, 668],
  'hill-round': [296, 674],
  'bushes-left': [453.9, 314.9],
  'bushes-right': [408.3, 183.8],
  'bush-yellow-large': [301.4, 191.6],
  'bush-yellow-small': [229, 101.3],
  'cloud-1': [404.3, 156],
  'cloud-2': [348.9, 144.2],
  'cloud-3': [521.1, 225.3],
};

export const widthOf = (name, height) => height * SIZE[name][0] / SIZE[name][1];

/* Stand a piece of scenery with its left edge at x and its base at `bottom`.
   Pass a width to stretch it. */
export const scenery = (name, x, bottom, height, width = widthOf(name, height)) =>
  image(`house/${name}`, x, bottom - height, width, height, 'preserveAspectRatio="none"');

/* Car and tow truck (tow/). One drawing, so they share a transform and the
   truck lines up hooked to the car. The art faces left, so it is mirrored. */
const SCALE = .14, MID = 5069.5, GROUND = 1811;
export const TOW_PLACE = `scale(${-SCALE} ${SCALE}) translate(${-MID} ${-GROUND})`;

export const CAR_BODY = image('tow/car-body', 3717, 720.1, 2765.7, 936.5);
export const TRUCK_BODY = image('tow/truck', 0, 0, 3731.3, 1552.2);

/* Wheel hubs in scene units: x from the car's centre, y from the ground. */
const hub = (name, x, y, r) => ({ name, x: (MID - x) * SCALE, y: (y - GROUND) * SCALE, r: r * SCALE });
export const WHEELS = {
  front: hub('wheel-car-front', 4182, 1587, 233),
  rear: hub('wheel-car-rear', 5964, 1587, 233),
  truckFront: hub('wheel-truck-front', 728, 1527, 281),
  truckRear: hub('wheel-truck-rear', 2708, 1507, 303),
};
export const wheelArt = ({ name, r }) => image(`tow/${name}`, -r, -r, 2 * r, 2 * r);
