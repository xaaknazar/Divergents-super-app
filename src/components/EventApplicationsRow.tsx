import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { tr } from '../state/LanguageContext';
import * as pl from '../data/plural';
import { ListRow } from './ListRow';
import { ListSection } from './ListSection';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';
import { Wrapper } from './Wrapper';

/** Management is granted by the event API, never by application status. */
export function EventApplicationsRow({ canManage, pendingCount, onPress }: {
  canManage: boolean; pendingCount: number; onPress: () => void;
}) {
  const { T } = useTheme();
  if (!canManage) return null;
  return <ListSection header={tr('Организатору')}>
    <ListRow title={tr('Заявки')}
      leading={<Wrapper width={24} align="center"><SF name="person.2.fill" size={18} color={T.brandText} /></Wrapper>}
      subtitle={pendingCount > 0 ? `${pl.applications(pendingCount)} ждут решения` : tr('Все заявки рассмотрены')}
      trailing={pendingCount > 0 ? <Wrapper align="center" justify="center"><StatusBadge label={String(pendingCount)} tone="warning" /></Wrapper> : undefined}
      chevron onPress={onPress} />
  </ListSection>;
}
