export const digits = (s: string) => (s || '').replace(/\D/g, '');
export const formatCode = (c: string) =>
  [c.slice(0, 4), c.slice(4, 6), c.slice(6, 9), c.slice(9)].filter(Boolean).join(' ');
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
