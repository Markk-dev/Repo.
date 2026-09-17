'use client';

import React from 'react';
import {
  MegaphoneSimple,
  Hash,
  BookmarkSimple,
  ChatCircleText,
  CheckFat,
  File,
  FlagBanner,
  PencilSimple,
  PushPin,
  StarFour,
  Quotes,
  Prohibit,
  FolderSimple,
  Tag,
  Bell,
} from '@phosphor-icons/react/dist/ssr';

export interface PhosphorIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  color?: string;
  mirrored?: boolean;
}

export interface DiscussionIconOption {
  id: string;
  name: string;
  component: React.ComponentType<PhosphorIconProps>;
}

export const DISCUSSION_ICON_OPTIONS: DiscussionIconOption[] = [
  { id: 'megaphone-simple', name: 'Megaphone', component: MegaphoneSimple },
  { id: 'hash', name: 'Hashtag', component: Hash },
  { id: 'folder', name: 'Folder', component: FolderSimple },
  { id: 'bookmark-simple', name: 'Bookmark', component: BookmarkSimple },
  { id: 'chat-circle-text', name: 'Chat', component: ChatCircleText },
  { id: 'check-fat', name: 'Check', component: CheckFat },
  { id: 'file', name: 'File', component: File },
  { id: 'flag-banner', name: 'Flag', component: FlagBanner },
  { id: 'pencil-simple', name: 'Pencil', component: PencilSimple },
  { id: 'push-pin', name: 'Pin', component: PushPin },
  { id: 'star-four', name: 'Star', component: StarFour },
  { id: 'quotes', name: 'Quotes', component: Quotes },
  { id: 'prohibit', name: 'Prohibit', component: Prohibit },
  { id: 'tag', name: 'Tag', component: Tag },
  { id: 'bell', name: 'Notification', component: Bell },
];

export function getDiscussionIcon(iconId?: string | null, isAnnouncement?: boolean): React.ComponentType<PhosphorIconProps> {
  if (isAnnouncement) return MegaphoneSimple;
  if (!iconId) return Hash;
  if (iconId === 'folder') return FolderSimple;
  const match = DISCUSSION_ICON_OPTIONS.find((opt) => opt.id === iconId);
  return match ? match.component : Hash;
}
