// Миниатюра маршрута — тот самый «рисунок пробежки», по которому тренировку
// узнаёшь с одного взгляда.
//
// Нарисован SVG, а не картой. В списке из сотни тренировок сотня карт — это
// сотня нативных вью, каждая со своим движком и запросами тайлов: прокрутка
// начинает дёргаться, а трафик уходит впустую. Форма маршрута узнаётся и без
// улиц под ней, а настоящая карта открывается по нажатию.
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

export interface ThumbCoord { latitude: number; longitude: number }

export function RouteThumb({
  coords,
  width = 92,
  height = 92,
  color,
  strokeWidth = 3,
  showEnds = false,
  transparent = false,
  halo,
}: {
  coords: ThumbCoord[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  /** Точки старта и финиша — на крупном превью помогают читать направление. */
  showEnds?: boolean;
  /** Без плитки под маршрутом — для карточки «поделиться», где фон свой. */
  transparent?: boolean;
  /**
   * Светлая обводка под линией. Тёмно-синий маршрут на чёрном фоне или на
   * тёмном фото сливается с ним; тонкий ореол оставляет цвет фирменным, а
   * контур — читаемым.
   */
  halo?: string;
}) {
  const { T } = useTheme();
  const stroke = color ?? T.brand;
  const tile = transparent
    ? { backgroundColor: 'transparent', borderRadius: 0, borderCurve: 'continuous' as const }
    : { backgroundColor: T.fillTertiary, borderRadius: 12, borderCurve: 'continuous' as const };

  const points = useMemo(() => {
    if (!coords || coords.length < 2) return null;
    const lats = coords.map((c) => c.latitude);
    const lngs = coords.map((c) => c.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

    // Долгота сжимается к полюсам: без поправки на косинус широты маршрут
    // получается растянутым по горизонтали и не похож на себя.
    const midLat = (minLat + maxLat) / 2;
    const kx = Math.cos((midLat * Math.PI) / 180) || 1;
    const spanX = Math.max((maxLng - minLng) * kx, 1e-9);
    const spanY = Math.max(maxLat - minLat, 1e-9);

    const pad = strokeWidth + 2;
    const w = width - pad * 2;
    const h = height - pad * 2;
    // Единый масштаб по обеим осям — иначе форма исказится.
    const scale = Math.min(w / spanX, h / spanY);
    const offsetX = pad + (w - spanX * scale) / 2;
    const offsetY = pad + (h - spanY * scale) / 2;

    return coords.map((c) => {
      const x = offsetX + (c.longitude - minLng) * kx * scale;
      // Ось Y в SVG растёт вниз, а широта вверх — переворачиваем.
      const y = offsetY + (maxLat - c.latitude) * scale;
      return { x, y };
    });
  }, [coords, width, height, strokeWidth]);

  if (!points) {
    // Маршрута нет (запись без GPS или одна точка) — пустая плитка вместо
    // сломанной картинки.
    return <View style={{ width, height, ...tile }} />;
  }

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <View style={{ width, height, ...tile, overflow: 'hidden' }}>
      <Svg width={width} height={height}>
        {halo ? (
          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={halo}
            strokeWidth={strokeWidth * 1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        <Polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {showEnds ? (
          <>
            <Circle cx={first.x} cy={first.y} r={strokeWidth + 1} fill={T.green} />
            <Circle cx={last.x} cy={last.y} r={strokeWidth + 1} fill={T.red} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}
