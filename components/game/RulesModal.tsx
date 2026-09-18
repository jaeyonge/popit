"use client";

import { X, Smartphone, Zap, Sparkles, Flame, Gift, ShieldCheck } from "lucide-react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex h-[85vh] w-full max-w-md flex-col rounded-3xl bg-[#141622] border border-white/10 shadow-2xl text-white overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Zap className="text-yellow-400" size={20} />
            <h2 className="text-base font-black tracking-wide">Popit 규칙 & 플레이 팁</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/5 p-2 text-gray-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed text-gray-300">
          {/* Rule 1 */}
          <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
            <div className="flex items-center gap-2 font-bold text-white text-sm mb-1">
              <Smartphone size={16} className="text-purple-400" />
              15초 동안 사물을 흔드세요!
            </div>
            <p>
              사물을 누르고 있으면 3초 카운트다운 후 게임이 시작됩니다. 손을 떼더라도 타이머는 멈추지 않으니 재빨리 다시 잡아 흔드세요!
            </p>
          </div>

          {/* Rule 2 */}
          <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
            <div className="flex items-center gap-2 font-bold text-white text-sm mb-1">
              <Sparkles size={16} className="text-yellow-400" />
              VALID / GOOD / PERFECT
            </div>
            <p className="mb-2">
              화면 터치 횟수가 아닌 <strong>실제 좌우 반전 흔들기(방향 전환)</strong> 폭과 속도를 감지합니다.
            </p>
            <ul className="space-y-1 text-gray-400">
              <li>• <strong className="text-white">VALID</strong>: 폭 10% 이상 (+1 Drop)</li>
              <li>• <strong className="text-cyan-300">GOOD</strong>: 폭 16% & 빠른 속도 (+2 Drops)</li>
              <li>• <strong className="text-yellow-300">PERFECT</strong>: 폭 22% & 초고속 흔들기 (+3 Drops)</li>
            </ul>
          </div>

          {/* Rule 3 */}
          <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
            <div className="flex items-center gap-2 font-bold text-white text-sm mb-1">
              <Flame size={16} className="text-orange-400" />
              콤보 & 1.5초 FEVER 타임
            </div>
            <p>
              GOOD 또는 PERFECT를 연속으로 유지하면 콤보가 쌓입니다. 700ms 동안 유효 흔들기가 없으면 콤보가 끊어집니다. 8 콤보 달성 시 <strong>1.5초간 FEVER 모드(+1 추가 보너스)</strong>가 발동합니다!
            </p>
          </div>

          {/* Rule 4 */}
          <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
            <div className="flex items-center gap-2 font-bold text-white text-sm mb-1">
              <Gift size={16} className="text-pink-400" />
              서프라이즈 JACKPOT!
            </div>
            <p>
              판마다 6번째~12번째 흔들기 중 한 번, 화면 가득 <strong>+5개 아이템 잭팟 폭발</strong>이 발생합니다.
            </p>
          </div>

          {/* Rule 5 */}
          <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
            <div className="flex items-center gap-2 font-bold text-white text-sm mb-1">
              <ShieldCheck size={16} className="text-green-400" />
              공정성 & 안티치트 보장
            </div>
            <p>
              120ms 미만의 비정상 매크로 방향 전환은 무효 처리되며, 게임 도중 브라우저 탭을 이탈하면 해당 판 기록은 랭킹에서 자동 제외됩니다. 모든 기록은 서버에서 물리 로그를 재검증합니다.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0c0d14]">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-purple-600 py-3 text-xs font-bold text-white hover:bg-purple-500 transition"
          >
            확인하고 플레이하기
          </button>
        </div>
      </div>
    </div>
  );
}

