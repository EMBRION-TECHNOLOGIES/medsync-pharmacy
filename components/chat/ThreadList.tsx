'use client';

import { ChatRoom } from '@/lib/zod-schemas';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThreadListProps {
  threads: ChatRoom[];
  selectedThreadId?: string;
  onSelectThread: (thread: ChatRoom) => void;
}

export function ThreadList({ threads, selectedThreadId, onSelectThread }: ThreadListProps) {
  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-2 p-2">
        {threads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No conversations yet</p>
          </div>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread)}
              className={cn(
                'w-full text-left p-4 rounded-lg border transition-colors hover:bg-muted',
                selectedThreadId === thread.id && 'bg-muted border-primary'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-medium">
                   {thread.participants.find(p => 
                     p.type === 'PATIENT' || 
                     p.type === 'patient'
                   )?.name || 
                   thread.participants.find(p => 
                     p.type === 'PHARMACY' || 
                     p.type === 'pharmacy'
                   )?.name || 
                   'Unknown'}
                </div>
                {(thread.unreadCount || 0) > 0 && (
                  <Badge variant="default" className="ms-gradient">
                    {thread.unreadCount}
                  </Badge>
                )}
              </div>
              {thread.lastMessage && (
                <>
                  <p className="text-sm text-muted-foreground truncate mb-1">
                    {thread.lastMessage.content}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(thread.lastMessage.createdAt), 'MMM dd, HH:mm')}
                  </p>
                </>
              )}
            </button>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

