import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card"
import { CourseDto, CourseListQuery } from "@/app/lib/courses"
import { CourseLevelValues } from "@/lib/models"
import { useRouter } from "next/navigation"
import { Star, StarOff, StarHalf, Clock, Unlock, Lock } from 'lucide-react';
export function CourseCard({ course, updateFilters }: { course: CourseDto, updateFilters: (filters: {tag?: string} & CourseListQuery) => void }) {
    const imageFile = course.coverFile?.url || '/images/course-placeholder.jpeg'
    const levelLabel = course.level ? CourseLevelValues[course.level] : 'Без уровня'
    const duration = course.durationSeconds ? formatDuration(course.durationSeconds) : 'не указано'
    function formatDuration(duration: number) {
      const hours = Math.floor(duration / 3600)
      return `${hours}ч`
    }
    const router = useRouter()
    return (
    <Card className="relative mx-auto w-full max-w-sm pt-0">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 aspect-video dark:bg-black/35" />
      <img
        src={imageFile}
        alt={course.coverFile?.originalName || 'Курс обложка'}
        className="relative z-20 aspect-video w-full object-cover "
      />
      <CardHeader>
        <CardAction>
          <Badge variant="secondary" onClick={() => updateFilters({ level: course.level })}>{levelLabel}</Badge>
        </CardAction>
        <CardTitle>{course.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <p className=" text-sm">
          <span className="underline mr-1">Преподаватель:</span>
          {course.instructors.length > 0
            ? course.instructors
                .map((item) =>
                  [item.user.surname, item.user.name, item.user.patronymic]
                    .filter(Boolean)
                    .join(" "),
                )
                .join(", ")
            : "не указан"}
        </p>
        <div className="flex items-center gap-3 mt-auto pt-2">
          <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{duration}</span>
          </div>
          <div className="flex items-center gap-1">
            {course.needEnrollment ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Unlock className="w-4 h-4 text-muted-foreground" />}
            <span className="text-sm text-muted-foreground">{course.needEnrollment ? 'Нужна регистрация' : 'Без регистрации'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          {course.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs capitalize bg-muted cursor-pointer text-muted-foreground hover:bg-muted hover:text-muted-foreground" onClick={() => updateFilters({ tag: tag })}>{tag}</Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="gap-3">
        <Button className="flex-1" onClick={() => router.push(`/courses/${course.slug}`)}>Посмотреть курс</Button>
        <div className="flex items-center gap-2">
          {course.rating && course.rating > 0 ? <Star className="w-4 h-4 text-yellow-500" /> : course.rating && course.rating > 4 ? <StarHalf className="w-4 h-4 text-yellow-500" /> : <StarOff className="w-4 h-4 text-zinc-500" />}
          <p className={`text-sm ${course.rating && course.rating > 0 ? 'text-yellow-500' : 'text-zinc-500'}`}>{course.rating || 0}</p>
        </div>
      </CardFooter>
    </Card>
  )
}
