import styles from './TigerLogo.module.scss';

const mirror = (points: string) =>
  points.split(' ').map((pt) => { const [x, y] = pt.split(','); return `${128 - Number(x)},${y}`; }).join(' ');

function Both({ p, f, o = 1 }: { p: string; f: string; o?: number }) {
  return (
    <>
      <polygon points={p} fill={f} fillOpacity={o} />
      <polygon points={mirror(p)} fill={f} fillOpacity={o} />
    </>
  );
}

const LEFT: [number, number][] = [[64, 18], [46, 20], [28, 34], [16, 58], [20, 84], [36, 104], [52, 114], [64, 117]];
const RIGHT = LEFT.slice(1, -1).reverse().map(([x, y]) => [128 - x, y] as [number, number]);
const OUTLINE = [...LEFT, ...RIGHT].map(([x, y]) => `${x},${y}`).join(' ');

function Eye() {
  return (
    <g className={styles.blink}>
      <polygon points="33,58 46,49 59,58 46,65" fill="#120A04" />
      <g className={styles.glow}><polygon points="46,52 50.5,58 46,63.5 41.5,58" fill="#34D399" /></g>
      <polygon points="45,55 47,55 47,61 45,61" fill="#04110B" />
      <polygon points="47.5,54 49.2,54 48.6,56.2" fill="#fff" />
    </g>
  );
}

interface TigerLogoProps { size?: number; animated?: boolean; decorative?: boolean }

/** Geometrik (low-poly) yo'lbars belgisi. */
export function TigerLogo({ size = 64, animated = true, decorative = false }: TigerLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      className={animated ? styles.animated : undefined}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'GitZone yo‘lbars logosi' })}
    >
      <Both p="20,10 50,22 24,44" f="#E8940F" />
      <Both p="26,20 42,27 29,37" f="#2A1A0A" />
      <polygon points={OUTLINE} fill="#FFB020" />
      <Both p="64,18 46,20 64,46" f="#fff" o={0.25} />
      <Both p="46,20 28,34 40,50" f="#fff" o={0.08} />
      <Both p="28,34 16,58 34,56" f="#7A3E00" o={0.22} />
      <Both p="40,50 54,58 64,46" f="#fff" o={0.2} />
      <Both p="16,58 20,84 34,66" f="#7A3E00" o={0.28} />
      <Both p="34,66 20,84 36,104 46,90" f="#fff" o={0.1} />
      <Both p="36,104 52,114 46,90" f="#7A3E00" o={0.15} />
      <Both p="64,66 52,74 44,90 52,106 64,114" f="#FFF4DC" />
      <Both p="22,78 34,70 46,90 36,100" f="#FFF1D6" o={0.9} />
      <Both p="46,22 55,38 44,36" f="#120A04" />
      <Both p="32,32 46,48 33,46" f="#120A04" />
      <Both p="15,60 34,66 17,71" f="#120A04" />
      <Both p="18,78 34,80 24,92" f="#120A04" />
      <polygon points="64,20 58,34 64,48 70,34" fill="#120A04" />
      <Eye />
      <g transform="matrix(-1 0 0 1 128 0)"><Eye /></g>
      <polygon points="56,75 72,75 64,86" fill="#E8867F" />
      <polyline points="64,86 64,93 54,99" fill="none" stroke="#120A04" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points="64,86 64,93 74,99" fill="none" stroke="#120A04" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function BrandLogo({ size = 40, fontSize = 26 }: { size?: number; fontSize?: number }) {
  return (
    <span className={styles.brand}>
      <TigerLogo size={size} decorative />
      <span className={styles.word} style={{ fontSize }}>Git<span className={styles.zone}>Zone</span></span>
    </span>
  );
}
