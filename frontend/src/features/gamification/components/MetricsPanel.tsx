'use client';

import { ArrowDown, ArrowUp, Flame, Zap } from 'lucide-react';
import { GamifiedDashboardData } from '../hooks/useGamifiedDashboardData';

interface MetricsPanelProps {
  data: GamifiedDashboardData;
}

export function MetricsPanel({ data }: MetricsPanelProps) {
  const { userName, totalXP, streakDays, score, competencies, rewards } = data;

  const scoreDiff = score.today - score.yesterday;
  const isScoreUp = scoreDiff >= 0;

  return (
    <div className="flex flex-col gap-4">
      {/* User Header */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4">
        <h2 className="text-white font-bold text-lg truncate">{userName}</h2>
        <div className="flex items-center gap-4 mt-2 text-sm">
          <span className="flex items-center gap-1 text-[#ffd93d]">
            <Zap className="w-4 h-4" /> {totalXP} XP
          </span>
          <span className="flex items-center gap-1 text-[#ff6b35]">
            <Flame className="w-4 h-4" /> {streakDays} días
          </span>
        </div>
      </div>

      {/* Score Card */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4">
        <h3 className="text-[#a0a0b0] text-xs font-semibold uppercase tracking-wider mb-3">
          Score
        </h3>
        <div className="flex items-end gap-6">
          <div className="text-center">
            <p className="text-[#a0a0b0] text-xs mb-1">Ayer</p>
            <p className="text-2xl font-bold text-white">{score.yesterday.toFixed(1)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 mb-1">
              {isScoreUp ? (
                <ArrowUp className="w-4 h-4 text-[#00f5d4]" />
              ) : (
                <ArrowDown className="w-4 h-4 text-[#ef4444]" />
              )}
              <p className="text-xs text-[#a0a0b0]">Hoy</p>
            </div>
            <p className={`text-2xl font-bold ${isScoreUp ? 'text-[#00f5d4]' : 'text-[#ef4444]'}`}>
              {score.today.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Competency Vertical Altitude Meters */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4">
        <h3 className="text-[#a0a0b0] text-xs font-semibold uppercase tracking-wider mb-3">
          Escalada Diaria
        </h3>
        <div className="flex items-end justify-between gap-3 h-36">
          {competencies.map(comp => (
            <div key={comp.name} className="flex flex-col items-center flex-1">
              <span className="text-xs text-white font-semibold mb-1">{comp.value}%</span>
              <div className="w-full h-24 bg-[#1a1a2e] rounded-t-md relative overflow-hidden">
                <div
                  className="absolute bottom-0 w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${comp.value}%`,
                    backgroundColor: comp.color,
                  }}
                />
              </div>
              <span className="text-[10px] text-[#a0a0b0] mt-1 text-center leading-tight">{comp.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rewards */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4">
        <h3 className="text-[#a0a0b0] text-xs font-semibold uppercase tracking-wider mb-3">
          Recompensas
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {rewards.map(reward => (
            <div
              key={reward.name}
              className="flex flex-col items-center p-2.5 rounded-lg border border-[#1e1e2e] bg-[#0d0d15]"
            >
              <span className="text-xl mb-1">{reward.icon}</span>
              <span className="text-xs text-white text-center font-medium leading-tight">
                {reward.name}
              </span>
              <span className="text-xs mt-0.5" style={{ color: reward.color }}>
                {reward.xp} XP
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
