// Defined once for the whole page: a tiny roughening of edges so stamps look
// inked on paper. It draws nothing by itself.
export default function StampFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="pointer-events-none absolute">
      <filter id="ink-rough">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" />
      </filter>
    </svg>
  );
}
