export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, value: number): number {
  return (value - a) / (b - a);
}

export function remap(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  const t = inverseLerp(fromMin, fromMax, value);
  return lerp(toMin, toMax, t);
}

export function nearestPowerOfTwo(value: number): number {
  return Math.pow(2, Math.ceil(Math.log2(value)));
}

export function isPowerOfTwo(value: number): boolean {
  return (value & (value - 1)) === 0 && value !== 0;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Mat4 {
  readonly m: Float32Array;
}

export const Vec2 = {
  create(x = 0, y = 0): Vec2 {
    return { x, y };
  },

  add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
  },

  sub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
  },

  mul(v: Vec2, scalar: number): Vec2 {
    return { x: v.x * scalar, y: v.y * scalar };
  },

  div(v: Vec2, scalar: number): Vec2 {
    return { x: v.x / scalar, y: v.y / scalar };
  },

  length(v: Vec2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },

  normalize(v: Vec2): Vec2 {
    const len = Vec2.length(v);
    return len > 0 ? Vec2.div(v, len) : { x: 0, y: 0 };
  },

  dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
  },

  distance(a: Vec2, b: Vec2): number {
    return Vec2.length(Vec2.sub(b, a));
  },

  lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
    };
  },
};

export const Mat4 = {
  create(): Mat4 {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return { m };
  },

  ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
    const m = new Float32Array(16);
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);

    m[0] = -2 * lr;
    m[5] = -2 * bt;
    m[10] = 2 * nf;
    m[12] = (left + right) * lr;
    m[13] = (top + bottom) * bt;
    m[14] = (far + near) * nf;
    m[15] = 1;

    return { m };
  },

  translate(out: Mat4, v: Vec3): Mat4 {
    const m = out.m;
    m[12] = m[0]! * v.x + m[4]! * v.y + m[8]! * v.z + m[12]!;
    m[13] = m[1]! * v.x + m[5]! * v.y + m[9]! * v.z + m[13]!;
    m[14] = m[2]! * v.x + m[6]! * v.y + m[10]! * v.z + m[14]!;
    m[15] = m[3]! * v.x + m[7]! * v.y + m[11]! * v.z + m[15]!;
    return out;
  },

  scale(out: Mat4, v: Vec3): Mat4 {
    const m = out.m;
    m[0] = m[0]! * v.x;
    m[1] = m[1]! * v.x;
    m[2] = m[2]! * v.x;
    m[3] = m[3]! * v.x;
    m[4] = m[4]! * v.y;
    m[5] = m[5]! * v.y;
    m[6] = m[6]! * v.y;
    m[7] = m[7]! * v.y;
    m[8] = m[8]! * v.z;
    m[9] = m[9]! * v.z;
    m[10] = m[10]! * v.z;
    m[11] = m[11]! * v.z;
    return out;
  },
};

export function douglasPeucker(points: Vec2[], tolerance: number): Vec2[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let maxIndex = 0;

  const first = points[0]!;
  const last = points[points.length - 1]!;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i]!, first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDistance(point: Vec2, lineStart: Vec2, lineEnd: Vec2): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx === 0 && dy === 0) {
    return Vec2.distance(point, lineStart);
  }

  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
  const closestPoint = {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  };

  return Vec2.distance(point, closestPoint);
}