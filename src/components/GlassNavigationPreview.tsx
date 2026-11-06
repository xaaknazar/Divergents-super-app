import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ColorWash } from './ColorWash';
import { GlassGroup } from './GlassButton';
import { HeaderIcon } from './HeaderIcon';
import { NavHeader } from './NavHeader';
import { Segmented } from './Segmented';
import { TabDock } from './TabDock';
import { ChipRail } from './ChipRail';

const destinations = [
  { id:'learn', label:'Обучение', icon:'book.fill' },
  { id:'ai', label:'AI', icon:'sparkles.outline' },
  { id:'community', label:'Сообщество', icon:'person.3' },
  { id:'map', label:'Карта', icon:'map' },
  { id:'career', label:'Карьера', icon:'briefcase' },
];
const noop = () => {};
/** Изолированная витрина настоящих компонентов: без авторизации, сети и пользовательских данных. */
export function GlassNavigationPreview() {
  const { T,ty,isDark }=useTheme();
  const [tab,setTab]=useState('community');
  const [period,setPeriod]=useState(0);
  const [filter,setFilter]=useState('Главное');
  return <View style={[styles.root,{backgroundColor:T.groupedBg}]}>
    <ScrollView contentContainerStyle={styles.content}>
      <NavHeader title="Сообщество" onBack={noop} trailing={<HeaderIcon name="bell.fill" label="Уведомления" badge={3} onPress={noop} />} />
      <ChipRail overflowHint itemRole="tab" items={['Главное','Каналы','Челленджи','Поездки','Спорт'].map(label=>({key:label,label,active:filter===label,onPress:()=>setFilter(label)}))} />
      <View style={styles.section}>
        <Text style={[ty.title2,{color:T.label}]}>Стекло и навигация</Text>
        <Text style={[ty.subhead,{color:T.labelSecondary}]}>{isDark ? 'Тёмная' : 'Светлая'} тема · демонстрация компонентов</Text>
        <View style={[styles.card,{backgroundColor:T.cardBg}]}>
          <Text style={[ty.headline,{color:T.label}]}>Кнопки на фоне страницы</Text>
          <View style={styles.actions}>
            <HeaderIcon name="bell.fill" label="Уведомления без бейджа" onPress={noop} />
            <HeaderIcon name="square.and.arrow.up" label="Поделиться" onPress={noop} />
            <HeaderIcon name="ellipsis" label="Меню" onPress={noop} />
            <HeaderIcon name="checkmark" label="Готово" variant="primary" onPress={noop} />
            <HeaderIcon name="trash.fill" label="Удалить" danger onPress={noop} />
          </View>
          <GlassGroup items={[{icon:'arrow.uturn.backward',label:'Отменить'}, {icon:'square.and.arrow.up',label:'Поделиться из группы',onPress:noop}]} />
        </View>
        <View style={[styles.hero,{backgroundColor:'#234088'}]}>
          <ColorWash strength="strong" />
          <Text style={[ty.headline,{color:'#FFFFFF'}]}>Divergents Challenge</Text>
          <View style={styles.actions}>
            <HeaderIcon name="chevron.left" label="Назад к челленджу" onPress={noop} onWash scheme="dark" />
            <HeaderIcon name="bell.fill" label="Уведомления челленджа" onPress={noop} onWash scheme="dark" />
            <HeaderIcon name="ellipsis" label="Меню челленджа" onPress={noop} onWash scheme="dark" />
          </View>
          <Segmented items={['Весь челлендж','Сегодня']} value={period} onChange={setPeriod} variant="glass" />
        </View>
        <Segmented items={['Команды','Участники']} value={period} onChange={setPeriod} />
      </View>
    </ScrollView>
    <TabDock items={destinations.map(item=>({...item,selected:item.id===tab}))} onSelect={setTab} />
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1},content:{paddingBottom:160},section:{gap:20,padding:20},
  card:{borderRadius:26,padding:20,gap:20},
  hero:{borderRadius:26,padding:20,gap:20,overflow:'hidden'},
  actions:{flexDirection:'row',alignItems:'center',gap:12,flexWrap:'wrap'},
});
