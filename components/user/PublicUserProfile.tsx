import type { ReactNode } from "react";
import Link from "next/link";
import { Award, BookOpen, GraduationCap, Mail, MessageCircle, Pencil, Phone } from "lucide-react";

import type { PublicCourseSummary, PublicUserProfile as PublicUserProfileData } from "@/app/lib/user";
import { CourseLevelValues } from "@/app/lib/models";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import CourseLinkCard from "../courses/CourseLinkCard";

const ROLE_LABELS: Record<Role, string> = {
  student: "Студент",
  teacher: "Преподаватель",
  admin: "Администратор",
};

function CourseSection({
  title,
  icon,
  courses,
  emptyText,
}: {
  title: string;
  icon: ReactNode;
  courses: PublicCourseSummary[];
  emptyText: string;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <span className="text-sm text-muted-foreground">({courses.length})</span>
      </div>
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseLinkCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </section>
  );
}

export function PublicUserProfile({
  user,
  isOwn,
  isLoggedIn,
}: {
  user: PublicUserProfileData;
  isOwn: boolean;
  isLoggedIn: boolean;
}) {
  const fullName = [user.name, user.patronymic, user.surname]
    .filter(Boolean)
    .join(" ");
  const position = user.userDetails?.position;
  const achievements = user.userDetails?.achievements?.filter(Boolean) ?? [];
  const showTaught = user.role === "teacher" || user.taughtCourses.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
          {position ? (
              <p className="text-muted-foreground mt-4">{position}</p>
            ) : null}
          {
            (user.email || user.phone) ? (
              <div className="mt-4">
                <span className="text-medium mr-3">Контакты:</span>
                {user.email ? <a href={`mailto:${user.email}`} className="text-muted-foreground mr-3"><Mail className="inline-block size-4" /> {user.email}</a> : null}
                {user.phone ? <a href={`tel:${user.phone}`} className="text-muted-foreground mr-3"><Phone className="inline-block size-4" /> {user.phone}</a> : null}
              </div>
            ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {isOwn ? (
            <Link
              href="/user"
              className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
            >
              <Pencil className="size-4" />
              Редактировать
            </Link>
          ) : null}
          {isLoggedIn && !isOwn ? (
            <Link
              href={`/user/messages?receiverId=${user.id}`}
              className={cn(buttonVariants(), "gap-1.5")}
            >
              <MessageCircle className="size-4" />
              Написать
            </Link>
          ) : null}
        </div>
      </div>

      {achievements.length > 0 ? (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Award className="size-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold tracking-tight">Достижения</h2>
          </div>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {achievements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {showTaught ? (
        <CourseSection
          title="Преподаёт курсы"
          icon={<GraduationCap className="size-5 text-muted-foreground" />}
          courses={user.taughtCourses}
          emptyText="Пока нет опубликованных курсов"
        />
      ) : null}

      <CourseSection
        title="Прошёл курсы"
        icon={<BookOpen className="size-5 text-muted-foreground" />}
        courses={user.completedCourses}
        emptyText="Пока нет завершённых курсов"
      />
    </div>
  );
}
