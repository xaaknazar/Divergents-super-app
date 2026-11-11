import React, { useState } from 'react';
import { fetchAttendance, changeEvent, type ApplicantTarget } from '../data/eventManagement';
import { useEventResource } from '../state/useEventResource';
import { EventAttendanceReport } from './EventAttendanceReport';
import { EventMessageSheet } from './EventMessageSheet';

export function EventAttendancePanel({ applicant }: { applicant?: ApplicantTarget }) {
  const resource = useEventResource(`attendance:${JSON.stringify(applicant ?? 'self')}`, token => fetchAttendance(applicant, token));
  const [mode, setMode] = useState<'flag' | 'revoke'>();
  if (!resource.signedIn) return null;
  const current = resource.data?.flags.find(f => f.kind === applicant?.kind && f.eventId === applicant?.eventId);
  const save = async (body: Record<string,unknown>) => {
    if (!applicant) return;
    await changeEvent(applicant, { ...body, applicationId: applicant.applicationId }, await resource.getToken());
    await resource.refresh();
  };
  return <>
    <EventAttendanceReport flags={resource.data?.flags ?? []} visits={resource.data?.visits ?? []} loading={resource.loading} error={resource.error} own={!applicant} onRetry={resource.refresh}
      onMark={applicant && resource.data?.canMark ? () => setMode('flag') : undefined} onRevoke={applicant && resource.data?.canRevoke ? () => setMode('revoke') : undefined} />
    {mode ? <EventMessageSheet mode={mode} initialReason={current?.reason} initialNote={mode === 'flag' ? current?.note : undefined} onSave={save} onClose={() => setMode(undefined)} /> : null}
  </>;
}
