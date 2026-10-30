import React,{ useState } from 'react';
import { useWindowDimensions } from 'react-native';
import type { Course } from '../data/courses';
import { useTheme } from '../theme/ThemeContext';
import { CourseCardPremium } from './CourseCardPremium';
import { Wrapper } from './Wrapper';

export interface CourseCatalogGridProps {
  courses: Course[];
  ownedProgress: Record<string, number>;
  showPrice?: boolean;
  onCoursePress: (courseId: string) => void;
}
const GAP = 12;
/** Сетка каталога в 2 колонки, промежуток 12; блоки в ряду одной высоты. */
export function CourseCatalogGrid({ courses, ownedProgress, showPrice, onCoursePress }: CourseCatalogGridProps) {
  const { width, fontScale } = useWindowDimensions();
  const [layoutWidth, setLayoutWidth] = useState<number>();
  const { textScale = 1 } = useTheme();
  const available = Math.min(layoutWidth ?? width, width);
  const singleColumn = available < 350 || fontScale * textScale > 1.3;
  const column = singleColumn ? '100%' : Math.floor((available - 32 - GAP) / 2);
  return <Wrapper dir="row" wrap gap={GAP} paddingHorizontal={16} align="stretch"
    testID="course-catalog-layout" onLayout={event => setLayoutWidth(event.nativeEvent.layout.width)}>
    {courses.map(course => <Wrapper key={course.id} width={column}>
      <CourseCardPremium course={course} owned={course.id in ownedProgress} progress={ownedProgress[course.id]}
        showPrice={showPrice} onPress={() => onCoursePress(course.id)} />
    </Wrapper>)}
  </Wrapper>;
}
