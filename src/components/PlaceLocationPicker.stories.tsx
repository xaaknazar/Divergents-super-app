import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { PlaceLocationPicker } from './PlaceLocationPicker';
const meta = { title: 'Карта/PlaceLocationPicker', component: PlaceLocationPicker,
  args: { coordinate: { latitude: 43.2389, longitude: 76.8897 }, city: 'Алматы', country: 'Казахстан', onChange: () => {} },
  render: function Preview(args) {
    const [coordinate, setCoordinate] = useState(args.coordinate);
    return <PlaceLocationPicker {...args} coordinate={coordinate} onChange={setCoordinate} />;
  },
} satisfies Meta<typeof PlaceLocationPicker>;
export default meta;
export const Light: StoryObj<typeof meta> = {};
export const Dark: StoryObj<typeof meta> = { parameters: { scheme: 'dark' } };
