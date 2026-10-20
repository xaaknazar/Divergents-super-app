import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ReadingApplicantsContent, type ReadingApplicantsContentProps } from '../ReadingApplicantsContent';
import { ReadingApplicantProfile } from '../ReadingApplicantProfile';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { readingApplicantFixture, readingApplicantsFixture } from '../../storybook/readingApplicantFixtures';
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
const props = (): ReadingApplicantsContentProps => ({ data: readingApplicantsFixture, loading: false, busy: false, profileLoading: false,
  onRetry: jest.fn(), onSelect: jest.fn(), onClose: jest.fn(), onRetryProfile: jest.fn(), onDecide: jest.fn(), onRetryDecision: jest.fn() });
test('list opens a scoped application without rendering private profile fields', async () => {
  const p = props(); const v = await render(<ThemePreviewProvider><ReadingApplicantsContent {...p} /></ThemePreviewProvider>);
  expect(v.queryByText('reader@example.test')).toBeNull();
  await fireEvent.press(v.getByRole('button', { name: /BookReader/ })); expect(p.onSelect).toHaveBeenCalledWith('demo-applicant');
});
test('questionnaire loading and uncertain delivery disable conflicting decisions', async () => {
  const p = props(); p.selectedId = 'demo-applicant'; p.profileLoading = true;
  const v = await render(<ThemePreviewProvider><ReadingApplicantsContent {...p} /></ThemePreviewProvider>);
  expect(v.getByRole('button', { name: 'Принять в команду' })).toBeDisabled();
  await v.rerender(<ThemePreviewProvider><ReadingApplicantsContent {...p} profileLoading={false} applicant={readingApplicantFixture} pendingDecision="approved" /></ThemePreviewProvider>);
  expect(v.getByRole('button', { name: 'Отклонить заявку' })).toBeDisabled();
  await fireEvent.press(v.getByRole('button', { name: 'Проверить решение' })); expect(p.onRetryDecision).toHaveBeenCalled();
});
test('accept and reject require explicit confirmation and only send the selected member id', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const p = props(); p.selectedId = 'demo-applicant'; p.applicant = readingApplicantFixture;
  const v = await render(<ThemePreviewProvider><ReadingApplicantsContent {...p} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: 'Принять в команду' })); expect(p.onDecide).not.toHaveBeenCalled();
  alert.mock.calls[0][2]?.[1].onPress?.(); expect(p.onDecide).toHaveBeenCalledWith('demo-applicant', 'approved');
  await fireEvent.press(v.getByRole('button', { name: 'Отклонить заявку' }));
  alert.mock.calls[1][2]?.[1].onPress?.(); expect(p.onDecide).toHaveBeenCalledWith('demo-applicant', 'rejected'); alert.mockRestore();
});
test('profile outage says unavailable, not unfilled, and offers retry', async () => {
  const retry = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingApplicantProfile applicant={{ ...readingApplicantFixture, profile: null, profileStatus: 'unavailable' }} onRetry={retry} /></ThemePreviewProvider>);
  expect(v.getByText(/Это не означает/)).toBeTruthy();
  await fireEvent.press(v.getByRole('button', { name: 'Повторить загрузку анкеты' })); expect(retry).toHaveBeenCalled();
});
test('closed scheduled recruitment exposes no approval controls', async () => {
  const p = props(); p.selectedId = 'demo-applicant'; p.data = { ...readingApplicantsFixture, mode: 'scheduled', phase: 'active' }; p.applicant = readingApplicantFixture;
  const v = await render(<ThemePreviewProvider><ReadingApplicantsContent {...p} /></ThemePreviewProvider>);
  expect(v.queryByRole('button', { name: 'Принять в команду' })).toBeNull();
  expect(v.getByText(/Набор в этот челлендж завершён/)).toBeTruthy();
});
