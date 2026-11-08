import React from 'react';
import { Screen } from './Screen';
import { NavHeader } from './NavHeader';
import { SeasonButton } from './SeasonButton';

/** All ranking screens share the same full-height scrolling and floating chrome. */
export function RankingScreenFrame({ children, onBack, season, onSeason, onRefresh, refreshing = false, resetKey }: {
  children: React.ReactNode; onBack: () => void; season?: number | null; onSeason?: () => void;
  onRefresh?: () => void | Promise<void>; refreshing?: boolean; resetKey?: string;
}) {
  return <Screen wash="strong" aurora={false} topInset={false} tabPadding={false}
    scrollResetKey={resetKey} onRefresh={onRefresh} refreshing={refreshing}
    header={<NavHeader onBack={onBack} onWash trailing={onSeason ? <SeasonButton season={season} onPress={onSeason} /> : undefined} />}>
    {children}
  </Screen>;
}
