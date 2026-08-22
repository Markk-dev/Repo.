'use client';

import React from 'react';
import Link from 'next/link';
import { House, Compass } from '@phosphor-icons/react';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';

function Stacked404Illustration() {
  return (
    <div aria-hidden="true" className="not-found-illustration-box">
      <div className="not-found-card back-card" />
      <div className="not-found-card mid-card" />
      <div className="not-found-card front-card">
        <div className="not-found-icon-chip">
          <Compass size={22} weight="duotone" className="not-found-compass-icon" />
        </div>
        <div className="not-found-card-lines">
          <div className="not-found-line title-line" />
          <div className="not-found-line sub-line" />
        </div>
        <span className="not-found-badge">404</span>
      </div>
      <div className="not-found-fade-overlay" />
    </div>
  );
}

export default function NotFound() {
  return (
    <main className="not-found-container">
      <Empty className="not-found-empty">
        <EmptyHeader className="not-found-header">
          <EmptyMedia>
            <Stacked404Illustration />
          </EmptyMedia>
          <EmptyTitle className="not-found-title">Page Not Found</EmptyTitle>
          <EmptyDescription className="not-found-desc">
            The page you are looking for doesn&apos;t exist, has been removed, or is temporarily unavailable.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent className="not-found-actions">
          <Link href="/" className="discord-modal-btn discord-modal-btn-save" style={{ textDecoration: 'none' }}>
            <House size={16} weight="bold" />
            <span>Back to Home</span>
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}
