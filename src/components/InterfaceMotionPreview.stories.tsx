import type { Meta, StoryObj } from '@storybook/react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useChatScroll } from '../state/useChatScroll';
import { useTabScrollToTop } from '../state/useTabScrollToTop';
import { sampleCourses } from '../storybook/courseFixtures';
import { demoBook } from '../storybook/livenFixtures';
import { BookOverview } from './BookOverview';
import { ChatComposer } from './ChatComposer';
import { ChatInputBar } from './ChatInputBar';
import { ChatMessage } from './ChatMessage';
import { ChipRail } from './ChipRail';
import { CourseCatalogGrid } from './CourseCatalogGrid';
import { HeaderIcon } from './HeaderIcon';
import { NavBarLarge } from './NavBarLarge';
import { ResumeCalloutCard } from './ResumeCallout';
import { Screen } from './Screen';
import { SearchField } from './SearchField';
import { SectionHeader } from './SectionHeader';
import { SectionTransition } from './SectionTransition';
import { TabDock } from './TabDock';
import { TextSection } from './TextSection';
import { Wrapper } from './Wrapper';

const Tabs = createBottomTabNavigator();
const destinations = [
  { name: 'Learn', label: 'Обучение', icon: 'book.fill' },
  { name: 'AI', label: 'AI', icon: 'sparkles' },
  { name: 'Community', label: 'Сообщество', icon: 'person.3' },
  { name: 'Books', label: 'Книги', icon: 'book' },
  { name: 'Career', label: 'Карьера', icon: 'briefcase' },
];

function Learning() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Все');
  return <Screen backdrop="learn">
    <NavBarLarge title="Обучение" subtitle="Учитесь в своём темпе" />
    <Wrapper paddingHorizontal={16} paddingTop={12} paddingBottom={20}>
      <SearchField value={search} onChangeText={setSearch} placeholder="Поиск курса" surface="raised" />
    </Wrapper>
    <SectionHeader title="Все курсы" />
    <ChipRail overflowHint items={['Все', 'Менеджмент', 'Лидерство', 'Отношения', 'Развитие'].map(label => ({
      key: label, label, active: category === label, onPress: () => setCategory(label),
    }))} />
    <CourseCatalogGrid courses={[...sampleCourses, ...sampleCourses.map(c => ({ ...c, id: c.id + '-copy' }))]}
      ownedProgress={{}} onCoursePress={() => {}} />
  </Screen>;
}
function Community() {
  const [section, setSection] = useState(0);
  return <Screen backdrop="community">
    <NavBarLarge title="Сообщество" subtitle="Челленджи, поездки и встречи"
      trailing={<HeaderIcon name="square.and.pencil" label="Создать запись" onPress={() => {}} />} />
    <Wrapper paddingTop={4} paddingBottom={6}>
      <ChipRail overflowHint itemRole="tab" items={['Главная', 'Каналы', 'Челленджи', 'Поездки', 'Мероприятия', 'Спорт'].map((label, index) => ({
        key: String(index), label, active: section === index, onPress: () => setSection(index),
      }))} />
    </Wrapper>
    <SectionTransition value={section}>
      {section === 2 ? <Wrapper paddingHorizontal={16} paddingBottom={12}><ResumeCalloutCard area="community" done={1} needed={3} onPress={() => {}} /></Wrapper> : null}
      <Wrapper padding={16} gap={24}>
        {Array.from({ length: 8 }, (_, index) => <TextSection key={index} title={index === 0 ? 'Демонстрация интерфейса' : `Встреча ${index + 1}`}
          text="Переключайте фильтры и вкладки. Повторное нажатие активной вкладки плавно возвращает страницу наверх." />)}
      </Wrapper>
    </SectionTransition>
  </Screen>;
}
function Chat() {
  const ref = useRef<ScrollView>(null);
  const [height, setHeight] = useState(180);
  const [value, setValue] = useState('');
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const chatScroll = useChatScroll(ref);
  useTabScrollToTop(ref, true, chatScroll.pauseFollowing);
  return <Screen scroll={false} tabPadding={false} backdrop="ai">
    <NavBarLarge title="Divergents AI" trailing={<HeaderIcon name="square.and.pencil" label="Новый чат" onPress={() => {}} />} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Wrapper flex={1}>
      <ScrollView ref={ref} {...chatScroll.scrollProps} contentContainerStyle={{ padding: 16, paddingBottom: height + 12 }}>
        {Array.from({ length: 6 }, (_, index) => <React.Fragment key={index}>
          <ChatMessage role="user" text="Как читать каждый день?" />
          <ChatMessage role="bot" text="Начните с удобного времени и одной книги. Читайте небольшими подходами и отмечайте свой прогресс." />
        </React.Fragment>)}
      </ScrollView>
      <ChatInputBar keyboardVisible={keyboard} onHeightChange={setHeight}>
        <ChatComposer value={value} onChangeText={setValue} onSend={() => setValue('')} disabled={false} busy={false} placeholder="Спросите ассистента…" />
      </ChatInputBar>
    </Wrapper></KeyboardAvoidingView>
  </Screen>;
}
function Book() {
  return <Screen><NavBarLarge title="Книга" />
    <Wrapper padding={20}><BookOverview book={{ ...demoBook, ratingAvg: null, ratingCount: 0, imageUrl: 'https://covers.openlibrary.org/b/id/12539702-L.jpg' }} /></Wrapper>
  </Screen>;
}
function Preview() {
  return <GestureHandlerRootView style={{ flex: 1 }}><NavigationIndependentTree><NavigationContainer>
    <Tabs.Navigator screenOptions={{ headerShown: false, animation: 'none' }} tabBar={({ state, navigation }) => <TabDock
      items={state.routes.map((route, index) => ({ id: route.key, ...destinations[index], selected: state.index === index }))}
      onSelect={key => {
        const route = state.routes.find(r => r.key === key)!;
        const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
        if (!event.defaultPrevented && state.routes[state.index].key !== key) navigation.navigate(route.name);
      }} />}>
      <Tabs.Screen name="Learn" component={Learning} />
      <Tabs.Screen name="AI" component={Chat} />
      <Tabs.Screen name="Community" component={Community} />
      <Tabs.Screen name="Books" component={Book} />
      <Tabs.Screen name="Career" component={Community} />
    </Tabs.Navigator>
  </NavigationContainer></NavigationIndependentTree></GestureHandlerRootView>;
}
const meta = { title: 'Проверка/InterfaceMotion', component: Preview,
  parameters: { canvasLayout: 'screen', reduceMotion: false, reduceTransparency: false },
} satisfies Meta<typeof Preview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const ReducedMotion: Story = { parameters: { reduceMotion: true, reduceTransparency: true } };
