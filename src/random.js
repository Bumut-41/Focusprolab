let seed = 1_234_567_89;

export function resetSeed() {
  seed = 1_234_567_89;
}

export function seededRandom() {
  seed = (1_664_525 * seed + 1_013_904_223) % 4_294_967_296;
  return seed / 4_294_967_296;
}

export function pickSeeded(arr) {
  return arr[Math.floor(seededRandom() * arr.length)];
}

export function pickTargetRandom(arr) {
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    const u = new Uint32Array(1);
    c.getRandomValues(u);
    return arr[u[0] % arr.length];
  }
  return arr[Math.floor(Math.random() * arr.length)];
}
