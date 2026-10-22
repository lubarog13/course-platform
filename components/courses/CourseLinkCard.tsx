import { CourseLevelValues } from "@/lib/models";
import Link from "next/link";
import type { PublicCourseSummary, PublicUserProfile as PublicUserProfileData } from "@/app/lib/user";
import { Badge } from "../ui/badge";

export default function CourseLinkCard({ course }: { course: PublicCourseSummary }) {
    const levelLabel = course.level
      ? CourseLevelValues[course.level]
      : "Без уровня";

    const coverSrc = (coverUrl: string | null) => {
        if (!coverUrl) return "/images/course-placeholder.jpeg";
        const filename = coverUrl.split(/[/\\]/).pop();
        if (!filename) return "/images/course-placeholder.jpeg";
        return `/api/uploads/${encodeURIComponent(filename)}`;
      }
  
    return (
      <Link
        href={`/course/${course.slug}`}
        className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/20"
      >
        <img
          src={coverSrc(course.coverUrl)}
          alt={course.name}
          className="aspect-video w-full object-cover"
        />
        <div className="flex flex-1 flex-col gap-2 p-4">
          <Badge variant="secondary" className="w-fit text-xs">
            {levelLabel}
          </Badge>
          <h3 className="font-semibold leading-snug group-hover:underline">
            {course.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            {course.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs capitalize bg-muted cursor-pointer text-muted-foreground hover:bg-muted hover:text-muted-foreground">{tag}</Badge>)}
          </div>

        </div>
      </Link>
    );
  }