'use client';

import { useGamifiedDashboardData } from '../hooks/useGamifiedDashboardData';
import { MountainMap } from './MountainMap';
import { MetricsPanel } from './MetricsPanel';
import { InfoPanel } from './InfoPanel';

export function GamifiedDashboard() {
  const data = useGamifiedDashboardData();

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#f15bb5] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#a0a0b0] text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#0a0a0f] p-4 sm:p-6">
      {/* 3-column layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-4 lg:gap-6">
        {/* Left - Metrics */}
        <div className="order-2 lg:order-1">
          <MetricsPanel data={data} />
        </div>

        {/* Center - Mountain */}
        <div className="order-1 lg:order-2 bg-[#0d0d15] border border-[#1e1e2e] rounded-xl p-4 min-h-[400px] lg:min-h-[600px]">
          <MountainMap nodes={data.nodes} completedNodes={data.completedNodes} />
        </div>

        {/* Right - Info */}
        <div className="order-3">
          <InfoPanel data={data} />
        </div>
      </div>
    </div>
  );
}

export default GamifiedDashboard;
