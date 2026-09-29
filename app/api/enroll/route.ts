import { prisma } from "@/app/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { createNotification } from "@/app/lib/notifications";
import { NotificationType, NotificationEntityType, UserCourse } from "@prisma/client";
import { NextRequest } from "next/server";
import { jsonError } from "@/app/lib/courses";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный JSON", 400);
  }
  if (!(typeof body === "object" && body !== null && "courseId" in body && "userId" in body)) {
    return jsonError("Некорректные данные", 400);
  }
  const courseId = Number(body.courseId);
  const userId = Number(body.userId);
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Пользователь не найден" },
      { status: 404 },
    );
  }
  if (!course) {
    return NextResponse.json({ error: "Курс не найден" }, { status: 404 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  if (course?.needEnrollment && session.user.role !== "admin") {
    if (Number(session.user.id) !== userId) {
      return NextResponse.json(
        { error: "Вы не можете записаться на этот курс" },
        { status: 403 },
      );
    }
  }
  const enrollment = await prisma.userCourse.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (enrollment) {
    return NextResponse.json(
      { error: "Вы уже записаны на этот курс" },
      { status: 400 },
    );
  }
  const status =
    course?.needEnrollment && session.user.role !== "admin"
      ? "pending"
      : "enrolled";
  const deadline = course?.deadlineDays
    ? new Date(Date.now() + course.deadlineDays * 24 * 60 * 60 * 1000)
    : null;
  try {
    const newEnrollment = await prisma.userCourse.create({
      data: {
        userId,
        courseId,
        status,
        deadline,
      },
    });
    try {
      if (status === "enrolled") {
        const courseParts = await prisma.coursePart.findMany({
          where: { courseId },
        });
        for (const coursePart of courseParts) {
          const deadlinePart = coursePart?.deadlineDays
            ? new Date(
                Date.now() + coursePart.deadlineDays * 24 * 60 * 60 * 1000,
              )
            : null;
          await prisma.userCoursePart.create({
            data: {
              userId,
              coursePartId: coursePart.id,
              deadline: deadlinePart,
            },
          });
          const lessons = await prisma.lesson.findMany({
            where: { coursePartId: coursePart.id },
          });
          for (const lesson of lessons) {
            await prisma.userLesson.create({
              data: { userId, lessonId: lesson.id },
            });
          }
        }
      } else if (status === "pending" && user.role === 'student') {
        const courseInstructors = await prisma.courseInstructor.findMany({
          where: { courseId },
        });
        if (courseInstructors) {
          for (const courseInstructor of courseInstructors) {
            const notification = await createNotification(courseInstructor.userId, NotificationType.course_enrollment_request, "Запрос на запись на курс", "Пользователь " + user.name + " " + user.surname + " " + user.patronymic + " запросил запись на курс " + course.name, NotificationEntityType.course, courseId);
            if (notification===null) {
              return NextResponse.json(
                { error: "Ошибка при создании уведомления" },
                { status: 500 },
              );
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      await prisma.userCourse.delete({
        where: { id: newEnrollment.id },
      });
      return NextResponse.json(
        { error: "Ошибка при записи на курс" },
        { status: 500 },
      );
    }
    return NextResponse.json({ enrollment: newEnrollment });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Ошибка при записи на курс" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId") || null;
  const courseId = searchParams.get("courseId") || null;
  let courseEnrollmentRequests: UserCourse[] = [];
  if (!userId) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    if (session.user.role === "admin") {
      courseEnrollmentRequests = await prisma.userCourse.findMany({
        include: {
          course: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    }
    if (session.user.role === "teacher") {
      const filters: { courseId?: number } = {
        
      };
      if (courseId) {
        filters.courseId = parseInt(courseId);
      }
      courseEnrollmentRequests = await prisma.userCourse.findMany({
        where: {
          course: {
            instructors: {
              some: {
                userId: parseInt(session.user.id),
              },
            },
          },
          ...filters,
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    }
    if (session.user.role === "student") {
      return NextResponse.json({ error: "У вас нет доступа к этой странице" }, { status: 403 });
    }
    
    return NextResponse.json(courseEnrollmentRequests);
  }
  courseEnrollmentRequests = await prisma.userCourse.findMany({
    where: { userId: parseInt(userId) },
    include: {
      course: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return NextResponse.json(courseEnrollmentRequests);
}