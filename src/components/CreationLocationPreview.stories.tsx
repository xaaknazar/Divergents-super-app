import type { Meta,StoryObj } from '@storybook/react-native';
import { CreationLocationPreview } from './CreationLocationPreview';
const meta = { title: 'Создание/CreationLocationPreview', component: CreationLocationPreview,
  args: { location: 'Демонстрация: Алматы, парк', coordinate: { latitude: 43.258, longitude: 76.953 } },
} satisfies Meta<typeof CreationLocationPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const InvalidCoordinate: Story = { args: { coordinate: { latitude: 100, longitude: 0 } } };
