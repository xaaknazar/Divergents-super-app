import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingBookField } from './ReadingBookField';
const noop = () => {};
const meta = { title: 'Reading/ReadingBookField', component: ReadingBookField,
  args: { status: 'empty', title: '', author: '', onChangeTitle: noop, onChangeAuthor: noop, onCheck: noop, onEdit: noop } } satisfies Meta<typeof ReadingBookField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Filled: Story = { args: { title: 'Атомные привычки', author: 'Джеймс Клир' } };
export const Checking: Story = { args: { status: 'checking', title: 'Атомные привычки', author: 'Джеймс Клир' } };
export const SuggestedOne: Story = { args: { status: 'suggested', title: 'атомные привычки', suggestions: [{ title: 'Атомные привычки', author: 'Джеймс Клир' }], onPick: noop, onReject: noop } };
export const SuggestedMany: Story = { args: { status: 'suggested', title: 'мастер', suggestions: [
  { title: 'Мастер и Маргарита', author: 'Михаил Булгаков' }, { title: 'Мастер игры', author: 'Роберт Грин' }, { title: 'Мастерство', author: 'Роберт Грин' }], onPick: noop, onReject: noop } };
export const SuggestedDark: Story = { args: { ...SuggestedOne.args }, parameters: { scheme: 'dark' } };
export const SuggestedLargeText: Story = { args: { ...SuggestedOne.args }, parameters: { textSize: 'xl', viewport: 'compact' } };
export const Verified: Story = { args: { status: 'verified', title: 'Атомные привычки', author: 'Джеймс Клир' } };
export const VerifiedLocked: Story = { args: { status: 'verified', title: 'Атомные привычки', author: 'Джеймс Клир', locked: true } };
export const NotFound: Story = { args: { status: 'notFound', title: 'Атомные привычкиии', author: 'Клир' } };
export const NotFoundManual: Story = { args: { status: 'notFound', title: 'Моя редкая книга', author: 'Местный автор', onManual: noop } };
export const VerifiedManual: Story = { args: { status: 'verified', title: 'Моя редкая книга', author: 'Местный автор', manual: true } };
export const ServiceError: Story = { args: { status: 'error', title: 'Атомные привычки', author: '', error: 'Слишком много проверок. Повторите через минуту.' } };
export const Dark: Story = { args: { status: 'verified', title: 'Атомные привычки', author: 'Джеймс Клир' }, parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { status: 'notFound', title: 'Сто лет одиночества', author: 'Габриэль Гарсиа Маркес' }, parameters: { textSize: 'xl', viewport: 'compact' } };
