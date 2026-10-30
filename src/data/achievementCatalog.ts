export const ACHIEVEMENT_CATEGORIES = {
  learning: { title: 'Уроки', icon: 'play.circle.fill', color: '#3559AF' },
  materials: { title: 'Материалы', icon: 'doc.text.fill', color: '#507087' },
  books: { title: 'Книги', icon: 'book.fill', color: '#885638' },
  challenge: { title: 'Челленджи', icon: 'flame.fill', color: '#BA4B30' },
  events: { title: 'События', icon: 'person.3.fill', color: '#7860A2' },
  map: { title: 'Карта', icon: 'map.fill', color: '#31736C' },
  fitness: { title: 'Тренировки', icon: 'figure.run', color: '#397346' },
} as const;
export type AchievementCategory = keyof typeof ACHIEVEMENT_CATEGORIES;
export type Metric = 'lessonsDone' | 'coursesDone' | 'coursesOwned' | 'materialsOpened'
  | 'booksRead' | 'booksStarted' | 'bookReviews' | 'challengeJoined' | 'challengeFinished'
  | 'challengeReports' | 'rankTop3' | 'eventsCreated' | 'eventsApproved' | 'tripsApproved'
  | 'sportsApproved' | 'placesSubmitted' | 'placeReviews' | 'placesSaved'
  | 'programsStarted' | 'programDays' | 'programStreak' | 'programsCompleted' | 'workoutsDone' | 'fitnessGoals';
export type AchievementStats = Partial<Record<Metric, number>>;
export interface Badge {
  id: string; title: string; desc: string; icon: string; color: string;
  category: AchievementCategory; tier: 1 | 2 | 3; metric: Metric; goal: number;
}
export interface EarnedBadge extends Badge { value: number; earned: boolean; progress: number; earnedAt?: string }

function series(category: AchievementCategory, metric: Metric, icon: string,
  entries: [string, string, number, string][]): Badge[] {
  return entries.map(([id, title, goal, desc], index) => ({
    id, title, goal, desc, category, metric, icon,
    color: ACHIEVEMENT_CATEGORIES[category].color, tier: Math.min(3, index + 1) as 1 | 2 | 3,
  }));
}

// Conditions describe what the app can actually verify. A registration is not
// attendance, a material opened in a browser is not proof it was read.
export const BADGES: Badge[] = [
  ...series('learning', 'lessonsDone', 'play.circle.fill', [
    ['first-step', 'Первый шаг', 1, 'Отметь первый урок пройденным. Прогресс должен сохраниться на сервере.'],
    ['lessons-10', 'В потоке знаний', 10, 'Заверши 10 разных уроков.'],
    ['lessons-30', 'Любознательность', 30, 'Заверши 30 разных уроков.'],
    ['lessons-100', 'Сто открытий', 100, 'Заверши 100 разных уроков.'],
  ]),
  ...series('learning', 'coursesDone', 'graduationcap.fill', [
    ['first-course', 'Первый курс', 1, 'Доведи прогресс одного курса до 100%.'],
    ['enthusiast', 'Знаток', 5, 'Заверши 5 разных курсов.'],
    ['scholar', 'Эрудит', 10, 'Заверши 10 разных курсов.'],
  ]),
  ...series('learning', 'coursesOwned', 'bookmark.fill', [
    ['enrolled', 'В деле', 1, 'Добавь курс в «Мои курсы». Подаренные курсы тоже учитываются.'],
  ]),
  ...series('materials', 'materialsOpened', 'doc.text.fill', [
    ['material-1', 'За кадром урока', 1, 'Открой дополнительный материал к уроку.'],
    ['material-5', 'Внимание к деталям', 5, 'Открой 5 разных материалов к урокам.'],
    ['material-20', 'Глубокое погружение', 20, 'Открой 20 разных материалов к урокам.'],
  ]),
  ...series('books', 'booksStarted', 'book.fill', [
    ['reading-1', 'Новая глава', 1, 'Сохрани для книги статус «Читаю» или «Прочитал».'],
  ]),
  ...series('books', 'booksRead', 'book.fill', [
    ['book-1', 'Последняя страница', 1, 'Отметь одну книгу как прочитанную в библиотеке.'],
    ['book-5', 'Книжная полка', 5, 'Отметь 5 разных книг как прочитанные.'],
    ['book-12', 'Книжный год', 12, 'Отметь 12 разных книг как прочитанные — без ограничения по времени.'],
    ['book-30', 'Библиофил', 30, 'Отметь 30 разных книг как прочитанные.'],
  ]),
  ...series('books', 'bookReviews', 'quote.bubble.fill', [
    ['review-1', 'Мой взгляд', 1, 'Опубликуй рецензию на книгу. Обычный комментарий не считается.'],
    ['review-5', 'Литературный голос', 5, 'Опубликуй рецензии на 5 разных книг.'],
  ]),
  ...series('challenge', 'challengeJoined', 'flame.fill', [
    ['challenger', 'Челленджер', 1, 'Получи одобрение заявки в челлендж.'],
    ['challenge-3', 'Снова в игре', 3, 'Получи одобрение в 3 разных челленджах.'],
  ]),
  ...series('challenge', 'challengeReports', 'checkmark.seal.fill', [
    ['report-1', 'Действие важнее слов', 1, 'Сохрани ненулевой результат задания челленджа.'],
    ['week-streak', 'Неделя силы', 7, 'Сохрани результаты в 7 разных днях челленджей. Дни не обязаны идти подряд.'],
    ['report-21', 'Шаг за шагом', 21, 'Сохрани результаты в 21 разном дне челленджей.'],
  ]),
  ...series('challenge', 'challengeFinished', 'trophy.fill', [
    ['finisher', 'Финишер', 1, 'Заверши челлендж без выхода и дисквалификации. Учитываются итоги сервера.'],
    ['finisher-3', 'Опыт побед', 3, 'Заверши 3 челленджа без выхода и дисквалификации.'],
  ]),
  ...series('challenge', 'rankTop3', 'medal.fill', [
    ['podium', 'Топ-3', 1, 'Займи место в тройке своей команды по итогам завершённого челленджа.'],
  ]),
  ...series('events', 'eventsCreated', 'person.3.fill', [
    ['host-1', 'Давай соберёмся', 1, 'Создай бесплатную встречу, спортивное событие или поездку.'],
    ['host-5', 'Объединяю людей', 5, 'Создай 5 разных офлайн-событий.'],
  ]),
  ...series('events', 'eventsApproved', 'calendar', [
    ['event-1', 'Планы с сообществом', 1, 'Получи одобрение на встречу, спортивное событие или поездку.'],
    ['event-5', 'В кругу своих', 5, 'Получи одобрение на 5 разных офлайн-событий.'],
    ['event-15', 'Душа сообщества', 15, 'Получи одобрение на 15 разных офлайн-событий.'],
  ]),
  ...series('events', 'tripsApproved', 'airplane', [['trip-1', 'Навстречу приключениям', 1, 'Получи одобрение заявки на поездку.']]),
  ...series('events', 'sportsApproved', 'soccerball', [['sport-1', 'В одной команде', 1, 'Получи одобрение заявки на спортивное событие.']]),
  ...series('map', 'placesSaved', 'bookmark.fill', [
    ['map-save-1', 'Место на заметку', 1, 'Добавь место на карте в избранное.'],
    ['map-save-10', 'Мой путеводитель', 10, 'Сохрани в избранное 10 разных мест.'],
  ]),
  ...series('map', 'placesSubmitted', 'mappin.circle.fill', [
    ['map-add-1', 'Знаю отличное место', 1, 'Успешно отправь новое место на модерацию.'],
    ['map-add-5', 'Открываю город', 5, 'Успешно отправь 5 разных мест на модерацию.'],
  ]),
  ...series('map', 'placeReviews', 'star.fill', [
    ['map-review-1', 'Полезный совет', 1, 'Опубликуй отзыв о месте.'],
    ['map-review-5', 'Голос города', 5, 'Опубликуй отзывы о 5 разных местах.'],
  ]),
  ...series('fitness', 'programsStarted', 'dumbbell', [['program-1', 'Мой личный старт', 1, 'Создай свою программу ежедневных тренировок.']]),
  ...series('fitness', 'programDays', 'checkmark.circle.fill', [
    ['training-day-1', 'Обещание себе', 1, 'Выполни дневную норму личной программы.'],
    ['training-days-50', 'Сила привычки', 50, 'Выполни нормы личных программ в 50 разных днях.'],
  ]),
  ...series('fitness', 'programStreak', 'bolt.fill', [
    ['training-streak-7', 'Неделя для себя', 7, 'Выполняй норму хотя бы одной личной программы 7 дней подряд.'],
    ['training-streak-14', 'Держу ритм', 14, 'Выполняй норму хотя бы одной личной программы 14 дней подряд.'],
    ['training-streak-30', '30 дней характера', 30, 'Выполняй норму хотя бы одной личной программы 30 дней подряд. Пропуск прерывает серию.'],
  ]),
  ...series('fitness', 'programsCompleted', 'flag.fill', [['program-finish', 'От старта до финиша', 1, 'Выполни дневную норму во все дни одной личной программы.']]),
  ...series('fitness', 'workoutsDone', 'figure.run', [
    ['workout-1', 'В движении', 1, 'Сохрани пробежку или прогулку длительностью не менее 5 минут.'],
    ['workout-10', 'Активный ритм', 10, 'Сохрани 10 пробежек или прогулок от 5 минут каждая.'],
    ['workout-30', 'Движение — мой стиль', 30, 'Сохрани 30 пробежек или прогулок от 5 минут каждая.'],
  ]),
  ...series('fitness', 'fitnessGoals', 'target', [['fitness-goal', 'Цель достигнута', 1, 'Достигни личной спортивной цели в разделе тренировок.']]),
];

export function computeAchievements(stats: AchievementStats, unlocked: Record<string, string> = {}): EarnedBadge[] {
  return BADGES.map(b => {
    const raw = stats[b.metric] ?? 0;
    const value = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    const earnedAt = unlocked[b.id];
    const earned = Boolean(earnedAt) || value >= b.goal;
    return { ...b, value, earnedAt, earned, progress: earned ? 1 : Math.min(1, value / b.goal) };
  });
}
