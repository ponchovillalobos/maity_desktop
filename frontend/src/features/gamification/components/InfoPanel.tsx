'use client';

import { Trophy, MessageSquare, Lightbulb } from 'lucide-react';
import { GamifiedDashboardData } from '../hooks/useGamifiedDashboardData';

interface InfoPanelProps {
  data: GamifiedDashboardData;
}

const POSITION_BADGES = ['\uD83C\uDFC6', '\uD83E\uDD48', '\uD83E\uDD49'];

export function InfoPanel({ data }: InfoPanelProps) {
  const { ranking, muletillasPercent } = data;

  return (
    <div className="flex flex-col gap-4">
      {/* Muletillas */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4">
        <h3 className="text-[#a0a0b0] text-xs font-semibold uppercase tracking-wider mb-3">
          Muletillas
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-[#1a1a2e] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#ff4500] to-[#ff6b35] transition-all duration-500"
              style={{ width: `${muletillasPercent}%` }}
            />
          </div>
          <span className="text-white font-semibold text-sm">{muletillasPercent}%</span>
        </div>
      </div>

      {/* Ranking */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4">
        <h3 className="text-[#a0a0b0] text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" />
          Ranking
        </h3>
        <div className="flex flex-col gap-2">
          {ranking.map(entry => (
            <div
              key={entry.position}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                entry.isCurrentUser
                  ? 'bg-[#f15bb5]/10 border border-[#f15bb5]/30'
                  : 'bg-[#0d0d15]'
              }`}
            >
              <span className="text-lg w-7 text-center">
                {entry.position <= 3
                  ? POSITION_BADGES[entry.position - 1]
                  : `#${entry.position}`}
              </span>
              <span
                className={`flex-1 text-sm font-medium ${
                  entry.isCurrentUser ? 'text-[#f15bb5]' : 'text-white'
                }`}
              >
                {entry.name}
              </span>
              <span className="text-xs text-[#a0a0b0]">
                {entry.xp >= 1000 ? `${(entry.xp / 1000).toFixed(0)}k` : entry.xp} XP
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <button className="flex items-center gap-2 w-full p-3 rounded-xl bg-[#111118] border border-[#1e1e2e] text-white hover:border-[#f15bb5]/50 transition-colors">
          <MessageSquare className="w-4 h-4 text-[#00f5d4]" />
          <span className="text-sm font-medium">Feedback</span>
        </button>
        <button className="flex items-center gap-2 w-full p-3 rounded-xl bg-[#111118] border border-[#1e1e2e] text-white hover:border-[#f15bb5]/50 transition-colors">
          <Lightbulb className="w-4 h-4 text-[#ffd93d]" />
          <span className="text-sm font-medium">Insight</span>
        </button>
      </div>
    </div>
  );
}
