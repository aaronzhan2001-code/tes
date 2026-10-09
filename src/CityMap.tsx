import type { Snapshot } from './engine';

function Building({
  x,
  y,
  height,
  tone,
  width = 23,
}: {
  x: number;
  y: number;
  height: number;
  tone: string;
  width?: number;
}) {
  const depth = width * 0.56;
  return (
    <g>
      <path
        d={`M${x},${y} l${width},${depth} l${width},-${depth} l-${width},-${depth} Z`}
        fill="#777b6230"
        transform="translate(9 5)"
      />
      <path d={`M${x},${y} v-${height} l${width},${depth} v${height} Z`} fill={tone} />
      <path
        d={`M${x + width},${y + depth} v-${height} l${width},-${depth} v${height} Z`}
        fill={tone}
        filter="url(#shade)"
      />
      <path
        d={`M${x},${y - height} l${width},-${depth} l${width},${depth} l-${width},${depth} Z`}
        fill="#eff0df"
      />
      {Array.from({ length: Math.floor(height / 12) }, (_, floor) => (
        <g key={floor} opacity=".65">
          <path
            d={`M${x + 6},${y - height + 11 + floor * 12} l10,5.6`}
            stroke="#eff8e9"
            strokeWidth="3.3"
          />
          <path
            d={`M${x + width + 7},${y - height + depth + 6 + floor * 12} l10,-5.6`}
            stroke="#304c50"
            strokeWidth="3.3"
          />
        </g>
      ))}
    </g>
  );
}
function Tree({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <ellipse cy="3" rx="12" ry="6" fill="#4d675e15" />
      <path d="M0 0 V-15" stroke="#7d7058" strokeWidth="3" />
      <ellipse cy="-19" rx="11" ry="15" fill="#729675" />
      <ellipse cx="-3" cy="-22" rx="7" ry="11" fill="#91ad80" />
    </g>
  );
}
export default function CityMap({ snapshot }: { snapshot: Snapshot }) {
  const green = Math.floor(snapshot.environment / 9);
  const density = Math.max(0, Math.floor((snapshot.population - 128000) / 9000));
  const buildings = [
    [304, 147, 36, '#9da99e'],
    [363, 179, 58, '#8ba9a5'],
    [425, 215, 42, '#c4ba9e'],
    [241, 183, 50, '#8eaaa4'],
    [300, 216, 82, '#7c9a96'],
    [362, 251, 61, '#9da99e'],
    [425, 287, 34, '#c6b394'],
    [175, 220, 27, '#bbb39d'],
    [236, 253, 38, '#c9bb9b'],
    [299, 288, 108, '#72918d'],
    [361, 323, 54, '#a7b09e'],
    [174, 291, 32, '#a5b4a5'],
    [236, 326, 65, '#899eaa'],
    [298, 359, 44, '#b9b097'],
    [425, 358, 33, '#a6b49e'],
    [365, 394, 45, '#a0aba2'],
  ] as const;
  return (
    <svg
      className="city-map"
      viewBox="0 0 640 475"
      role="img"
      aria-label={`${snapshot.year} 年的城市，环境指数 ${snapshot.environment}，人口 ${snapshot.population}`}
    >
      <defs>
        <filter id="shade">
          <feColorMatrix type="matrix" values=".82 0 0 0 0  0 .86 0 0 0  0 0 .86 0 0  0 0 0 1 0" />
        </filter>
        <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e4e9d6" />
          <stop offset="1" stopColor="#eae8d5" />
        </linearGradient>
        <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".8" fill="#d7ddcd" />
        </pattern>
      </defs>
      <rect width="640" height="475" fill="url(#dots)" />
      <g className="map-island">
        <path d="M320 97L578 242 320 450 62 303Z" fill="#d9dfce" transform="translate(0 9)" />
        <path d="M320 87L578 232 320 440 62 293Z" fill="url(#land)" />
        <path
          d="M70 280 C150 245 143 346 252 365 S355 427 395 392 L363 427 C316 429 292 394 230 391 S139 331 62 293Z"
          fill="#b7d4ce"
        />
        <path
          d="M73 284 C150 252 145 350 247 371 S352 424 385 399"
          fill="none"
          stroke="#d9eeea"
          strokeWidth="3"
        />
        <g stroke="#f8f8ec" strokeWidth="16" fill="none">
          <path d="M253 125L511 271M191 161L454 310M128 198L392 346M321 125L124 240M385 161L160 291M446 197L220 329M511 235L284 366" />
        </g>
        <g stroke="#c0c5b5" strokeWidth="1" strokeDasharray="4 7" opacity=".7">
          <path d="M190 161L454 310M385 161L160 291M446 197L220 329" />
        </g>
        <path
          d="M125 201L320 310 449 235"
          fill="none"
          stroke={snapshot.policy.transit > 65 ? '#638d79' : '#c5bda0'}
          strokeWidth="3"
        />
        <g transform="translate(147 199)">
          <rect width="28" height="10" rx="3" fill="#f7d67b" transform="rotate(30)" />
          <rect x="4" y="1" width="15" height="3" fill="#5c7972" transform="rotate(30)" />
        </g>
        <path d="M466 286l46 26-39 23-46-26z" fill="#b7cba0" />
        <path d="M466 293l31 18-25 15-31-18z" fill="none" stroke="#e4efdb" strokeWidth="1.4" />
        {[...Array(5 + green)].map((_, i) => (
          <Tree
            key={`back-${i}`}
            x={465 + (i % 3) * 18 - Math.floor(i / 3) * 15}
            y={253 + Math.floor(i / 3) * 17 + (i % 3) * 10}
            size={0.75}
          />
        ))}
        {buildings.map(([x, y, height, tone], i) => (
          <Building
            key={i}
            x={x}
            y={y}
            height={height + Math.min(density, 5) * (i % 3 === 0 ? 7 : 2)}
            tone={tone}
          />
        ))}
        <Building x={112} y={253} height={22} tone="#d1c195" width={20} />
        <path d="M106 229l27-18 28 24-22 15z" fill="#728d74" />
        {snapshot.policy.green > 60 && (
          <g stroke="#7f9c9d" strokeWidth="2" fill="none">
            <path d="M495 204v-32m0 0l-12-8m12 8l14-7m-14 7v-16" />
            <path d="M520 217v-32m0 0l-12-8m12 8l14-7m-14 7v-16" />
          </g>
        )}
        {Array.from({ length: 4 + green }, (_, i) => (
          <Tree
            key={`front-${i}`}
            x={154 + (i % 5) * 33}
            y={324 + (i % 5) * 18 + Math.floor(i / 5) * 28}
            size={0.75 + (i % 2) * 0.15}
          />
        ))}
        <g transform="translate(332 337)">
          <path d="M0 18V-26" stroke="#819385" strokeWidth="2" />
          <path d="M1-26h22v13H1z" fill="#d6e97b" />
        </g>
      </g>
      <g className="map-label" transform="translate(79 114)">
        <rect width="106" height="28" rx="14" fill="#fffff5" stroke="#e0e5d5" />
        <circle cx="14" cy="14" r="3" fill="#739782" />
        <text x="24" y="18">
          北岸生态公园
        </text>
        <path d="M87 30l26 49" stroke="#94a28d" strokeDasharray="3 4" />
      </g>
      <g className="map-label" transform="translate(430 113)">
        <rect width="105" height="28" rx="14" fill="#fffff5" stroke="#e0e5d5" />
        <text x="14" y="18">
          中央创新街区
        </text>
        <path d="M15 30l-20 43" stroke="#94a28d" strokeDasharray="3 4" />
      </g>
      <g transform="translate(565 387)" stroke="#859386" fill="none">
        <path d="M0 23V0l-5 8m5-8 5 8" />
        <text x="-4" y="-8" stroke="none" fill="#859386" fontSize="10">
          N
        </text>
      </g>
    </svg>
  );
}
