import React from 'react';
import { StatusBadge } from './StatusBadge';

export interface ApplicationStatusBadgeProps {
  /** Unknown server states retain the previous pending fallback. */
  status: string;
  context?: 'application' | 'event' | 'participation';
}

export function ApplicationStatusBadge({ status, context = 'application' }: ApplicationStatusBadgeProps) {
  const accepted = status === 'approved' || status === 'going';
  const rejected = status === 'rejected' || status === 'cancelled';
  return <StatusBadge label={applicationStatusLabel(status, context)} tone={accepted ? 'success' : rejected ? 'danger' : 'neutral'} />;
}

/** Shared wording for badge text and the enclosing row's VoiceOver label. */
export function applicationStatusLabel(status: string, context: ApplicationStatusBadgeProps['context'] = 'application'): string {
  const accepted = status === 'approved' || status === 'going';
  const rejected = status === 'rejected' || status === 'cancelled';
  return accepted
    ? status === 'going' ? 'Идёт' : context === 'participation' ? 'Участвую' : 'Принят'
    : rejected ? status === 'cancelled' ? 'Снялся' : context === 'participation' ? 'Отклонена' : 'Отклонён'
    : context === 'event' ? 'Новая' : context === 'participation' ? 'На рассмотрении' : 'Новый';
}
