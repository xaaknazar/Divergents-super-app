import React, { useState } from 'react';
import { useEventResource } from '../state/useEventResource';
import { fetchMyEvents, type EventTarget } from '../data/eventManagement';
import { ListSection } from './ListSection';
import { ListRow } from './ListRow';
import { InlineNotice } from './InlineNotice';
import { Wrapper } from './Wrapper';
export function EventHistoryPanel({ onOpen }: { onOpen: (event: EventTarget) => void }) {
  const resource = useEventResource('my-events', fetchMyEvents); const [expanded, setExpanded] = useState(false);
  if (!resource.signedIn) return null;
  const events = resource.data?.events ?? [];
  if (!resource.error && !events.length) return null;
  return <ListSection header="Мои встречи">
    {resource.error ? <Wrapper padding={16}><InlineNotice message={resource.error} onRetry={resource.refresh} /></Wrapper> : null}
    {(expanded ? events : events.slice(0,3)).map(event => <ListRow key={`${event.kind}:${event.eventId}`} title={event.title}
      subtitle={`${event.finished ? 'Завершена' : 'Предстоит или идёт'}${event.isCreator ? ' · Вы организатор' : ''}${event.meetAt ? ` · ${event.meetAt.replace('T',' ').slice(0,16)}` : ''}`}
      chevron onPress={() => onOpen(event)} />)}
    {events.length > 3 ? <ListRow title={expanded ? 'Свернуть' : `Все встречи · ${events.length}`} onPress={() => setExpanded(v => !v)} /> : null}
  </ListSection>;
}
