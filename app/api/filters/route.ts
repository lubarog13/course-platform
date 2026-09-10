import { prismaErrorResponse } from "@/app/lib/courses";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
try {
    const tags = await prisma.course.findMany({
        select: {
           tags: true,
        },
    });
    const result = {} as Record<string, number>;
    tags.forEach((item) => {
        item.tags.forEach((tag) => {
            if (result[tag]) {
                result[tag]++;
            } else {
                result[tag] = 1;
            }
        });
    });
    Object.keys(result).forEach((tag) => {
        if (result[tag] < 2) {
            delete result[tag];
        }
    });
    const categories = await prisma.category.findMany({
        select: {
            name: true,
            slug: true,
        },
    });
    return NextResponse.json({
        tags: Object.entries(result).map(([tag, count]) => ({ tag, count })),
        categories: categories.map((item) => ({ name: item.name, slug: item.slug })),
    });
  } catch (error) {
    return prismaErrorResponse(error);
  }
}