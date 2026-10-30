import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { CoursePurchasePanel } from './CoursePurchasePanel';
import { DetailScreen } from './DetailScreen';
import { BottomBar } from './BottomBar';
import { CourseOverview } from './CourseOverview';
import { CourseAccessCard } from './CourseAccessCard';
import { TextSection } from './TextSection';
import { CourseIncludes } from './CourseIncludes';
import { Wrapper } from './Wrapper';
import { demoDetailCourse } from '../storybook/detailFixtures';
const meta = { title: 'Courses/Purchase', component: CoursePurchasePanel,
  args: { priceLabel: '4 000 ₸', phase: 'idle', message: null,
    onBuy: () => {}, onRetry: () => {} } } satisfies Meta<typeof CoursePurchasePanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ready: Story = {};
export const TestFlight: Story = { args: { testMode: true } };
export const ReportedPrice: Story = { args: { testMode: true, priceLabel: '6,99\u00a0$' }, parameters: { scheme: 'dark', viewport: 'compact' } };
export const HighPrice: Story = { args: { priceLabel: '149\u202f990\u00a0₸' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Confirming: Story = { args: { phase: 'confirming' } };
export const Pending: Story = { args: { phase: 'pending', message: 'Покупка ожидает подтверждения. Повторно платить не нужно.' } };
export const Error: Story = { args: { phase: 'error', message: 'Не удалось проверить покупки. Попробуйте ещё раз.' } };
// Compose the same production components without auth, payment or real user data.
export const CoursePage: Story = {
  args: { priceLabel: '149\u202f990\u00a0₸', testMode: true },
  parameters: { scheme: 'dark', canvasLayout: 'screen' },
  render: args => <DetailScreen backLabel="Обучение" onBack={() => {}}
    footer={<BottomBar><CoursePurchasePanel {...args} /></BottomBar>}>
    <Wrapper padding={16} gap={20}>
      <CourseOverview course={demoDetailCourse} accessible={false} />
      <CourseAccessCard canBuy gifted={false} />
      <TextSection title="О курсе" text="Демонстрационный курс для проверки интерфейса. Программа, уроки и материалы открываются после подтверждения оплаты." />
      <CourseIncludes lessonCount={2} hasMaterials />
    </Wrapper>
  </DetailScreen>,
};
export const CoursePageLargeText: Story = { ...CoursePage, parameters: { ...CoursePage.parameters, textSize: 'xl', viewport: 'compact' } };
