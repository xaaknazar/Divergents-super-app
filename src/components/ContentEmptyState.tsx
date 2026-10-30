import React from 'react';
import { EmptyState,ErrorState } from './StateViews';

export function ContentEmptyState({ error, onRetry, icon, title, subtitle }: { error: boolean; onRetry?: () => void; icon: string; title: string; subtitle: string }) {
  if (error) return <ErrorState onRetry={onRetry} />;
  return <EmptyState icon={icon} title={title} subtitle={subtitle} />;
}
