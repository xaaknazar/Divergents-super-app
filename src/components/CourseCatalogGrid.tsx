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
export function CourseCatalogGrid({ courses, ownedProgress, showPrice, onCoursePress }: CourseCatalogGridProps) {
  const { width, fontScale } = useWindowDimensions();
  const [layoutWidth, setLayoutWidth] = useState<number>();
  const { textScale = 1 } = useTheme();
  const singleColumn = Math.min(layoutWidth ?? width, width) < 350 || fontScale * textScale > 1.3;
  return <Wrapper dir="row" wrap justify="space-between" paddingHorizontal={16}
    testID="course-catalog-layout" onLayout={event => setLayoutWidth(event.nativeEvent.layout.width)}>
    {courses.map(course => <Wrapper key={course.id} width={singleColumn ? '100%' : '48.5%'} marginBottom={14}>
      <CourseCardPremium course={course} owned={course.id in ownedProgress} progress={ownedProgress[course.id]}
        showPrice={showPrice} onPress={() => onCoursePress(course.id)} />
    </Wrapper>)}
  </Wrapper>;
}
