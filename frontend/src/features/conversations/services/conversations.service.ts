import { supabase } from '@/lib/supabase';

export interface OmiConversation {
  id: string;
  user_id: string | null;
  firebase_uid: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  title: string;
  overview: string;
  emoji: string | null;
  category: string | null;
  action_items: ActionItem[] | null;
  events: OmiEvent[] | null;
  transcript_text: string | null;
  source: string | null;
  language: string | null;
  status: string | null;
  words_count: number | null;
  duration_seconds: number | null;
  communication_feedback: CommunicationFeedback | null;
}

export interface ActionItem {
  description: string;
  completed?: boolean;
}

export interface OmiEvent {
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
}

export interface CommunicationObservations {
  clarity?: string;
  structure?: string;
  objections?: string;
  calls_to_action?: string;
}

export interface CommunicationFeedback {
  // Scores numéricos (pueden no existir en todos los análisis)
  overall_score?: number;
  clarity?: number;
  engagement?: number;
  structure?: number;
  // Textos
  feedback?: string;
  summary?: string;  // Resumen del análisis (alternativo a feedback)
  strengths?: string[];
  areas_to_improve?: string[];
  // Insights detallados por categoría
  observations?: CommunicationObservations;
}

export interface OmiTranscriptSegment {
  id: string;
  conversation_id: string;
  segment_index: number;
  text: string;
  speaker: string | null;
  speaker_id: number | null;
  is_user: boolean | null;
  start_time: number;
  end_time: number;
}

export async function getOmiConversations(userId?: string): Promise<OmiConversation[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('omi_conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching omi conversations:', error);
    throw error;
  }

  return data || [];
}

export async function getOmiConversation(conversationId: string): Promise<OmiConversation | null> {
  const { data, error } = await supabase
    .from('omi_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    console.error('Error fetching omi conversation:', error);
    throw error;
  }

  return data;
}

export async function getOmiTranscriptSegments(conversationId: string): Promise<OmiTranscriptSegment[]> {
  const { data, error } = await supabase
    .from('omi_transcript_segments')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('segment_index', { ascending: true });

  if (error) {
    console.error('Error fetching transcript segments:', error);
    throw error;
  }

  return data || [];
}

// Stats interfaces and functions
export interface OmiStats {
  totalConversations: number;
  avgOverallScore: number;
  avgClarity: number;
  avgEngagement: number;
  avgStructure: number;
  totalDurationMinutes: number;
  scoreHistory: { date: string; score: number }[];
}

export async function getOmiStats(userId?: string): Promise<OmiStats | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('omi_conversations')
    .select('created_at, duration_seconds, communication_feedback')
    .eq('user_id', userId)
    .eq('deleted', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching omi stats:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return {
      totalConversations: 0,
      avgOverallScore: 0,
      avgClarity: 0,
      avgEngagement: 0,
      avgStructure: 0,
      totalDurationMinutes: 0,
      scoreHistory: [],
    };
  }

  // Filter conversations with communication_feedback scores
  const conversationsWithScores = data.filter(
    (c) => c.communication_feedback?.overall_score !== undefined
  );

  // Calculate averages
  const calcAvg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const overallScores = conversationsWithScores
    .map((c) => c.communication_feedback?.overall_score)
    .filter((s): s is number => s !== undefined);

  const clarityScores = conversationsWithScores
    .map((c) => c.communication_feedback?.clarity)
    .filter((s): s is number => s !== undefined);

  const engagementScores = conversationsWithScores
    .map((c) => c.communication_feedback?.engagement)
    .filter((s): s is number => s !== undefined);

  const structureScores = conversationsWithScores
    .map((c) => c.communication_feedback?.structure)
    .filter((s): s is number => s !== undefined);

  // Calculate total duration
  const totalDurationSeconds = data.reduce(
    (acc, c) => acc + (c.duration_seconds || 0),
    0
  );

  // Build score history (last 10 conversations with scores)
  const scoreHistory = conversationsWithScores
    .slice(-10)
    .map((c) => ({
      date: new Date(c.created_at).toLocaleDateString('es-MX', {
        month: 'short',
        day: 'numeric',
      }),
      score: c.communication_feedback?.overall_score || 0,
    }));

  return {
    totalConversations: data.length,
    avgOverallScore: Math.round(calcAvg(overallScores) * 10) / 10,
    avgClarity: Math.round(calcAvg(clarityScores) * 10) / 10,
    avgEngagement: Math.round(calcAvg(engagementScores) * 10) / 10,
    avgStructure: Math.round(calcAvg(structureScores) * 10) / 10,
    totalDurationMinutes: Math.round(totalDurationSeconds / 60),
    scoreHistory,
  };
}
