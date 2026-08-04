export type HaxballTeam = "red" | "blue";
export type HaxballMode = "1v1" | "2v2";
export type HaxballStage =
  | "waiting_for_players"
  | "countdown"
  | "playing"
  | "overtime"
  | "finished";

export interface HaxballMapDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  accent: "amber" | "cyan" | "orange" | "blue";
  obstacles: Array<{ x: number; y: number; width: number; height: number }>;
}

export const HAXBALL_MAPS: HaxballMapDefinition[] = [
  {
    id: "classic-arena",
    nameKey: "classic_arena",
    descriptionKey: "classic_arena_desc",
    accent: "amber",
    obstacles: [],
  },
  {
    id: "neon-split",
    nameKey: "neon_split",
    descriptionKey: "neon_split_desc",
    accent: "cyan",
    obstacles: [
      { x: 960, y: 0, width: 80, height: 330 },
      { x: 960, y: 670, width: 80, height: 330 },
    ],
  },
  {
    id: "canyon-gate",
    nameKey: "canyon_gate",
    descriptionKey: "canyon_gate_desc",
    accent: "orange",
    obstacles: [
      { x: 760, y: 220, width: 160, height: 100 },
      { x: 1080, y: 220, width: 160, height: 100 },
      { x: 760, y: 680, width: 160, height: 100 },
      { x: 1080, y: 680, width: 160, height: 100 },
    ],
  },
  {
    id: "ice-dock",
    nameKey: "ice_dock",
    descriptionKey: "ice_dock_desc",
    accent: "blue",
    obstacles: [
      { x: 400, y: 160, width: 100, height: 200 },
      { x: 400, y: 640, width: 100, height: 200 },
      { x: 1500, y: 160, width: 100, height: 200 },
      { x: 1500, y: 640, width: 100, height: 200 },
    ],
  },
];

export const HAXBALL_DURATIONS = [3, 5, 10] as const;

export const HAXBALL_FIELD = {
  width: 2000,
  height: 1000,
  goalWidth: 300,
  playerRadius: 30,
  ballRadius: 18,
};

export function getHaxballMap(mapId: string | null | undefined) {
  return HAXBALL_MAPS.find((map) => map.id === mapId) ?? HAXBALL_MAPS[0];
}

export function mapI18nKey(mapId: string) {
  return HAXBALL_MAPS.find((map) => map.id === mapId)?.nameKey ?? HAXBALL_MAPS[0].nameKey;
}

export interface HaxballSeat {
  userId: string;
  name: string;
  team: HaxballTeam | null;
  connected: boolean;
  ready: boolean;
  goals: number;
  assists: number;
  ownGoals?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
}

export interface HaxballGoalEvent {
  team: HaxballTeam;
  scorer?: string | null;
  scorer_id?: string | null;
  assist?: string | null;
  assist_id?: string | null;
  own_goal: boolean;
  score: { red: number; blue: number };
  at_ms: number;
}

export interface HaxballResult {
  match_id?: string | null;
  winner_team: HaxballTeam | null;
  score: { red: number; blue: number };
  reason: string;
  map_id: string;
  mode: HaxballMode;
  duration_min: number;
  players: Array<{
    userId: string;
    name: string;
    team: HaxballTeam;
    goals: number;
    assists: number;
    ownGoals?: number;
  }>;
}

export interface HaxballState {
  stage: HaxballStage;
  mode: HaxballMode;
  map_id: string;
  duration_min: number;
  max_players: number;
  field: {
    width: number;
    height: number;
    goal_width: number;
    player_radius: number;
    ball_radius: number;
    obstacles: Array<{ x: number; y: number; width: number; height: number }>;
  };
  score: { red: number; blue: number };
  ball: { x: number; y: number; vx: number; vy: number };
  remaining_ms: number;
  overtime_remaining_ms: number | null;
  countdown_ms: number | null;
  kickoff_team: HaxballTeam | null;
  last_goal: HaxballGoalEvent | null;
  last_event: { id: number; type: "kick" | "bounce" | "touch" | "goal"; at_ms: number } | null;
  goals: HaxballGoalEvent[];
  result: HaxballResult | null;
  match_id: string | null;
  server_time_ms: number;
  seats: Array<HaxballSeat | null>;
  players: HaxballSeat[];
}
