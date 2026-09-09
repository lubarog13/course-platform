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
    return NextResponse.json(Object.entries(result).map(([tag, count]) => ({ tag, count })));
  } catch (error) {
    return prismaErrorResponse(error);
  }
}