import React, { useState } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Course } from '../data/courses';
import { CourseCardPremium } from './CourseCardPremium';
import { Wrapper } from './Wrapper';

export interface OwnedCourseShelfProps {
  courses: Course[];
  progress: Record<string, number>;
  onCoursePress: (courseId: string) => void;
}
/** Лента «Мои курсы»: белые блоки 220, снизу запас 24 под тень. */
export function OwnedCourseShelf({ courses, progress, onCoursePress }: OwnedCourseShelfProps) {
  const { width, fontScale } = useWindowDimensions();
  const [layoutWidth, setLayoutWidth] = useState<number>();
  const availableWidth = Math.min(layoutWidth ?? width, width);
  const { textScale = 1 } = useTheme();
  const singleColumn = availableWidth < 350 || fontScale * textScale > 1.3;
  const cardWidth = Math.max(0, Math.min(singleColumn ? availableWidth - 32 : 220, availableWidth - 32));
  return <ScrollView horizontal showsHorizontalScrollIndicator={false}
    onLayout={event => setLayoutWidth(event.nativeEvent.layout.width)}>
    <Wrapper dir="row" gap={16} paddingHorizontal={16} paddingTop={4} paddingBottom={24} align="stretch">
      {courses.map(course => <Wrapper key={course.id} width={cardWidth}>
        <CourseCardPremium variant="shelf" course={course} owned progress={progress[course.id]} onPress={() => onCoursePress(course.id)} />
      </Wrapper>)}
    </Wrapper>
  </ScrollView>;
}
