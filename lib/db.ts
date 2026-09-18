import fs from "fs";
import path from "path";

// PRD Section 53: Core Data Model
export interface DailyCampaign {
  id: string;
  date: string; // YYYY-MM-DD in Asia/Seoul
  sponsorName: string;
  objectName: string;
  objectAssetUrl: string;
  dropItemName: string;
  dropAssetUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  campaignType: "SPONSORED" | "ORGANIC";
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "SCHEDULED" | "LIVE" | "COMPLETED" | "EMERGENCY_STOPPED";
  reviewedBy?: string;
  approvedAt?: string;
}

export interface AnonymousPlayer {
  id: string;
  nickname: string;
  createdAt: string;
}

export interface GameSession {
  id: string;
  playerId: string;
  campaignId: string;
  scoringConfigVersion: number;
  jackpotIndex: number;
  signedToken: string;
  startedAt: string;
  submittedAt?: string;
  status: "ACTIVE" | "COMPLETED" | "INVALIDATED";
}

export interface GameResult {
  sessionId: string;
  playerId: string;
  campaignId: string;
  score: number;
  validCount: number;
  goodCount: number;
  perfectCount: number;
  feverCount: number;
  jackpotCount: number;
  verified: boolean;
  unverifiedReason?: string;
  submittedAt: string;
}

export interface DailyLeaderboardEntry {
  campaignId: string;
  playerId: string;
  nickname: string;
  bestScore: number;
  achievedAt: string;
}

interface DatabaseSchema {
  campaigns: DailyCampaign[];
  players: Record<string, AnonymousPlayer>;
  sessions: Record<string, GameSession>;
  results: GameResult[];
  leaderboards: Record<string, DailyLeaderboardEntry[]>; // keyed by date
  globalDrops: Record<string, number>; // date -> drops
  ctaClicks: Record<string, number>; // campaignId -> clicks
}

const DB_PATH = path.join(process.cwd(), "data", "popit_db.json");

// Helper to format Korea Date YYYY-MM-DD
export function getSeoulToday(): string {
  const now = new Date();
  const seoulTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const y = seoulTime.getFullYear();
  const m = String(seoulTime.getMonth() + 1).padStart(2, "0");
  const d = String(seoulTime.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DEFAULT_DB: DatabaseSchema = {
  campaigns: [
    {
      id: "camp_oreo_bts_today",
      date: getSeoulToday(),
      sponsorName: "동서식품 OREO",
      objectName: "오레오 BTS 호떡맛",
      objectAssetUrl: "/assets/oreo_box.png",
      dropItemName: "BTS 오레오",
      dropAssetUrl: "/assets/oreo_cookie.png",
      ctaLabel: "오레오 X BTS 에디션 알아보기",
      ctaUrl: "https://www.google.com/search?q=oreo+bts+edition",
      campaignType: "SPONSORED",
      status: "LIVE",
      reviewedBy: "Popit Chief Admin",
      approvedAt: new Date().toISOString(),
    },
    {
      id: "camp_fallback_popcorn",
      date: "2026-09-19",
      sponsorName: "Popit",
      objectName: "팝콘 버킷",
      objectAssetUrl: "/assets/oreo_box.png",
      dropItemName: "팝콘",
      dropAssetUrl: "/assets/oreo_cookie.png",
      ctaLabel: "Popit 둘러보기",
      ctaUrl: "https://popit.game",
      campaignType: "ORGANIC",
      status: "SCHEDULED",
      reviewedBy: "System",
      approvedAt: new Date().toISOString(),
    }
  ],
  players: {
    "player_sample_1": { id: "player_sample_1", nickname: "보라빛쿠키", createdAt: "2026-09-18T00:00:00Z" },
    "player_sample_2": { id: "player_sample_2", nickname: "빛의속도쉐이커", createdAt: "2026-09-18T00:10:00Z" },
    "player_sample_3": { id: "player_sample_3", nickname: "흔들림없는자", createdAt: "2026-09-18T00:20:00Z" },
    "player_sample_4": { id: "player_sample_4", nickname: "달콤한호떡", createdAt: "2026-09-18T01:00:00Z" },
    "player_sample_5": { id: "player_sample_5", nickname: "스피드마스터", createdAt: "2026-09-18T02:00:00Z" },
  },
  sessions: {},
  results: [],
  leaderboards: {
    [getSeoulToday()]: [
      { campaignId: "camp_oreo_bts_today", playerId: "player_sample_1", nickname: "보라빛쿠키", bestScore: 114, achievedAt: "2026-09-18T09:12:00Z" },
      { campaignId: "camp_oreo_bts_today", playerId: "player_sample_2", nickname: "빛의속도쉐이커", bestScore: 108, achievedAt: "2026-09-18T10:05:00Z" },
      { campaignId: "camp_oreo_bts_today", playerId: "player_sample_3", nickname: "흔들림없는자", bestScore: 99, achievedAt: "2026-09-18T11:20:00Z" },
      { campaignId: "camp_oreo_bts_today", playerId: "player_sample_4", nickname: "달콤한호떡", bestScore: 92, achievedAt: "2026-09-18T12:00:00Z" },
      { campaignId: "camp_oreo_bts_today", playerId: "player_sample_5", nickname: "스피드마스터", bestScore: 84, achievedAt: "2026-09-18T13:15:00Z" },
    ],
  },
  globalDrops: {
    [getSeoulToday()]: 1248920,
  },
  ctaClicks: {
    "camp_oreo_bts_today": 342,
  },
};

const DB_PATH = process.env.VERCEL
  ? path.join("/tmp", "popit_db.json")
  : path.join(process.cwd(), "data", "popit_db.json");

function ensureDbDirectory() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    // Ignore directory creation failure in restricted environments
  }
}

export function readDb(): DatabaseSchema {
  try {
    ensureDbDirectory();
    if (!fs.existsSync(DB_PATH)) {
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), "utf-8");
      } catch (writeErr) {
        // Read-only filesystem fallback
      }
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to read DB, falling back to default:", err);
    return DEFAULT_DB;
  }
}

export function writeDb(data: DatabaseSchema) {
  try {
    ensureDbDirectory();
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write DB to disk (e.g. read-only serverless):", err);
  }
}

/**
 * Get Today's Campaign (PRD Section 37, 40, 42)
 */
export function getTodayCampaign(): DailyCampaign {
  const db = readDb();
  const today = getSeoulToday();

  // 1. Look for LIVE campaign matching today's date
  const liveCampaign = db.campaigns.find(
    (c) => c.date === today && c.status === "LIVE"
  );
  if (liveCampaign) return liveCampaign;

  // 2. Look for APPROVED / SCHEDULED campaign for today
  const scheduled = db.campaigns.find(
    (c) => c.date === today && (c.status === "APPROVED" || c.status === "SCHEDULED")
  );
  if (scheduled) return scheduled;

  // 3. Fallback campaign
  const fallback = db.campaigns.find((c) => c.campaignType === "ORGANIC");
  if (fallback) return fallback;

  return db.campaigns[0];
}

