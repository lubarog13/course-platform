"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { EnrollmentDto } from "@/app/lib/enrollment";
import Loading from "../layout/loading";
import NotFound from "../layout/not-found";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "../ui/card";
import { EnrollmentStatus } from "@prisma/client";
import { Button } from "../ui/button";
import { CheckIcon, Link, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EnrollmentList() {
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {data: session, status} = useSession();

  const fetchEnrollments = async () => {
    try {
      const res = await fetch("/api/enroll");
      if (!res.ok) {
        throw new Error("Не удалось загрузить записи на курсы");
      }
      const data = await res.json();
      setEnrollments(data);
    } catch (error) {
      setError(error as string);
    } finally {
      setLoading(false);
    }
  };

  const statusAdapters = {
    [EnrollmentStatus.pending]: "Ожидает рассмотрения",
    [EnrollmentStatus.enrolled]: "Принято",
    [EnrollmentStatus.in_progress]: "В процессе",
    [EnrollmentStatus.completed]: "Завершено",
    [EnrollmentStatus.dropped]: "Отказано",
    [EnrollmentStatus.expired]: "Истекло",
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchEnrollments();
    }
  }, [status]);

  const handleAccept = async (enrollmentId: number) => {}

  const handleReject = async (enrollmentId: number) => {}

  const handleCancel = async (enrollmentId: number) => {}


  if (loading || status === "loading") {
    return <Loading />;
  }

  if (error) {
    return <NotFound text="Ошибка при загрузке записей на курсы" />;
  }

  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {enrollments.map((enrollment) => (
      <Card key={enrollment.id}>
        <CardHeader>
          <CardTitle>{enrollment.userName} {enrollment.userSurname} {enrollment.userPatronymic}</CardTitle>
          <CardDescription>{enrollment.courseName}</CardDescription>
        </CardHeader>
        <CardContent>
          <p><b>Заявка создана:</b> {new Date(enrollment.createdAt).toLocaleDateString()}</p>
          <p><b>Заявка обновлена:</b> {new Date(enrollment.updatedAt).toLocaleDateString()}</p>
          <p className="flex items-center gap-2 my-2"><b>Статус:</b> 
          <span className={cn(
            "px-2 py-1 rounded-md text-white",
            enrollment.status === EnrollmentStatus.pending ? "bg-yellow-500" :
            enrollment.status === EnrollmentStatus.enrolled ? "bg-green-500" :
            enrollment.status === EnrollmentStatus.in_progress ? "bg-blue-500" :
            enrollment.status === EnrollmentStatus.completed ? "bg-green-500" :
            enrollment.status === EnrollmentStatus.dropped ? "bg-red-500" :
            enrollment.status === EnrollmentStatus.expired ? "bg-gray-500" : ""
          )}>
          {statusAdapters[enrollment.status]}</span></p>
        </CardContent>
        <CardFooter>
            {
                session?.user.role !== 'student' && (<>
                <Button onClick={() => handleAccept(enrollment.id)}>
                    <CheckIcon className="w-4 h-4" />
                    Принять
                </Button>
                <Button onClick={() => handleReject(enrollment.id)}>
                    <XIcon className="w-4 h-4" />
                    Отклонить
                </Button>
                </>
                )
            }
            {
                session?.user.role === 'student' && (<>
                <Button onClick={() => handleCancel(enrollment.id)}>
                    <XIcon className="w-4 h-4" />
                    Отменить заявку
                </Button>
                </>
            )}
        </CardFooter>
      </Card>
    ))}
  </div>;
}