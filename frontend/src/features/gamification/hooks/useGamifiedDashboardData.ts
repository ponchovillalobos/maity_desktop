import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getOmiConversations, OmiConversation } from '@/features/conversations/services/conversations.service';

export interface MountainNode {
  index: number;
  x: number;
  y: number;
  status: 'completed' | 'current' | 'locked';
}

export interface RankingEntry {
  position: number;
  name: string;
  xp: number;
  isCurrentUser?: boolean;
}

export interface Reward {
  name: string;
  xp: number;
  icon: string;
  color: string;
}

export interface GamifiedDashboardData {
  // User info
  userName: string;
  totalXP: number;
  streakDays: number;
  // Score
  score: { yesterday: number; today: number };
  // Mountain nodes
  nodes: MountainNode[];
  completedNodes: number;
  // Competencies
  competencies: { name: string; value: number; color: string }[];
  // Mock data
  ranking: RankingEntry[];
  rewards: Reward[];
  muletillasPercent: number;
  // Loading state
  loading: boolean;
}

const NODE_POSITIONS: [number, number][] = [
  [20, 88], [40, 85], [60, 82], [80, 79],   // Row 1 (base)
  [70, 72], [50, 69], [30, 66],              // Row 2
  [40, 58], [60, 55],                        // Row 3
  [50, 47], [35, 42], [65, 37],              // Row 4
  [50, 30], [45, 22], [55, 15],              // Row 5 (summit)
];

const MOCK_RANKING: RankingEntry[] = [
  { position: 1, name: 'Mary B.', xp: 58000 },
  { position: 2, name: 'Lupita', xp: 23000 },
  { position: 3, name: 'Carlos M.', xp: 15000 },
  { position: 28, name: 'Poncho', xp: 170, isCurrentUser: true },
];

const MOCK_REWARDS: Reward[] = [
  { name: 'Negociador Valiente', xp: 170, icon: '\u2602\uFE0F', color: '#3b82f6' },
  { name: 'Presi\u00F3n Verbal', xp: 90, icon: '\uD83D\uDCAA', color: '#ef4444' },
  { name: 'Emp\u00E1tico', xp: 50, icon: '\u2764\uFE0F', color: '#10b981' },
  { name: 'Astucia Disruptiva', xp: 170, icon: '\uD83E\uDDE0', color: '#9333ea' },
];

const COMPETENCY_COLORS: Record<string, string> = {
  'Claridad': '#485df4',
  'Estructura': '#ff8c42',
  'Propósito': '#ffd93d',
  'Empatía': '#ef4444',
};

function calculateCompletedNodes(conversations: OmiConversation[]): number {
  const now = new Date();
  const thisMonth = conversations.filter(c => {
    const d = new Date(c.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const uniqueDays = new Set(
    thisMonth.map(c => new Date(c.created_at).toDateString())
  );

  return Math.min(Math.floor(uniqueDays.size / 2), 15);
}

function buildNodes(completedCount: number): MountainNode[] {
  return NODE_POSITIONS.map(([x, y], index) => {
    let status: MountainNode['status'] = 'locked';
    if (index < completedCount) status = 'completed';
    else if (index === completedCount) status = 'current';
    return { index, x, y, status };
  });
}

export function useGamifiedDashboardData(): GamifiedDashboardData {
  const { maityUser } = useAuth();
  const [conversations, setConversations] = useState<OmiConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!maityUser?.id) {
        setLoading(false);
        return;
      }
      try {
        const data = await getOmiConversations(maityUser.id);
        setConversations(data);
      } catch (err) {
        console.error('Error loading omi conversations for gamified dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [maityUser?.id]);

  const completedNodes = useMemo(
    () => calculateCompletedNodes(conversations),
    [conversations]
  );

  const nodes = useMemo(() => buildNodes(completedNodes), [completedNodes]);

  // Default competencies (could be enhanced with real data later)
  const competencies = useMemo(() => {
    return Object.entries(COMPETENCY_COLORS).map(([name, color]) => ({
      name,
      value: Math.floor(Math.random() * 40) + 30, // Placeholder values
      color,
    }));
  }, []);

  // Calculate streak from conversations (consecutive days with conversations going back from today)
  const streakDays = useMemo(() => {
    if (conversations.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daySet = new Set(
      conversations.map(c => {
        const d = new Date(c.created_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );
    let streak = 0;
    const checkDay = new Date(today);
    while (daySet.has(checkDay.getTime())) {
      streak++;
      checkDay.setDate(checkDay.getDate() - 1);
    }
    return streak;
  }, [conversations]);

  // Score from last 2 conversations
  const score = useMemo(() => {
    const scored = conversations.filter(c => c.communication_feedback?.overall_score);
    if (scored.length >= 2) {
      return {
        today: scored[0].communication_feedback!.overall_score!,
        yesterday: scored[1].communication_feedback!.overall_score!,
      };
    }
    if (scored.length === 1) {
      return { today: scored[0].communication_feedback!.overall_score!, yesterday: 0 };
    }
    return { yesterday: 5.6, today: 7.2 };
  }, [conversations]);

  const ranking = useMemo(() => {
    const r = [...MOCK_RANKING];
    if (maityUser?.first_name) {
      const currentIdx = r.findIndex(e => e.isCurrentUser);
      if (currentIdx >= 0) {
        r[currentIdx] = { ...r[currentIdx], name: maityUser.first_name };
      }
    }
    return r;
  }, [maityUser?.first_name]);

  return {
    userName: maityUser?.first_name || 'Usuario',
    totalXP: 170,
    streakDays,
    score,
    nodes,
    completedNodes,
    competencies,
    ranking,
    rewards: MOCK_REWARDS,
    muletillasPercent: 42,
    loading,
  };
}
