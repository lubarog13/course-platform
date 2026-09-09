/**
 * Доменные константы и типы, согласованные с prisma/schema.prisma
 * и docs/Online Lesson Platform.dbml.
 *
 * Значения enum совпадают с PostgreSQL/Prisma — их можно передавать в запросы.
 * Типы моделей реэкспортируются из сгенерированного Prisma Client.
 */

import type { CourseInstructor, User } from "@prisma/client";

export const Role = {
  student: "student",
  teacher: "teacher",
  admin: "admin",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const LessonType = {
  text: "text",
  video: "video",
  test: "test",
} as const;
export type LessonType = (typeof LessonType)[keyof typeof LessonType];

export const VideoPlatform = {
  rutube: "rutube",
  youtube: "youtube",
  self_hosted: "self_hosted",
  other: "other",
} as const;
export type VideoPlatform = (typeof VideoPlatform)[keyof typeof VideoPlatform];

export const QuestionType = {
  single_choice: "single_choice",
  multiple_choice: "multiple_choice",
  text: "text",
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const InstructorRole = {
  owner: "owner",
  co_teacher: "co_teacher",
} as const;
export type InstructorRole = (typeof InstructorRole)[keyof typeof InstructorRole];

export const EnrollmentStatus = {
  pending: "pending",
  enrolled: "enrolled",
  in_progress: "in_progress",
  completed: "completed",
  dropped: "dropped",
  expired: "expired",
} as const;
export type EnrollmentStatus =
  (typeof EnrollmentStatus)[keyof typeof EnrollmentStatus];

/** Статусы заявки на курс (UserEnrollmentRequest) */
export const EnrollmentRequestStatus = {
  pending: EnrollmentStatus.pending,
  enrolled: EnrollmentStatus.enrolled,
  dropped: EnrollmentStatus.dropped,
} as const;
export type EnrollmentRequestStatus =
  (typeof EnrollmentRequestStatus)[keyof typeof EnrollmentRequestStatus];

/** Статусы записи на курс (UserCourse) — без pending */
export const UserCourseStatus = {
  enrolled: EnrollmentStatus.enrolled,
  in_progress: EnrollmentStatus.in_progress,
  completed: EnrollmentStatus.completed,
  dropped: EnrollmentStatus.dropped,
  expired: EnrollmentStatus.expired,
} as const;
export type UserCourseStatus =
  (typeof UserCourseStatus)[keyof typeof UserCourseStatus];

export const CourseLevel = {
  beginner: "beginner",
  intermediate: "intermediate",
  advanced: "advanced",
} as const;
export type CourseLevel = (typeof CourseLevel)[keyof typeof CourseLevel];
export const CourseLevelValues = {
    beginner: 'Начальный',
    intermediate: 'Средний',
    advanced: 'Профессиональный',
} as const;


export const NotificationType = {
  deadline: "deadline",
  test_result: "test_result",
  new_message: "new_message",
  lesson_comment: "lesson_comment",
  course_published: "course_published",
} as const;
export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationEntityType = {
  course: "course",
  lesson: "lesson",
  message: "message",
  attempt: "attempt",
} as const;
export type NotificationEntityType =
  (typeof NotificationEntityType)[keyof typeof NotificationEntityType];

/** Содержимое User.userDetails (jsonb) */
export type UserDetails = {
  position?: string;
  achievements?: string[];
};

/** Преподаватель курса: запись CourseInstructor + пользователь */
export type Instructor = CourseInstructor & {
  user: Omit<User, "passwordHash">;
};

export const ROLE_VALUES = Object.values(Role);
export const LESSON_TYPE_VALUES = Object.values(LessonType);
export const VIDEO_PLATFORM_VALUES = Object.values(VideoPlatform);
export const QUESTION_TYPE_VALUES = Object.values(QuestionType);
export const INSTRUCTOR_ROLE_VALUES = Object.values(InstructorRole);
export const ENROLLMENT_STATUS_VALUES = Object.values(EnrollmentStatus);
export const ENROLLMENT_REQUEST_STATUS_VALUES = Object.values(
  EnrollmentRequestStatus,
);
export const USER_COURSE_STATUS_VALUES = Object.values(UserCourseStatus);
export const COURSE_LEVEL_VALUES = Object.values(CourseLevel);
export const NOTIFICATION_TYPE_VALUES = Object.values(NotificationType);
export const NOTIFICATION_ENTITY_TYPE_VALUES = Object.values(
  NotificationEntityType,
);

export type {
  User,
  File,
  Category,
  Course,
  CourseInstructor,
  CoursePart,
  Video,
  Lesson,
  TestQuestion,
  TestQuestionOption,
  TestAttempt,
  UserTestAnswer,
  UserTestAnswerOption,
  UserEnrollmentRequest,
  UserCourse,
  UserCoursePart,
  UserLesson,
  CourseReview,
  Certificate,
  LessonComment,
  Message,
  MessageAttachment,
  Notification,
} from "@prisma/client";
