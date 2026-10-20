import React, { useMemo, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLang, tr } from '../../state/LanguageContext';
import { useDownloads, DownloadRecord } from '../../state/downloads';
import { useAudioPlayer } from '../../state/AudioPlayerContext';
import { useAuth } from '@clerk/clerk-expo';
import { useMyCourses } from '../../state/useMyCourses';
import { fetchOwnedDetail, lessonAudioUrl } from '../../data/api';
import { LMSStackParams } from '../../navigation/types';
import { DetailScreen } from '../../components/DetailScreen';
import { DownloadRow } from '../../components/DownloadRow';
import { DownloadPlayer } from '../../components/DownloadPlayer';
import { Wrapper } from '../../components/Wrapper';
import { ListSection } from '../../components/ListSection';
import { SectionHeader } from '../../components/SectionHeader';
import { TextSection } from '../../components/TextSection';
import { Button } from '../../components/Button';
import { ContentLoading } from '../../components/ContentLoading';
import { EmptyState } from '../../components/EmptyState';

type Props = NativeStackScreenProps<LMSStackParams, 'Downloads'>;
type DownloadsProps = {
  navigation: Pick<Props['navigation'], 'goBack'>;
  /** Startup fallback shown when Clerk cannot restore its session offline. */
  offlineStandalone?: boolean;
  /** Lets a resolved signed-out session leave fallback and open authentication. */
  onExitOffline?: () => void;
};

export function DownloadsScreen({ navigation, offlineStandalone = false, onExitOffline }: DownloadsProps) {
  useLang();
  const { items, pending, removeDownload, cancelDownload, downloadLesson, isDownloaded, isDownloading, progress } = useDownloads();
  const { getToken, isSignedIn } = useAuth();
  const my = useMyCourses();
  const [avail, setAvail] = useState<{ courseId: string; courseTitle: string; lessons: { id: string; n: number; title: string; audioUrl: string }[] }[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);

  // Load downloadable lessons (audio) from the user's purchased/owned courses.
  // Key the effect on a STABLE string of course ids (my.courses is a fresh array
  // every render, which would otherwise loop the effect forever).
  const courseIdsKey = my.courses.map((c) => c.id).join(',');
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isSignedIn || !courseIdsKey) { if (alive) setAvail([]); return; }
      setLoadingAvail(true);
      try {
        const token = await getToken();
        if (!token) { if (alive) setAvail([]); return; }
        const ids = courseIdsKey.split(',');
        const details = await Promise.all(ids.map((id) => fetchOwnedDetail(id, token).catch(() => null)));
        const groups = details.filter(Boolean).map((d: any) => ({
          courseId: d.id,
          courseTitle: d.title,
          lessons: (d.lessons || [])
            .map((l: any) => ({ id: String(l.id), n: Number(l.n) || 0, title: String(l.title), audioUrl: lessonAudioUrl(l) || '' }))
            .filter((l: any) => !!l.audioUrl),
        })).filter((g) => g.lessons.length > 0);
        if (alive) setAvail(groups);
      } catch { if (alive) setAvail([]); } finally { if (alive) setLoadingAvail(false); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseIdsKey, isSignedIn]);

  const onDownload = async (g: { courseId: string; courseTitle: string }, l: { id: string; n: number; title: string; audioUrl: string }) => {
    const ok = await downloadLesson({ lessonId: l.id, courseId: g.courseId, courseTitle: g.courseTitle, title: l.title, n: l.n }, l.audioUrl);
    if (!ok) Alert.alert(tr('Не удалось скачать'), tr('Попробуйте ещё раз позже.'));
  };

  // Available = owned-course audio lessons neither downloaded nor in flight, so a
  // lesson never shows in «Скачивается» and «Доступно для скачивания» at once.
  const availFiltered = useMemo(() => avail
    .map((g) => ({ ...g, lessons: g.lessons.filter((l) => !isDownloaded(l.id) && !isDownloading(l.id)) }))
    .filter((g) => g.lessons.length > 0), [avail, items, pending]);

  // Плеер общий на всё приложение (AudioPlayerProvider): этот экран — только
  // пульт к нему. Раньше плеер жил здесь, и при уходе на другую вкладку экран
  // размонтировался вместе с ним — лекция обрывалась.
  const { track, isPlaying, currentTime, duration, play, seekTo, clear } = useAudioPlayer();
  // Только скачанное: тот же плеер играет и видеоуроки с сайта, а у них тот же
  // lessonId — без этой проверки урок подсвечивался бы здесь как выбранный,
  // хотя пульт к нему на экране урока.
  const selectedId = track?.kind === 'download' ? track.lessonId : null;

  const selected = useMemo(() => items.find((i) => i.lessonId === selectedId) ?? null, [items, selectedId]);

  // Group downloads by course, preserving the newest-first order of `items`.
  const groups = useMemo(() => {
    const map = new Map<string, { title: string; rows: DownloadRecord[] }>();
    for (const it of items) {
      const g = map.get(it.courseId);
      if (g) g.rows.push(it);
      else map.set(it.courseId, { title: it.courseTitle, rows: [it] });
    }
    return Array.from(map.values());
  }, [items]);

  const confirmDelete = (rec: DownloadRecord) => {
    Alert.alert(
      tr('Удалить загрузку?'),
      rec.title,
      [
        { text: tr('Отмена'), style: 'cancel' },
        {
          text: tr('Удалить'), style: 'destructive',
          onPress: () => {
            // Файл вот-вот исчезнет — снимаем его с общего плеера, иначе
            // мини-плеер продолжит показывать удалённый урок.
            if (selectedId === rec.lessonId) clear();
            removeDownload(rec.lessonId);
          },
        },
      ],
    );
  };

  return <DetailScreen title={offlineStandalone ? tr('Офлайн-уроки') : tr('Загрузки')}
    onBack={offlineStandalone ? undefined : () => navigation.goBack()}
    footer={selected ? <DownloadPlayer title={selected.title} courseTitle={selected.courseTitle} playing={isPlaying}
      currentTime={currentTime} duration={duration} onToggle={() => play(selected)} onSeek={seekTo} /> : undefined}>
    <Wrapper padding={16} gap={16}>
      {offlineStandalone ? <>
        <TextSection title={tr('Нет подключения')} text={tr('Скачанные уроки доступны без интернета. Остальные разделы откроются после восстановления сети.')} />
        {onExitOffline ? <Button label={tr('Войти')} variant="tinted" onPress={onExitOffline} /> : null}
      </> : null}
      {items.length === 0 && availFiltered.length === 0 && pending.length === 0 ? loadingAvail ? <ContentLoading /> :
        <EmptyState icon="arrow.down.circle" title={tr('Нет загрузок')} subtitle={tr('Скачайте аудио уроков из доступного вам курса, чтобы слушать их без интернета.')} /> : <>
        {pending.length > 0 ? <ListSection header={tr('Скачивается') + ' · ' + pending.length}>
          {pending.map(item => <DownloadRow key={item.lessonId} state="pending" title={item.title} number={item.n}
            courseTitle={item.courseTitle} progress={item.progress} onAction={() => cancelDownload(item.lessonId)} />)}
        </ListSection> : null}
        {groups.length > 0 ? <SectionHeader title={tr('Скачано') + ' · ' + items.length} /> : null}
        {groups.map((group, index) => <ListSection key={index} header={group.title}>
          {group.rows.map(record => <DownloadRow key={record.lessonId} state="downloaded" title={record.title} number={record.n}
            bytes={record.size ?? 0} selected={record.lessonId === selectedId} playing={isPlaying}
            onPlay={() => play(record)} onAction={() => confirmDelete(record)} />)}
        </ListSection>)}
        {availFiltered.length > 0 ? <SectionHeader title={tr('Доступно для скачивания')} /> : null}
        {availFiltered.map(group => <ListSection key={group.courseId} header={group.courseTitle}>
          {group.lessons.map(lesson => <DownloadRow key={lesson.id} state="available" title={lesson.title} number={lesson.n}
            progress={progress[lesson.id]} busy={isDownloading(lesson.id)} onAction={() => onDownload(group, lesson)} />)}
        </ListSection>)}
      </>}
    </Wrapper>
  </DetailScreen>;
}
