'use client';

import { useState } from 'react';
import { ConversationsList, ConversationDetail, OmiConversation } from '@/features/conversations';

export default function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<OmiConversation | null>(null);

  if (selectedConversation) {
    return (
      <div className="h-full flex flex-col bg-background">
        <ConversationDetail
          conversation={selectedConversation}
          onClose={() => setSelectedConversation(null)}
          onConversationUpdate={setSelectedConversation}
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
