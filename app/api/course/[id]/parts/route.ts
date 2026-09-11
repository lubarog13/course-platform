import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
type RouteParams = { params: Promise<{ id: string }> };
import { coursePartsFromSql } from "@/app/lib/courseParts";

export async function GET(_request: NextRequest, { params }: RouteParams) {
    const { id } = await params;
    console.log(id);
    const parts = await prisma.$queryRaw`SELECT course_id, "Course"."name" as course_name, "CoursePart".id as course_part_id, "CoursePart".name, "CoursePart".description, "CoursePart".sort_order, "CoursePart".created_at, 
    "CoursePart".updated_at, "CoursePart".deleted_at, "Lesson".id as lesson_id, "Lesson"."name" as lesson_name, "Lesson"."description" as lesson_description, "Lesson"."sort_order" as lesson_sort_order, "Lesson"."type" as lesson_type, 
    "Lesson"."points" as lesson_poins, "Lesson"."duration_seconds" as lesson_duration_seconds
     FROM "CoursePart" LEFT JOIN "Lesson" ON "CoursePart"."id" = "Lesson"."course_part_id" Left Join "Course" ON "CoursePart"."course_id" = "Course"."id" 
     WHERE "Course"."slug" = ${id}
    GROUP BY "Course"."id", "CoursePart"."id", "Lesson"."id"
    ORDER BY "CoursePart"."sort_order"`;
    console.log(parts);
    return NextResponse.json({courseName: (parts as any)[0].course_name,
        parts: coursePartsFromSql(parts as any[])});
}