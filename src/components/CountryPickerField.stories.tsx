import type { Meta, StoryObj } from '@storybook/react-native';
import React, { useState } from 'react';
import { CountryPickerField } from './CountryPickerField';
const meta = { title: 'Liven/CountryPickerField', component: CountryPickerField, 
  args: { value: ['Казахстан'], onChange: () => {}, label: 'Посещённые страны', accessibilityLabel: 'Посещённые страны' },
} satisfies Meta<typeof CountryPickerField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Interactive: Story = { render: function Render(args) { const [value, setValue] = useState(args.value); return <CountryPickerField {...args} value={value} onChange={setValue} />; } };
