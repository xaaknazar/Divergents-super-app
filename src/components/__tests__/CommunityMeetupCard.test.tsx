import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CommunityMeetupCard } from '../CommunityMeetupCard';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { meetup } from '../../storybook/communityFixtures';
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../data/api', () => ({ imgUrl: (url: string) => url }));

it('shows the city without a venue and opens the event', async () => {
  const onPress = jest.fn();
  const view = await render(<ThemePreviewProvider scheme="light"><CommunityMeetupCard meetup={{ ...meetup, place: '' }} onPress={onPress} /></ThemePreviewProvider>);
  expect(view.getByText('Алматы')).toBeTruthy();
  expect(view.getByText('Активное мероприятие')).toBeTruthy();
  fireEvent.press(view.getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
it('does not invent a city for older events without one', async () => {
  const view = await render(<ThemePreviewProvider scheme="dark"><CommunityMeetupCard meetup={{ ...meetup, city: '' }} onPress={jest.fn()} /></ThemePreviewProvider>);
  expect(view.getByText('Город не указан')).toBeTruthy();
  expect(view.getByText(meetup.place)).toBeTruthy();
});
