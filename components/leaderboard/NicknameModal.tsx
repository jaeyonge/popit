"use client";

import { useState } from "react";
import { X, UserPlus, CheckCircle, AlertCircle } from "lucide-react";

interface NicknameModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  currentNickname: string;
  onSuccess: (nickname: string) => void;
}

export default function NicknameModal({
  isOpen,
  onClose,
  playerId,
  currentNickname,
  onSuccess,
}: NicknameModalProps) {
  const [nickname, setNickname] = useState<string>(currentNickname);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = nickname.trim();
    // PRD Section 26: 2~12 characters
    if (trimmed.length < 2 || trimmed.length > 12) {
      setError("닉네임은 2자 이상 12자 이하로 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/player/nickname", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, nickname: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "닉네임 등록에 실패했습니다.");
        return;
      }

      onSuccess(data.nickname);
      onClose();
    } catch (err) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl bg-[#141622] border border-white/10 p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-purple-400" />
            <h3 className="text-base font-black">기록을 남길까요?</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          리더보드에 표시될 닉네임을 설정하세요. 회원가입 없이 기기에 바로 저장됩니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="2~12자 닉네임"
              maxLength={12}
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              autoFocus
            />
            {error && (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-purple-950/40 p-3 text-[11px] text-purple-200/80 border border-purple-800/30">
            🔒 개인정보(이름, 전화번호 등) 입력은 금지되어 있습니다. 중복 닉네임은 허용됩니다.
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-white/5 py-3 text-xs font-bold text-gray-300 hover:bg-white/10 transition"
            >
              다음에 하기
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-3 text-xs font-bold text-white shadow-lg shadow-purple-900/30 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "등록 중..." : "확인"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

