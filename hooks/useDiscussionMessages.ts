'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useMessageStore, EMPTY } from '@/stores/messageStore';

export interface MessageAuthor {
  id: string;
  name: string;
  position: string;
}

export interface MessageItem {
  id: string;
  discussion_id: string;
  content: string;
  attachments?: any[];
  created_at: string;
  employee?: MessageAuthor;
  isOptimistic?: boolean;
  failed?: boolean;
}

export interface DiscussionMessagesOptions {
  isAnnouncement?: boolean;
  onDiscussionResolved?: (id: string) => void;
  onDiscussionNotFound?: () => void;
}

export function useDiscussionMessages(
  discussionId: string | null,
  currentEmployee: any,
  options?: DiscussionMessagesOptions
) {
  const activeTarget = discussionId || (options?.isAnnouncement ? 'announcements' : null);

  // Read messages directly from in-memory Zustand store (zero localStorage, instant 0ms switch)
  const messages = useMessageStore((s) => (activeTarget ? s.channels[activeTarget]?.messages ?? EMPTY : EMPTY));
  const setStoreMessages = useMessageStore((s) => s.setMessages);
  const mergeStoreMessages = useMessageStore((s) => s.mergeMessages);
  const removeStoreMessage = useMessageStore((s) => s.removeMessage);
  const touchStore = useMessageStore((s) => s.touch);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const currentDiscIdRef = useRef<string | null>(discussionId);
  const resolvedDiscIdRef = useRef<string | null>(discussionId);
  const currentEmployeeRef = useRef<any>(currentEmployee);
  const employeeDirectoryRef = useRef<Map<string, MessageAuthor>>(new Map());
  const supabase = useRef(createClient()).current;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Keep refs synchronized
  useEffect(() => {
    currentDiscIdRef.current = discussionId;
    resolvedDiscIdRef.current = discussionId;
    currentEmployeeRef.current = currentEmployee;
    if (currentEmployee?.id && currentEmployee?.name) {
      employeeDirectoryRef.current.set(currentEmployee.id, {
        id: currentEmployee.id,
        name: currentEmployee.name,
        position: currentEmployee.position || 'Staff',
      });
    }
    if (activeTarget) {
      touchStore(activeTarget);
    }
  }, [discussionId, activeTarget, currentEmployee, touchStore]);

  // Delta catchup helper
  const fetchMissedMessages = useCallback(
    async (target: string) => {
      const latest = useMessageStore.getState().latestTimestamp(target);
      if (!latest) return;
      try {
        const since = new Date(Date.parse(latest) - 5000).toISOString();
        const res = await fetch(
          `/api/discussions/${target}/messages?since=${encodeURIComponent(since)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            mergeStoreMessages(target, data.messages);
          }
        }
      } catch (e) {
        console.warn('Delta catchup warning:', e);
      }
    },
    [mergeStoreMessages]
  );

  // 1. Initial Load & Delta Sync Lifecycle (No screen wipe, no flicker on revisited channels)
  useEffect(() => {
    if (!activeTarget) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const { isHydrated, latestTimestamp } = useMessageStore.getState();
    const hydrated = isHydrated(activeTarget);
    const latest = latestTimestamp(activeTarget);

    // 5s overlap window prevents race conditions when rows commit out of sequence.
    // Harmless because mergeById in messageStore dedupes by ID.
    const since = hydrated && latest
      ? new Date(Date.parse(latest) - 5000).toISOString()
      : null;

    // Only display loading spinner if channel has never been loaded before
    setLoading(!hydrated);
    setError(null);

    (async () => {
      const url = since
        ? `/api/discussions/${activeTarget}/messages?since=${encodeURIComponent(since)}`
        : `/api/discussions/${activeTarget}/messages`;

      try {
        const res = await fetch(url);
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;

          const resolvedId = data.discussionId || activeTarget;
          resolvedDiscIdRef.current = resolvedId;
          if (resolvedId !== activeTarget && optionsRef.current?.onDiscussionResolved) {
            optionsRef.current.onDiscussionResolved(resolvedId);
          }

          const incomingList: MessageItem[] = data.messages || [];

          for (const m of incomingList) {
            if (m.employee?.id && m.employee.name && m.employee.name !== 'Staff') {
              employeeDirectoryRef.current.set(m.employee.id, m.employee);
            }
          }

          if (since) {
            mergeStoreMessages(activeTarget, incomingList);
            if (resolvedId !== activeTarget) {
              mergeStoreMessages(resolvedId, incomingList);
            }
          } else {
            setStoreMessages(activeTarget, incomingList);
            if (resolvedId !== activeTarget) {
              setStoreMessages(resolvedId, incomingList);
            }
            setHasMore(data.hasMore === true);
          }
        } else {
          const err = await res.json().catch(() => ({}));
          if (!cancelled) {
            if (res.status === 404 && optionsRef.current?.onDiscussionNotFound) {
              optionsRef.current.onDiscussionNotFound();
            } else {
              setError(err.error || 'Failed to load messages');
            }
          }
        }
      } catch (err: any) {
        console.error('Fetch messages failed:', err);
        if (!cancelled) {
          setError(err.message || 'Connection error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTarget, setStoreMessages, mergeStoreMessages]);

  // 2. Realtime Postgres CDC Subscription
  useEffect(() => {
    if (!activeTarget) return;

    const subTargetId = resolvedDiscIdRef.current || activeTarget;
    const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subTargetId);
    let isSubscribed = false;

    const channel = supabase
      .channel(`discussion-stream-${subTargetId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          ...(isRealUuid ? { filter: `discussion_id=eq.${subTargetId}` } : {}),
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (!newMsg) return;
          if (isRealUuid && newMsg.discussion_id !== subTargetId) return;

          // Resolve employee details (avoid fallback 'Staff' flashing)
          let emp = newMsg.employee;
          if (!emp || emp.name === 'Staff') {
            const current = currentEmployeeRef.current;
            if (
              current &&
              (newMsg.employee_id === current.id ||
                newMsg.employee_id === current.employeeId)
            ) {
              emp = {
                id: current.id,
                name: current.name,
                position: current.position || 'Staff',
              };
            } else if (employeeDirectoryRef.current.has(newMsg.employee_id)) {
              emp = employeeDirectoryRef.current.get(newMsg.employee_id);
            } else {
              emp = {
                id: newMsg.employee_id,
                name: 'Staff',
                position: 'Member',
              };
            }
          }

          const formatted: MessageItem = {
            id: newMsg.id,
            discussion_id: newMsg.discussion_id,
            content: newMsg.content,
            attachments: newMsg.attachments || [],
            created_at: newMsg.created_at,
            employee: emp,
          };

          mergeStoreMessages(subTargetId, [formatted]);
          if (activeTarget !== subTargetId) {
            mergeStoreMessages(activeTarget, [formatted]);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (isSubscribed) {
            fetchMissedMessages(activeTarget);
          }
          isSubscribed = true;
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          isSubscribed = false;
        }
      });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMissedMessages(activeTarget);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3s Delta Polling loop (guarantees real-time sync even when WebSockets are blocked/dropped)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMissedMessages(activeTarget);
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [activeTarget, mergeStoreMessages, fetchMissedMessages, supabase]);

  // 3. Backward Pagination: Fetch older messages before oldest loaded message
  const fetchOlderMessages = useCallback(async () => {
    if (!activeTarget || !hasMore || loadingOlder || messages.length === 0) return;

    const oldestTimestamp = messages[0].created_at;
    setLoadingOlder(true);

    try {
      const res = await fetch(
        `/api/discussions/${activeTarget}/messages?before=${encodeURIComponent(oldestTimestamp)}`
      );

      if (res.ok) {
        const data = await res.json();
        const olderList: MessageItem[] = data.messages || [];

        if (olderList.length > 0) {
          mergeStoreMessages(activeTarget, olderList);
        }
        setHasMore(data.hasMore === true);
      }
    } catch (err) {
      console.error('Fetch older messages error:', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [activeTarget, hasMore, loadingOlder, messages, mergeStoreMessages]);

  // 4. Send Message with 0ms Optimistic Feedback
  const sendMessage = useCallback(
    async (
      content: string,
      replyTo?: { id: string; authorName: string; content: string } | null
    ) => {
      if (!activeTarget || !content.trim()) return false;
      const targetDiscId = activeTarget;

      const trimmedContent = content.trim();
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const nowIso = new Date().toISOString();

      const messageAttachments = replyTo
        ? [{ type: 'reply', id: replyTo.id, authorName: replyTo.authorName, content: replyTo.content }]
        : [];

      const optimisticMsg: MessageItem = {
        id: tempId,
        discussion_id: targetDiscId,
        content: trimmedContent,
        attachments: messageAttachments,
        created_at: nowIso,
        employee: {
          id: currentEmployee?.id || '',
          name: currentEmployee?.name || 'You',
          position: currentEmployee?.position || 'Staff',
        },
        isOptimistic: true,
      };

      // 0ms Optimistic insertion into Zustand store
      mergeStoreMessages(targetDiscId, [optimisticMsg]);

      try {
        const res = await fetch(`/api/discussions/${targetDiscId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: trimmedContent,
            attachments: messageAttachments,
          }),
        });

        if (res.ok) {
          const { message: serverMsg, discussionId: resolvedDiscId } = await res.json();
          if (resolvedDiscId && optionsRef.current?.onDiscussionResolved) {
            resolvedDiscIdRef.current = resolvedDiscId;
            optionsRef.current.onDiscussionResolved(resolvedDiscId);
          }

          // Replace optimistic message with confirmed server payload
          removeStoreMessage(targetDiscId, tempId);
          mergeStoreMessages(targetDiscId, [{ ...serverMsg, isOptimistic: false }]);

          if (resolvedDiscId && resolvedDiscId !== targetDiscId) {
            mergeStoreMessages(resolvedDiscId, [{ ...serverMsg, isOptimistic: false }]);
          }
          return true;
        } else {
          if (res.status === 404 && optionsRef.current?.onDiscussionNotFound) {
            optionsRef.current.onDiscussionNotFound();
          }

          // Mark as failed
          mergeStoreMessages(targetDiscId, [{ ...optimisticMsg, failed: true, isOptimistic: false }]);
          return false;
        }
      } catch (err) {
        console.error('Send message failed:', err);
        mergeStoreMessages(targetDiscId, [{ ...optimisticMsg, failed: true, isOptimistic: false }]);
        return false;
      }
    },
    [activeTarget, currentEmployee?.id, currentEmployee?.name, currentEmployee?.position, mergeStoreMessages, removeStoreMessage]
  );

  // 5. Delete Message with 0ms Optimistic Removal
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!activeTarget || !messageId) return false;
      const targetDiscId = activeTarget;

      // Optimistic removal from in-memory store
      removeStoreMessage(targetDiscId, messageId);

      try {
        const res = await fetch(
          `/api/discussions/${targetDiscId}/messages?messageId=${encodeURIComponent(messageId)}`,
          { method: 'DELETE' }
        );
        return res.ok;
      } catch (err) {
        console.error('Delete message failed:', err);
        return false;
      }
    },
    [activeTarget, removeStoreMessage]
  );

  return {
    messages,
    loading,
    error,
    hasMore,
    loadingOlder,
    fetchOlderMessages,
    sendMessage,
    deleteMessage,
  };
}
