"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DailyCampaign } from "@/lib/db";
import {
  ShieldAlert,
  CheckCircle,
  Clock,
  Eye,
  Play,
  TrendingUp,
  AlertTriangle,
  FileEdit,
  PowerOff,
  RefreshCw,
  Plus,
} from "lucide-react";

interface AdminMetrics {
  uniquePlayers: number;
  totalPlays: number;
  averagePlaysPerPlayer: string;
  completionRate: string;
  totalDrops: number;
  totalPerfectShakes: number;
  ctaClicks: number;
  ctaCtr: string;
}

interface SuspiciousRun {
  sessionId: string;
  playerId: string;
  score: number;
  unverifiedReason?: string;
  submittedAt: string;
}

export default function AdminDashboard() {
  const [campaigns, setCampaigns] = useState<DailyCampaign[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [suspiciousRuns, setSuspiciousRuns] = useState<SuspiciousRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"CAMPAIGNS" | "METRICS" | "SECURITY">("CAMPAIGNS");

  // New Campaign Form Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [formDate, setFormDate] = useState<string>("");
  const [formSponsor, setFormSponsor] = useState<string>("");
  const [formObject, setFormObject] = useState<string>("");
  const [formDrop, setFormDrop] = useState<string>("");
  const [formCtaLabel, setFormCtaLabel] = useState<string>("");
  const [formCtaUrl, setFormCtaUrl] = useState<string>("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cRes, mRes] = await Promise.all([
        fetch("/api/admin/campaigns"),
        fetch("/api/admin/metrics"),
      ]);
      const cData = await cRes.json();
      const mData = await mRes.json();

      setCampaigns(cData.campaigns || []);
      setMetrics(mData.metrics || null);
      setSuspiciousRuns(mData.suspiciousRuns || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateStatus = async (id: string, newStatus: DailyCampaign["status"]) => {
    try {
      await fetch(`/api/admin/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          sponsorName: formSponsor,
          objectName: formObject,
          dropItemName: formDrop,
          ctaLabel: formCtaLabel,
          ctaUrl: formCtaUrl,
          objectAssetUrl: "/assets/oreo_box.png",
          dropAssetUrl: "/assets/oreo_cookie.png",
        }),
      });
      setShowCreateModal(false);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white font-sans p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-purple-600 px-2 py-0.5 text-xs font-black">
                OPERATIONS
              </span>
              <h1 className="text-2xl font-black tracking-tight">Popit Admin Center</h1>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              캠페인 심사, 라이브 제어, 스폰서 성과 리포트 및 안티치트 검수
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-gray-300 hover:bg-white/10 transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              새로고침
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-500 transition"
            >
              <Plus size={16} />
              새 캠페인 등록
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 pt-6">
          <button
            onClick={() => setActiveTab("CAMPAIGNS")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "CAMPAIGNS"
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            캠페인 파이프라인 ({campaigns.length})
          </button>
          <button
            onClick={() => setActiveTab("METRICS")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "METRICS"
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            스폰서 리포트 & 지표
          </button>
          <button
            onClick={() => setActiveTab("SECURITY")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "SECURITY"
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            안티치트 감사 ({suspiciousRuns.length})
          </button>
        </div>

        {/* Tab 1: Campaigns Pipeline (PRD Section 40, 44) */}
        {activeTab === "CAMPAIGNS" && (
          <div className="mt-6 space-y-4">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="flex flex-col md:flex-row items-start md:items-center justify-between rounded-2xl bg-[#151824] border border-white/10 p-5 gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 relative rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
                    <Image
                      src={camp.objectAssetUrl}
                      alt={camp.objectName}
                      width={56}
                      height={56}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">{camp.date}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-black ${
                          camp.status === "LIVE"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : camp.status === "APPROVED"
                            ? "bg-blue-500/20 text-blue-400"
                            : camp.status === "EMERGENCY_STOPPED"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {camp.status}
                      </span>
                      <span className="text-[10px] text-purple-300 font-semibold">
                        {camp.campaignType}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">
                      {camp.objectName} ({camp.dropItemName})
                    </h3>
                    <p className="text-xs text-gray-400">
                      스폰서: <strong className="text-gray-200">{camp.sponsorName}</strong> | CTA: {camp.ctaLabel}
                    </p>
                  </div>
                </div>

                {/* Operations & Control Buttons (PRD Section 40, 44: Approve, Live, Emergency Stop) */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  {camp.status !== "LIVE" && (
                    <button
                      onClick={() => updateStatus(camp.id, "LIVE")}
                      className="rounded-xl bg-green-600/20 border border-green-500/30 px-3 py-1.5 text-xs font-bold text-green-400 hover:bg-green-600 hover:text-white transition"
                    >
                      라이브 적용
                    </button>
                  )}
                  {camp.status === "DRAFT" && (
                    <button
                      onClick={() => updateStatus(camp.id, "APPROVED")}
                      className="rounded-xl bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-600 hover:text-white transition"
                    >
                      심사 승인
                    </button>
                  )}
                  {camp.status === "LIVE" && (
                    <button
                      onClick={() => updateStatus(camp.id, "EMERGENCY_STOPPED")}
                      className="flex items-center gap-1 rounded-xl bg-red-600/20 border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white transition"
                    >
                      <PowerOff size={14} />
                      긴급 중단
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Sponsor Reporting Metrics (PRD Section 46) */}
        {activeTab === "METRICS" && metrics && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-[#151824] border border-white/10 p-5">
                <span className="text-xs text-gray-400 font-bold block">유니크 플레이어</span>
                <span className="text-3xl font-black text-white mt-1 block">
                  {metrics.uniquePlayers.toLocaleString()}
                </span>
                <span className="text-[11px] text-purple-300">첫 플레이 시작 기준</span>
              </div>
              <div className="rounded-2xl bg-[#151824] border border-white/10 p-5">
                <span className="text-xs text-gray-400 font-bold block">전체 플레이 수</span>
                <span className="text-3xl font-black text-white mt-1 block">
                  {metrics.totalPlays.toLocaleString()}
                </span>
                <span className="text-[11px] text-purple-300">인당 평균 {metrics.averagePlaysPerPlayer}회</span>
              </div>
              <div className="rounded-2xl bg-[#151824] border border-white/10 p-5">
                <span className="text-xs text-gray-400 font-bold block">15초 완주율</span>
                <span className="text-3xl font-black text-green-400 mt-1 block">
                  {metrics.completionRate}
                </span>
                <span className="text-[11px] text-gray-400">정상 종료 세션</span>
              </div>
              <div className="rounded-2xl bg-[#151824] border border-white/10 p-5">
                <span className="text-xs text-gray-400 font-bold block">CTA 클릭 & CTR</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-yellow-300">
                    {metrics.ctaClicks.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-gray-400">({metrics.ctaCtr})</span>
                </div>
                <span className="text-[11px] text-yellow-400/80">결과 화면 유입</span>
              </div>
            </div>

            <div className="rounded-2xl bg-[#151824] border border-white/10 p-6">
              <h3 className="text-base font-bold text-white mb-4">인게임 인터랙션 성과</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-white/5 p-4">
                  <span className="text-xs text-gray-400">누적 드롭된 아이템</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {metrics.totalDrops.toLocaleString()}개
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-4">
                  <span className="text-xs text-gray-400">PERFECT 흔들기 횟수</span>
                  <div className="text-2xl font-black text-yellow-400 mt-1">
                    {metrics.totalPerfectShakes.toLocaleString()}회
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Security & Anti-cheat (PRD Section 33, 34) */}
        {activeTab === "SECURITY" && (
          <div className="mt-6 rounded-2xl bg-[#151824] border border-white/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="text-red-400" size={20} />
              <h3 className="text-base font-bold text-white">
                비정상 의심 세션 필터링 내역
              </h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              120ms 미만의 비정상 매크로 인터벌, 탭 이탈, 변조 토큰 등 서버에서 공식 리더보드 제외 처리된 기록입니다.
            </p>

            {suspiciousRuns.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-gray-500">
                의심 기록이 감지되지 않았습니다. 모든 세션이 정상입니다.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {suspiciousRuns.map((run) => (
                  <div key={run.sessionId} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-gray-400">{run.sessionId}</span>
                      <span className="ml-3 font-bold text-red-400">
                        {run.unverifiedReason || "검증 실패"}
                      </span>
                    </div>
                    <div className="text-gray-500 font-mono">
                      {new Date(run.submittedAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-[#151824] border border-white/10 p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold mb-4">새 일일 캠페인 등록</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">진행 날짜 (YYYY-MM-DD)</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">스폰서명</label>
                <input
                  type="text"
                  required
                  placeholder="예: 롯데웰푸드"
                  value={formSponsor}
                  onChange={(e) => setFormSponsor(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">SHAKE 사물 명칭</label>
                <input
                  type="text"
                  required
                  placeholder="예: 빼빼로 패키지"
                  value={formObject}
                  onChange={(e) => setFormObject(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">DROP 아이템 명칭</label>
                <input
                  type="text"
                  required
                  placeholder="예: 아몬드 빼빼로"
                  value={formDrop}
                  onChange={(e) => setFormDrop(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">CTA 문구 및 랜딩 URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="버튼 라벨"
                    value={formCtaLabel}
                    onChange={(e) => setFormCtaLabel(e.target.value)}
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 p-3 text-white focus:outline-none"
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    value={formCtaUrl}
                    onChange={(e) => setFormCtaUrl(e.target.value)}
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 p-3 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl bg-white/5 py-3 font-bold text-gray-300 hover:bg-white/10"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-purple-600 py-3 font-bold text-white hover:bg-purple-500"
                >
                  생성하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

