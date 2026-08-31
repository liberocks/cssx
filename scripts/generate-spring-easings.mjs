const SAMPLE_INTERVAL_SECONDS = 0.03;

const springs = {
  snappy: { stiffness: 300, damping: 22, mass: 1, duration: 0.45 },
  gentle: { stiffness: 170, damping: 26, mass: 1, duration: 0.6 },
  bouncy: { stiffness: 240, damping: 14, mass: 1, duration: 0.75 },
  soft: { stiffness: 120, damping: 24, mass: 1, duration: 0.75 },
};

/** Returns an underdamped or critically damped unit-step spring response. */
function springResponse(time, { stiffness, damping, mass }) {
  const angularFrequency = Math.sqrt(stiffness / mass);
  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
  if (dampingRatio >= 1) {
    return 1 - Math.exp(-angularFrequency * time) * (1 + angularFrequency * time);
  }
  const dampedFrequency = angularFrequency * Math.sqrt(1 - dampingRatio ** 2);
  return (
    1 -
    Math.exp(-dampingRatio * angularFrequency * time) *
      (Math.cos(dampedFrequency * time) +
        ((dampingRatio * angularFrequency) / dampedFrequency) * Math.sin(dampedFrequency * time))
  );
}

/** Formats one number with deterministic four-decimal rounding. */
function format(number) {
  return Number(number.toFixed(4)).toString();
}

/** Samples one physical spring as a normalized CSS linear() easing. */
function springEasing(parameters) {
  const sampleCount = Math.max(2, Math.ceil(parameters.duration / SAMPLE_INTERVAL_SECONDS) + 1);
  const endpoint = springResponse(parameters.duration, parameters);
  const stops = Array.from({ length: sampleCount }, (_, index) => {
    const progress = index / (sampleCount - 1);
    const value = springResponse(parameters.duration * progress, parameters) / endpoint;
    if (index === 0) return '0';
    if (index === sampleCount - 1) return '1';
    return `${format(value)} ${format(progress * 100)}%`;
  });
  return `linear(${stops.join(', ')})`;
}

for (const [name, parameters] of Object.entries(springs)) {
  console.log(`'--ease-spring-${name}': '${springEasing(parameters)}',`);
}
