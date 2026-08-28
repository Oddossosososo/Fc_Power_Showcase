export type Vec3 = { x:number; y:number; z:number };

export function powerScale(ovr:number) {
  const power = Math.max(1, ovr / 99);
  return {
    speed: 0.85 + Math.min(power, 50) * 0.08,
    curve: Math.min(4, 0.75 + Math.pow(power, 0.35)),
    impact: Math.min(10, 1 + Math.pow(power, 0.5)),
    particles: Math.min(1200, Math.floor(60 + Math.pow(power, 0.65) * 45)),
  };
}

export function ballPosition(time:number, ovr:number, phaseOffset=0):Vec3 {
  const p = powerScale(ovr);
  const phase = ((time * p.speed + phaseOffset) % 2);
  const s = phase <= 1 ? phase : 2 - phase;
  const arc = Math.sin(s * Math.PI);
  return {
    x: -3 + s * 6,
    y: -0.8 + arc * p.curve,
    z: Math.sin(s * Math.PI) * Math.min(1.5, p.curve * .28),
  };
}
