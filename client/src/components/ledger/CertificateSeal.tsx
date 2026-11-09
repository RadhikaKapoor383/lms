// The round seal printed on a certificate: a scalloped gold disc with the
// words running round the edge. Colours are fixed (not themed) so the
// certificate looks the same on screen, in print and in dark mode.
export default function CertificateSeal({ size = 120 }: { size?: number }) {
  return (
    <svg
      role="img"
      aria-label="Ledger certified seal"
      width={size}
      height={size}
      viewBox="0 0 150 150"
      className="print:[print-color-adjust:exact]"
    >
      <polygon points="147.0,75.0 140.6,82.4 145.2,91.0 137.3,96.8 139.9,106.2 130.9,110.1 131.3,119.9 121.7,121.7 119.9,131.3 110.1,130.9 106.2,139.9 96.8,137.3 91.0,145.2 82.4,140.6 75.0,147.0 67.6,140.6 59.0,145.2 53.2,137.3 43.8,139.9 39.9,130.9 30.1,131.3 28.3,121.7 18.7,119.9 19.1,110.1 10.1,106.2 12.7,96.8 4.8,91.0 9.4,82.4 3.0,75.0 9.4,67.6 4.8,59.0 12.7,53.2 10.1,43.8 19.1,39.9 18.7,30.1 28.3,28.3 30.1,18.7 39.9,19.1 43.8,10.1 53.2,12.7 59.0,4.8 67.6,9.4 75.0,3.0 82.4,9.4 91.0,4.8 96.8,12.7 106.2,10.1 110.1,19.1 119.9,18.7 121.7,28.3 131.3,30.1 130.9,39.9 139.9,43.8 137.3,53.2 145.2,59.0 140.6,67.6" fill="#D9A441" />
      <circle cx="75" cy="75" r="60" fill="none" stroke="#B9862F" strokeWidth="1.5" />
      <circle cx="75" cy="75" r="40" fill="none" stroke="#B9862F" strokeWidth="1.5" />
      <defs>
        <path id="seal-ring" d="M75,75 m-50,0 a50,50 0 1,1 100,0 a50,50 0 1,1 -100,0" />
      </defs>
      <text fontFamily="sans-serif" fontWeight="600" fontSize="10.5" fill="#0F2E2B">
        <textPath href="#seal-ring" startOffset="0" textLength="306" lengthAdjust="spacing">
          LEDGER &#8226; CERTIFIED COMPLETE &#8226;{" "}
        </textPath>
      </text>
      <text x="75" y="88" textAnchor="middle" fontFamily="serif" fontWeight="600" fontSize="38" fill="#0F2E2B">
        L<tspan fill="#B8563F">.</tspan>
      </text>
    </svg>
  );
}
