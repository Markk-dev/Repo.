'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MegaphoneSimple,
  Hash,
  PaperPlaneTilt,
  PlusCircle,
  FileArrowUp,
  ChartBarHorizontal,
  CircleNotch,
  WarningCircle,
  ThumbsUp,
  Heart,
  HandsClapping,
  ArrowBendUpLeft,
  ClipboardText,
  DotsThree,
  Check,
  X,
  Trash,
} from '@phosphor-icons/react/dist/ssr';
import { useDiscussionMessages, MessageItem } from '@/hooks/useDiscussionMessages';
import { PopoverMenu } from '@/components/ui/PopoverMenu';
import { getDiscussionIcon } from '@/components/icons/DiscussionIcons';

export type EmojiReactionType = 'thumbs-up' | 'heart' | 'hands-clapping';

interface DiscussionChatViewProps {
  discussionId: string | null;
  channelName?: string;
  channelTopic?: string;
  channelIcon?: string;
  isAnnouncement?: boolean;
  currentEmployee: any;
  onDiscussionResolved?: (id: string) => void;
  onRefreshAnnouncement?: () => void;
}

// Format message timestamp (e.g., "Today at 4:53 AM", "Yesterday at 2:15 PM", "Sep 14, 4:53 AM")
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const timeStr = date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    }
    if (isYesterday) {
      return `Yesterday at ${timeStr}`;
    }

    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
  } catch {
    return '';
  }
}

// Get deterministic avatar color based on employee name
function getAvatarColor(name: string): string {
  const colors = [
    '#00ba58', // Emerald green
    '#1d4ed8', // Royal blue
    '#b45309', // Warm amber
    '#7c3aed', // Purple
    '#0284c7', // Sky blue
    '#dc2626', // Crimson
    '#4f46e5', // Indigo
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Helper to render emoji icon
function renderReactionIcon(type: EmojiReactionType, size = 14) {
  switch (type) {
    case 'thumbs-up':
      return <ThumbsUp size={size} weight="fill" color="#2563EB" />;
    case 'heart':
      return <Heart size={size} weight="fill" color="#f43f5e" />;
    case 'hands-clapping':
      return <HandsClapping size={size} weight="fill" color="#e5a00d" />;
  }
}

function getReactionLabel(type: EmojiReactionType) {
  switch (type) {
    case 'thumbs-up':
      return 'thumbs up';
    case 'heart':
      return 'heart';
    case 'hands-clapping':
      return 'clapping hands';
  }
}

// Skeleton loader row for messages being loaded
function MessageSkeleton({ index }: { index: number }) {
  const widths = ['60%', '45%', '75%', '55%'];
  const nameWidths = ['90px', '70px', '110px', '80px'];
  return (
    <div className="discord-skeleton-message" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="discord-skeleton-avatar" />
      <div className="discord-skeleton-body">
        <div className="discord-skeleton-header">
          <div className="discord-skeleton-name" style={{ width: nameWidths[index % nameWidths.length] }} />
          <div className="discord-skeleton-time" />
        </div>
        <div className="discord-skeleton-text" style={{ width: widths[index % widths.length] }} />
      </div>
    </div>
  );
}

export function DiscussionChatView({
  discussionId,
  channelName = 'announcements',
  channelTopic,
  channelIcon,
  isAnnouncement = false,
  currentEmployee,
  onDiscussionResolved,
  onRefreshAnnouncement,
}: DiscussionChatViewProps) {
  const [inputText, setInputText] = useState('');
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [reactions, setReactions] = useState<
    Record<string, Partial<Record<EmojiReactionType, { count: number; userReacted: boolean; direction?: 'up' | 'down' }>>>
  >({});
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string; content: string } | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>('top');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const menuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const prevScrollHeightRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);

  const ChannelIconComponent = getDiscussionIcon(channelIcon, isAnnouncement);

  const {
    messages,
    loading,
    error,
    hasMore,
    loadingOlder,
    fetchOlderMessages,
    sendMessage,
    deleteMessage,
  } = useDiscussionMessages(discussionId, currentEmployee, {
    isAnnouncement,
    onDiscussionResolved,
    onDiscussionNotFound: onRefreshAnnouncement,
  });

  // Auto-scroll to bottom on initial load and new messages (not when loading older)
  useEffect(() => {
    if (isInitialLoadRef.current && messages.length > 0 && !loading) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
      isInitialLoadRef.current = false;
      return;
    }

    if (scrollContainerRef.current && prevScrollHeightRef.current > 0) {
      const newScrollHeight = scrollContainerRef.current.scrollHeight;
      const delta = newScrollHeight - prevScrollHeightRef.current;
      if (delta > 0) {
        scrollContainerRef.current.scrollTop += delta;
      }
      prevScrollHeightRef.current = 0;
      return;
    }

    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom && messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
    }
  }, [messages, loading]);

  // Global listener to close popover menu on outside click or Escape
  useEffect(() => {
    if (!activeMenuMsgId) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.discord-custom-popover-menu') || target.closest('.discord-action-btn')) {
        return;
      }
      setActiveMenuMsgId(null);
      setHoveredMsgId(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuMsgId(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuMsgId]);

  // Instant scroll snap when discussion changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [discussionId, isAnnouncement]);

  // IntersectionObserver for lazy loading older messages on scroll-up
  useEffect(() => {
    if (!sentinelRef.current || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loadingOlder && !loading) {
          if (scrollContainerRef.current) {
            prevScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
          }
          fetchOlderMessages();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '200px 0px 0px 0px',
        threshold: 0,
      }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadingOlder, loading, fetchOlderMessages]);

  // User can only react with 1 emoji per message
  const handleToggleReaction = useCallback((messageId: string, type: EmojiReactionType) => {
    setReactions((prev) => {
      const msgReactions = prev[messageId] || {};
      const current = msgReactions[type] || { count: 0, userReacted: false };
      const nextUserReacted = !current.userReacted;

      const newMsgReactions: Partial<Record<EmojiReactionType, { count: number; userReacted: boolean; direction?: 'up' | 'down' }>> = {};
      const allTypes: EmojiReactionType[] = ['thumbs-up', 'heart', 'hands-clapping'];

      for (const t of allTypes) {
        const existing = msgReactions[t] || { count: 0, userReacted: false };
        if (t === type) {
          newMsgReactions[t] = {
            count: nextUserReacted ? existing.count + 1 : Math.max(0, existing.count - 1),
            userReacted: nextUserReacted,
            direction: nextUserReacted ? 'up' : 'down',
          };
        } else if (existing.userReacted) {
          // Remove previous reaction by current user
          newMsgReactions[t] = {
            count: Math.max(0, existing.count - 1),
            userReacted: false,
            direction: 'down',
          };
        } else {
          newMsgReactions[t] = existing;
        }
      }

      return {
        ...prev,
        [messageId]: newMsgReactions,
      };
    });
  }, []);

  const handleCopyMessage = useCallback((messageId: string, text: string) => {
    if (typeof window !== 'undefined' && navigator?.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
      setCopiedMsgId(messageId);
      setTimeout(() => {
        setCopiedMsgId((current) => (current === messageId ? null : current));
      }, 1800);
    }
  }, []);

  const handleReplyMessage = useCallback((msg: MessageItem, authorName: string) => {
    setReplyingTo({ id: msg.id, authorName, content: msg.content });
    chatInputRef.current?.focus();
  }, []);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    setActiveMenuMsgId(null);
    await deleteMessage(messageId);
  }, [deleteMessage]);

  const scrollToMessage = useCallback((targetMsgId: string) => {
    if (!targetMsgId) return;
    const el = document.getElementById(`msg-${targetMsgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('discord-message-highlight');
      setTimeout(() => {
        el.classList.remove('discord-message-highlight');
      }, 2000);
    }
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || (!discussionId && !isAnnouncement)) return;

    const content = inputText;
    const currentReply = replyingTo;
    setInputText('');
    setReplyingTo(null);
    await sendMessage(content, currentReply);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholderText = isAnnouncement
    ? 'Post an Announcement...'
    : replyingTo
    ? `Replying to @${replyingTo.authorName}...`
    : `Message #${channelName}...`;

  // Render floating action bar for a message row
  const renderMessageActions = (msg: MessageItem, authorName: string) => {
    const isCopied = copiedMsgId === msg.id;
    const isMenuOpen = activeMenuMsgId === msg.id;
    const isOwnMessage =
      (msg.employee?.id && currentEmployee?.id && msg.employee.id === currentEmployee.id) ||
      (msg.employee?.name && currentEmployee?.name && msg.employee.name === currentEmployee.name);

    const isVisible = hoveredMsgId === msg.id || isMenuOpen;
    if (!isVisible) return null;

    return (
      <div className={`discord-message-actions ${isMenuOpen ? 'has-active-menu' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Emoji 1: Thumbs-up (Blue) */}
        <button
          type="button"
          className="discord-action-btn emoji-btn"
          data-tooltip={isMenuOpen ? undefined : "Like"}
          aria-label="React with thumbs up"
          onClick={() => handleToggleReaction(msg.id, 'thumbs-up')}
        >
          <ThumbsUp size={16} weight="fill" color="#2563EB" />
        </button>

        {/* Emoji 2: Heart */}
        <button
          type="button"
          className="discord-action-btn emoji-btn"
          data-tooltip={isMenuOpen ? undefined : "Love"}
          aria-label="React with heart"
          onClick={() => handleToggleReaction(msg.id, 'heart')}
        >
          <Heart size={16} weight="fill" color="#f43f5e" />
        </button>

        {/* Emoji 3: Hands-clapping */}
        <button
          type="button"
          className="discord-action-btn emoji-btn"
          data-tooltip={isMenuOpen ? undefined : "Applause"}
          aria-label="React with clapping hands"
          onClick={() => handleToggleReaction(msg.id, 'hands-clapping')}
        >
          <HandsClapping size={16} weight="fill" color="#e5a00d" />
        </button>

        {/* Divider */}
        <div className="discord-action-divider" />

        {/* Reply */}
        <button
          type="button"
          className="discord-action-btn"
          data-tooltip={isMenuOpen ? undefined : "Reply"}
          aria-label="Reply to message"
          onClick={() => handleReplyMessage(msg, authorName)}
        >
          <ArrowBendUpLeft size={16} weight="bold" />
        </button>

        {/* Copy Text with Clipboard Icon */}
        <button
          type="button"
          className="discord-action-btn"
          data-tooltip={isMenuOpen ? undefined : (isCopied ? 'Copied!' : 'Copy Text')}
          aria-label="Copy message text"
          onClick={() => handleCopyMessage(msg.id, msg.content)}
        >
          {isCopied ? (
            <Check size={16} weight="bold" color="#00ba58" />
          ) : (
            <ClipboardText size={16} weight="regular" />
          )}
        </button>

        {/* 3-Dots More Menu */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            ref={(el) => {
              if (el) menuButtonRefs.current.set(msg.id, el);
              else menuButtonRefs.current.delete(msg.id);
            }}
            className={`discord-action-btn ${isMenuOpen ? 'active-menu-open' : ''}`}
            data-tooltip={isMenuOpen ? undefined : "More Options"}
            aria-label="More message options"
            onClick={(e) => {
              e.stopPropagation();
              if (activeMenuMsgId === msg.id) {
                setActiveMenuMsgId(null);
              } else {
                const rect = e.currentTarget.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                setMenuPlacement(spaceBelow < 260 ? 'top' : 'bottom');
                setActiveMenuMsgId(msg.id);
              }
            }}
          >
            <DotsThree size={18} weight="bold" />
          </button>

          {isMenuOpen && (
            <div
              className={`discord-custom-popover-menu open-${menuPlacement}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Quick Emoji Reactions Row */}
              <div className="discord-menu-emoji-bar">
                <button
                  type="button"
                  className="discord-menu-emoji-tile"
                  title="Thumbs Up"
                  onClick={() => {
                    handleToggleReaction(msg.id, 'thumbs-up');
                    setActiveMenuMsgId(null);
                  }}
                >
                  <ThumbsUp size={18} weight="fill" color="#2563EB" />
                </button>
                <button
                  type="button"
                  className="discord-menu-emoji-tile"
                  title="Heart"
                  onClick={() => {
                    handleToggleReaction(msg.id, 'heart');
                    setActiveMenuMsgId(null);
                  }}
                >
                  <Heart size={18} weight="fill" color="#f43f5e" />
                </button>
                <button
                  type="button"
                  className="discord-menu-emoji-tile"
                  title="Hands Clapping"
                  onClick={() => {
                    handleToggleReaction(msg.id, 'hands-clapping');
                    setActiveMenuMsgId(null);
                  }}
                >
                  <HandsClapping size={18} weight="fill" color="#e5a00d" />
                </button>
              </div>

              <div className="discord-menu-divider" />

              {/* Action: Reply */}
              <button
                type="button"
                className="discord-menu-item"
                onClick={() => {
                  handleReplyMessage(msg, authorName);
                  setActiveMenuMsgId(null);
                }}
              >
                <ArrowBendUpLeft size={16} weight="bold" />
                <span>Reply</span>
              </button>

              {/* Action: Copy Text */}
              <button
                type="button"
                className="discord-menu-item"
                onClick={() => {
                  handleCopyMessage(msg.id, msg.content);
                  setActiveMenuMsgId(null);
                }}
              >
                <ClipboardText size={16} weight="regular" />
                <span>Copy Text</span>
              </button>

              {/* Action: Copy Message ID */}
              <button
                type="button"
                className="discord-menu-item"
                onClick={() => {
                  if (typeof window !== 'undefined' && navigator?.clipboard) {
                    navigator.clipboard.writeText(msg.id).catch(() => {});
                  }
                  setActiveMenuMsgId(null);
                }}
              >
                <Hash size={16} weight="regular" />
                <span>Copy Message ID</span>
              </button>

              {/* Action: Delete Message (Only if own message) */}
              {isOwnMessage && (
                <>
                  <div className="discord-menu-divider" />
                  <button
                    type="button"
                    className="discord-menu-item danger"
                    onClick={() => handleDeleteMessage(msg.id)}
                  >
                    <Trash size={16} weight="bold" color="#EF4444" />
                    <span>Delete Message</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render reaction pills list under message
  const renderReactionBadges = (msgId: string) => {
    const msgReactions = reactions[msgId];
    if (!msgReactions) return null;

    const activeEntries = (Object.entries(msgReactions) as [EmojiReactionType, { count: number; userReacted: boolean; direction?: 'up' | 'down' }][])
      .filter(([_, r]) => r && r.count > 0);

    if (activeEntries.length === 0) return null;

    return (
      <div className="discord-reactions-list">
        {activeEntries.map(([type, r]) => (
          <button
            key={type}
            type="button"
            className={`discord-reaction-pill ${r.userReacted ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleReaction(msgId, type);
            }}
            title={r.userReacted ? `Remove ${getReactionLabel(type)}` : `React with ${getReactionLabel(type)}`}
          >
            <span className="reaction-emoji-icon">{renderReactionIcon(type, 13)}</span>
            <span className="reaction-count-wrapper">
              <span
                key={`${msgId}-${type}-${r.count}`}
                className={`reaction-count ${r.direction === 'up' ? 'anim-slide-up' : r.direction === 'down' ? 'anim-slide-down' : ''}`}
              >
                {r.count}
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="discord-chat-wrapper">
      {/* Scrollable Message History Area */}
      <div
        className="discord-scrollable-content"
        ref={scrollContainerRef}
        onMouseLeave={() => {
          if (!activeMenuMsgId) setHoveredMsgId(null);
        }}
      >
        {/* Sentinel for IntersectionObserver */}
        <div ref={sentinelRef} className="discord-load-more-sentinel" />

        {/* Skeleton Loaders for Backward Pagination */}
        {loadingOlder && (
          <div className="discord-skeleton-loader-group">
            {[0, 1, 2, 3].map((i) => (
              <MessageSkeleton key={`skeleton-${i}`} index={i} />
            ))}
          </div>
        )}

        {/* Channel Welcoming Header Banner */}
        {!hasMore && (
          <div className="discord-channel-welcome-banner">
            <div className="welcome-banner-header-row">
              <div className="welcome-banner-icon-circle">
                <ChannelIconComponent
                  size={30}
                  weight={isAnnouncement ? 'duotone' : (!channelIcon || channelIcon === 'hash' ? 'bold' : 'regular')}
                />
              </div>
              <div className="welcome-banner-text-content">
                <h2 className="welcome-banner-title">
                  Welcome to #{channelName}!
                </h2>
                <p className="welcome-banner-desc">
                  {channelTopic ||
                    (isAnnouncement
                      ? 'This is the start of the official department announcements and notices channel.'
                      : `This is the beginning of the #${channelName} discussion channel.`)}
                </p>
              </div>
            </div>
            <div className="welcome-banner-divider" />
          </div>
        )}

        {/* Loading Spinner */}
        {loading && messages.length === 0 && (
          <div className="discord-chat-loading">
            <CircleNotch size={24} weight="bold" className="spin-animate" />
            <span>Loading messages...</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="discord-chat-error-banner">
            <WarningCircle size={18} weight="bold" />
            <span>{error}</span>
          </div>
        )}

        {/* Message Feed */}
        <div className="discord-messages-list">
          {(() => {
            let lastHeaderMsg: MessageItem | null = null;

            return messages.map((msg: MessageItem) => {
              const authorName = msg.employee?.name || 'Department Staff';
              const authorPos = msg.employee?.position || '';
              const avatarLetter = authorName.charAt(0).toUpperCase();
              const avatarBg = getAvatarColor(authorName);
              const timeFormatted = formatTimestamp(msg.created_at);

              const replyAttachment = Array.isArray(msg.attachments)
                ? msg.attachments.find((att: any) => att && (att.type === 'reply' || att.authorName || att.reply_to))
                : null;

              // Check if same author as current cluster header (never consecutive if it has a reply reference)
              const isSameAuthor =
                lastHeaderMsg &&
                ((lastHeaderMsg.employee?.id && msg.employee?.id && lastHeaderMsg.employee.id === msg.employee.id) ||
                  (lastHeaderMsg.employee?.name && msg.employee?.name && lastHeaderMsg.employee.name === msg.employee.name));

              // Nest if within 1 minute (60 seconds) of the header message
              const timeDiff = lastHeaderMsg
                ? Math.abs(Date.parse(msg.created_at) - Date.parse(lastHeaderMsg.created_at))
                : Infinity;
              const isConsecutive = isSameAuthor && !replyAttachment && !Number.isNaN(timeDiff) && timeDiff <= 60 * 1000;

              const isHovered = hoveredMsgId === msg.id || activeMenuMsgId === msg.id;

              if (isConsecutive) {
                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`discord-message-row consecutive ${msg.isOptimistic ? 'optimistic' : ''} ${msg.failed ? 'failed' : ''} ${isHovered ? 'has-hover' : ''}`}
                    onMouseEnter={() => {
                      if (!activeMenuMsgId) {
                        setHoveredMsgId(msg.id);
                      }
                    }}
                    onMouseLeave={() => {
                      if (!activeMenuMsgId) {
                        setHoveredMsgId((curr) => (curr === msg.id ? null : curr));
                      }
                    }}
                  >
                    {/* Hover Floating Action Bar */}
                    {renderMessageActions(msg, authorName)}

                    <div className="consecutive-timestamp-gutter">
                      <span className="gutter-time">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                    <div className="discord-message-content">
                      {msg.content}
                      {msg.failed && (
                        <span className="msg-failed-indicator">Failed to send</span>
                      )}
                      {renderReactionBadges(msg.id)}
                    </div>
                  </div>
                );
              }

              // Starts a new message group / header
              lastHeaderMsg = msg;

              return (
                <div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  className={`discord-message-row ${msg.isOptimistic ? 'optimistic' : ''} ${msg.failed ? 'failed' : ''} ${isHovered ? 'has-hover' : ''}`}
                  onMouseEnter={() => {
                    if (!activeMenuMsgId) {
                      setHoveredMsgId(msg.id);
                    }
                  }}
                  onMouseLeave={() => {
                    if (!activeMenuMsgId) {
                      setHoveredMsgId((curr) => (curr === msg.id ? null : curr));
                    }
                  }}
                >
                  {/* Hover Floating Action Bar */}
                  {renderMessageActions(msg, authorName)}

                  {/* User Avatar */}
                  <div
                    className="discord-message-avatar"
                    style={{ backgroundColor: avatarBg }}
                    title={authorName}
                  >
                    {avatarLetter}
                  </div>

                  {/* Message Details */}
                  <div className="discord-message-body">
                    <div className="discord-message-header">
                      <span className="discord-message-author">{authorName}</span>
                      {authorPos && (
                        <span className="discord-message-badge">{authorPos}</span>
                      )}
                      <span className="discord-message-timestamp">{timeFormatted}</span>
                    </div>

                    <div className="discord-message-content">
                      {msg.content}

                      {/* Reply Reference branch under the message */}
                      {replyAttachment && (
                        <div
                          className="discord-message-reply-branch"
                          onClick={() => scrollToMessage(replyAttachment.id)}
                          title={`Jump to @${replyAttachment.authorName}'s message`}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="reply-branch-spine" aria-hidden="true" />
                          <div className="reply-branch-content">
                            <ArrowBendUpLeft size={12} weight="bold" className="reply-branch-icon" />
                            <span className="reply-branch-author">@{replyAttachment.authorName}</span>
                            <span className="reply-branch-text">{replyAttachment.content}</span>
                          </div>
                        </div>
                      )}

                      {msg.failed && (
                        <span className="msg-failed-indicator">Failed to send</span>
                      )}
                      {renderReactionBadges(msg.id)}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Message Input Bar */}
      <div className="discord-chat-container">
        {/* Reply Indicator Preview if Replying */}
        {replyingTo && (
          <div className="discord-reply-indicator">
            <div className="discord-reply-indicator-left">
              <ArrowBendUpLeft size={14} weight="bold" color="#635952" />
              <span>
                Replying to <span className="discord-reply-indicator-author">@{replyingTo.authorName}</span>
              </span>
            </div>
            <button
              type="button"
              className="discord-reply-close-btn"
              title="Cancel reply"
              aria-label="Cancel reply"
              onClick={() => setReplyingTo(null)}
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className={`discord-chat-bar ${replyingTo ? 'has-reply' : ''}`} ref={attachMenuRef}>
          <PopoverMenu
            isOpen={attachMenuOpen}
            onClose={() => setAttachMenuOpen(false)}
            anchorRef={attachMenuRef}
            align="left"
            items={[
              {
                id: 'upload-image',
                label: 'Upload Image',
                icon: <FileArrowUp size={18} weight="regular" />,
                onClick: () => {
                  setAttachMenuOpen(false);
                  fileInputRef.current?.click();
                },
              },
              {
                id: 'create-poll',
                label: 'Create Poll',
                icon: <ChartBarHorizontal size={18} weight="regular" />,
                onClick: () => {
                  setAttachMenuOpen(false);
                },
              },
            ]}
          />

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                console.log('Selected image file:', file.name);
              }
              e.target.value = '';
            }}
          />

          <button
            type="button"
            className={`discord-chat-attach-btn ${attachMenuOpen ? 'active' : ''}`}
            title="Attach Document or File"
            aria-label="Attach file"
            aria-expanded={attachMenuOpen}
            aria-haspopup="menu"
            onClick={() => setAttachMenuOpen(!attachMenuOpen)}
          >
            <PlusCircle size={22} weight="fill" />
          </button>

          <input
            type="text"
            ref={chatInputRef}
            className="discord-chat-input"
            placeholder={placeholderText}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label={placeholderText}
            autoComplete="off"
            spellCheck={false}
            disabled={!discussionId && !isAnnouncement}
          />

          <div className="discord-chat-actions">
            <button
              type="submit"
              className={`discord-chat-action-btn ${inputText.trim() ? 'active' : ''}`}
              title="Send message"
              aria-label="Send"
              disabled={!inputText.trim() || (!discussionId && !isAnnouncement)}
            >
              <PaperPlaneTilt size={18} weight="bold" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


