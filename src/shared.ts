export type EntityType = 'movie' | 'artist' | 'book';
export type Mode = 'demo' | 'live';
export interface Entity { id: string; name: string; type: EntityType; disambiguation?: string }
export interface Profile { seeds: Entity[] }
export interface PlanRequest {
  mode: Mode;
  profiles: [Profile, Profile];
  minutes: 30 | 60 | 90;
  focus: 'balanced' | 'adventurous';
  excludeIds: string[];
}
export interface Candidate extends Entity {
  ranks: [number | null, number | null];
  rankScores: [number, number];
  fairnessScore: number;
  reason: string;
}
export interface PlanStep {
  entity: Candidate;
  minutes: number;
  activity: string;
  prompt: string;
  alternatives: Candidate[];
}
export interface TraceEvent { node: string; detail: string }
export interface PlanResponse {
  mode: Mode;
  source: 'curated-demo' | 'qloo-live';
  steps: PlanStep[];
  trace: TraceEvent[];
  warnings: string[];
  totalMinutes: number;
  methodology: string;
}
export interface AppConfig { liveAvailable: boolean; defaultMode: Mode; maxSeeds: number }
export interface SearchResponse { mode: Mode; source: 'curated-demo' | 'qloo-live'; entities: Entity[] }
export interface ApiError { error: { code: string; message: string } }
