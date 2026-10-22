import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingBookshelf } from './ReadingBookshelf';
import { readingBookExample } from '../storybook/readingFixtures';
const noop = () => {};
const library = { busy: false, books: [readingBookExample, { ...readingBookExample, key: 'b', title: 'Пять уровней лидерства', author: 'Джон Максвелл', pages: 0, elapsedMs: 0 }],
  retry: noop, select: noop };
const composer = { supported: true, adding: false, reset: noop, save: async () => true,
  draft: { title: '', author: '', status: 'empty' as const, verified: null, suggestions: [],
    pick: noop, reject: noop, manual: noop, setTitle: noop, setAuthor: noop, check: noop, edit: noop } };
const meta = { title: 'Reading/Bookshelf', component: ReadingBookshelf, args: { library, composer, selectedKey: readingBookExample.key } } satisfies Meta<typeof ReadingBookshelf>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const CurrentApproachLocked: Story = { args: { selectionLocked: true } };
export const Loading: Story = { args: { library: { ...library, books: [], busy: true } } };
export const Empty: Story = { args: { library: { ...library, books: [] } } };
export const OlderServer: Story = { args: { composer: { ...composer, supported: false } } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
