'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ConversationsList, ConversationDetail, OmiConversation, getOmiConversation } from '@/features/conversations';

function ConversationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idParam = searchParams.get('id');
  const source = searchParams.get('source');

  const [selectedConversation, setSelectedConversation] = useState<OmiConversation | null>(null);
  const [isLoadingFromParam, setIsLoadingFromParam] = useState(!!idParam);

  useEffect(() => {
    if (!idParam) return;
    setIsLoadingFromParam(true);
    getOmiConversation(idParam)
      .then((conv) => {
        if (conv) {
          setSelectedConversation(conv);
        } else {
          console.warn('Conversation not found:', idParam);
        }
      })
      .catch((err) => {
        console.error('Error loading conversation:', err);
      })
      .finally(() => setIsLoadingFromParam(false));
  }, [idParam]);

  const handleClose = () => {
    setSelectedConversation(null);
    // Clear query params when closing
    if (idParam) {
      router.replace('/conversations');
    }
  };

  const handleConversationUpdate = (updated: OmiConversation) => {
    setSelectedConversation(updated);
  };

  if (isLoadingFromParam) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Cargando conversacion...</p>
        </div>
      </div>
    );
  }

  if (selectedConversation) {
    const isAnalyzing = source === 'recording' && !selectedConversation.communication_feedback;
    return (
      <div className="h-full flex flex-col bg-background">
        <ConversationDetail
          conversation={selectedConversation}
          onClose={handleClose}
          onConversationUpdate={handleConversationUpdate}
          isAnalyzing={isAnalyzing}
        />
      </div>
    );
  }

  return (
    <div className="h-full bg-muted">
      <ConversationsList
        onSelect={setSelectedConversation}
        selectedId={null}
      />
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      }
    >
      <ConversationsContent />
    </Suspense>
  );
}
