import { CoursePart, Lesson } from "@prisma/client";

export type LessonDto = Pick<Lesson, "id" | "name" | "description" | "sortOrder" | "type" | "points" | "durationSeconds">;
export type CoursePartDto = {
} & CoursePart & {
    lessons: LessonDto[];
};

export function coursePartsFromSql(response: any): CoursePartDto[] {
    let result = [] as CoursePartDto[];
    let counter = -1;
    for (const [index, item] of response.entries()) {
        if (index === 0 || item["course_part_id"] !== response[index - 1]["course_part_id"]) {
            result.push({
                id: item["course_part_id"],
                name: item["name"],
                description: item["description"],
                sortOrder: item["sort_order"],
                createdAt: item["created_at"],
                updatedAt: item["updated_at"],
                deletedAt: item["deleted_at"],
                courseId: item["course_id"],
                lessons: [],
            });
            counter++;
        }
        result[counter].lessons.push({
            id: item["lesson_id"],
            name: item["lesson_name"],
            description: item["lesson_description"],
            sortOrder: item["lesson_sort_order"],
            type: item["lesson_type"],
            points: item["lesson_points"],
            durationSeconds: item["lesson_duration_seconds"],
        });
    }
    return result;
}