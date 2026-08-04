"use client";

import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";
import { HAXBALL_FIELD, type HaxballMapDefinition } from "@/app/games/haxball/constants";

interface HaxballMapPreviewProps {
  map: HaxballMapDefinition;
  compact?: boolean;
}

const accentColors = {
  amber: "#ff8a3d",
  cyan: "#59d6e9",
  orange: "#f59e0b",
  blue: "#79aef7",
} as const;

export default function HaxballMapPreview({ map, compact = false }: HaxballMapPreviewProps) {
  const { lang } = useLang();
  const accent = accentColors[map.accent];
  const width = compact ? 180 : 420;
  const height = compact ? 92 : 180;
  const scaleX = width / HAXBALL_FIELD.width;
  const scaleY = height / HAXBALL_FIELD.height;
  const goalY = (HAXBALL_FIELD.height - HAXBALL_FIELD.goalWidth) * scaleY / 2;
  const goalHeight = HAXBALL_FIELD.goalWidth * scaleY;

  return (
    <svg
      className="haxball-map-preview"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${t(lang, `haxball.maps.${map.nameKey}`)}: ${t(lang, `haxball.maps.${map.descriptionKey}`)}`}
    >
      <rect x="0" y="0" width={width} height={height} rx="12" fill="#181818" />
      <rect x="5" y="5" width={width - 10} height={height - 10} rx="9" fill="#1f1f1f" stroke="rgba(233,236,243,0.24)" />
      <line x1={width / 2} x2={width / 2} y1="5" y2={height - 5} stroke="rgba(233,236,243,0.18)" />
      <circle cx={width / 2} cy={height / 2} r={Math.min(width, height) * 0.15} fill="none" stroke="rgba(233,236,243,0.18)" />
      <circle cx={width / 2} cy={height / 2} r="3" fill={accent} />
      <rect x="0" y={goalY} width="10" height={goalHeight} fill={`${accent}33`} stroke={accent} />
      <rect x={width - 10} y={goalY} width="10" height={goalHeight} fill={`${accent}33`} stroke={accent} />
      {map.obstacles.map((obstacle) => (
        <rect
          key={`${obstacle.x}-${obstacle.y}`}
          x={obstacle.x * scaleX}
          y={obstacle.y * scaleY}
          width={obstacle.width * scaleX}
          height={obstacle.height * scaleY}
          rx={compact ? 2 : 4}
          fill={accent}
          opacity="0.7"
        />
      ))}
      <circle cx={width * 0.25} cy={height / 2} r={compact ? 5 : 9} fill="#f1f4f7" />
      <circle cx={width * 0.75} cy={height / 2} r={compact ? 5 : 9} fill="#f1f4f7" />
    </svg>
  );
}
