import { create } from 'zustand';
import type { MessageItem } from '@/hooks/useDiscussionMessages';

const MAX_CHANNELS = 12;
const MAX_MESSAGES_PER_CHANNEL = 200;

/**
 * Stable empty array. Returning a fresh [] from a selector gives a new
 * reference on every render and re-renders forever. Always fall back to this.
 */
export const EMPTY: MessageItem[] = [];

type ChannelState = {
  messages: MessageItem[];
  /** true once a full (non-delta) fetch has completed for this channel */
  hydrated: boolean;
  lastAccess: number;
};

type MessageStore = {
  channels: Record<string, ChannelState>;
  isHydrated: (discussionId: string) => boolean;
  /** created_at of the newest cached message, or null */
  latestTimestamp: (discussionId: string) => string | null;
  /** full fetch result — replaces the channel */
  setMessages: (discussionId: string, messages: MessageItem[]) => void;
  /** realtime inserts + delta catchup — dedupes by id, incoming wins on edits */
  mergeMessages: (discussionId: string, incoming: MessageItem[]) => void;
  removeMessage: (discussionId: string, messageId: string) => void;
  touch: (discussionId: string) => void;
};

function mergeById(
  current: MessageItem[],
  incoming: MessageItem[]
): MessageItem[] {
  if (incoming.length === 0) return current;

  const byId = new Map<string, MessageItem>();
  for (const m of current) byId.set(m.id, m);
  for (const m of incoming) {
    const existing = byId.get(m.id);
    if (
      existing &&
      existing.employee &&
      existing.employee.name !== 'Staff' &&
      (!m.employee || m.employee.name === 'Staff')
    ) {
      byId.set(m.id, { ...m, employee: existing.employee });
    } else {
      byId.set(m.id, m);
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => {
      const t = Date.parse(a.created_at) - Date.parse(b.created_at);
      return t !== 0 ? t : a.id.localeCompare(b.id);
    })
    .slice(-MAX_MESSAGES_PER_CHANNEL);
}

function evict(
  channels: Record<string, ChannelState>
): Record<string, ChannelState> {
  const ids = Object.keys(channels);
  if (ids.length <= MAX_CHANNELS) return channels;

  const stalest = ids
    .sort((a, b) => channels[a].lastAccess - channels[b].lastAccess)
    .slice(0, ids.length - MAX_CHANNELS);

  const next = { ...channels };
  for (const id of stalest) delete next[id];
  return next;
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  channels: {},

  isHydrated: (discussionId) => Boolean(get().channels[discussionId]?.hydrated),

  latestTimestamp: (discussionId) => {
    const messages = get().channels[discussionId]?.messages;
    return messages?.length ? messages[messages.length - 1].created_at : null;
  },

  setMessages: (discussionId, messages) =>
    set((state) => ({
      channels: evict({
        ...state.channels,
        [discussionId]: {
          messages: mergeById([], messages),
          hydrated: true,
          lastAccess: Date.now(),
        },
      }),
    })),

  mergeMessages: (discussionId, incoming) =>
    set((state) => {
      const existing = state.channels[discussionId];
      const merged = mergeById(existing?.messages ?? EMPTY, incoming);
      if (existing && merged === existing.messages) return state;

      return {
        channels: evict({
          ...state.channels,
          [discussionId]: {
            messages: merged,
            hydrated: existing?.hydrated ?? false,
            lastAccess: Date.now(),
          },
        }),
      };
    }),

  removeMessage: (discussionId, messageId) =>
    set((state) => {
      const existing = state.channels[discussionId];
      if (!existing) return state;

      const messages = existing.messages.filter((m) => m.id !== messageId);
      if (messages.length === existing.messages.length) return state;

      return {
        channels: {
          ...state.channels,
          [discussionId]: { ...existing, messages },
        },
      };
    }),

  touch: (discussionId) =>
    set((state) => {
      const existing = state.channels[discussionId];
      if (!existing) return state;
      return {
        channels: {
          ...state.channels,
          [discussionId]: { ...existing, lastAccess: Date.now() },
        },
      };
    }),
}));
