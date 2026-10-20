import { createContext, useContext } from 'react';
import type { VideoPlayer } from 'expo-video';
import type { DownloadRecord } from './downloads';

/** Pure React contract: layout readers must not initialize native playback. */
export interface AudioTrack {
  lessonId: string;
  title: string;
  courseTitle: string;
  uri: string;
  kind: 'download' | 'lesson';
  courseId?: string;
}
export interface LessonSource {
  courseId: string;
  lessonId: string;
  title: string;
  courseTitle: string;
  uri: string;
}
export interface AudioPlayerValue {
  track: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  /** A repeated downloaded track toggles pause. */
  play: (rec: DownloadRecord) => void;
  /** An already-open lesson retains its current playback position. */
  openLesson: (lesson: LessonSource) => void;
  pause: () => void;
  toggle: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (deltaSeconds: number) => void;
  clear: () => void;
  player: VideoPlayer;
}

export const AudioPlaybackContext = createContext<AudioPlayerValue | null>(null);
// Layout observes only track changes, not the player's 400 ms progress updates.
export const AudioTrackContext = createContext<AudioTrack | null>(null);

export function useOptionalAudioTrack(): AudioTrack | null {
  return useContext(AudioTrackContext);
}

export function useAudioPlayer(): AudioPlayerValue {
  const value = useContext(AudioPlaybackContext);
  if (!value) throw new Error('useAudioPlayer используется вне AudioPlayerProvider');
  return value;
}

/** Optional playback controls; layout-only consumers use useOptionalAudioTrack. */
export function useOptionalAudioPlayer(): AudioPlayerValue | null {
  return useContext(AudioPlaybackContext);
}
