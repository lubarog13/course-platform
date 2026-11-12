"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "skullet/react";
import {
  type CertificateListDto,
  type CompletedCourseDto,
} from "@/app/lib/certificate";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import ErrorView from "../layout/error-view";
import CertificateBanner from "./CertificateBanner";

type ListData = {
  certificates: CertificateListDto[];
  courses: CompletedCourseDto[];
};

const SAMPLE: ListData = {
  courses: [
    {
      id: -1,
      name: "Название пройденного курса",
      hasCertificate: false,
    } as CompletedCourseDto,
  ],
  certificates: [
    {
      id: -1,
      issuedAt: new Date(),
      file: { url: "/uploads/certificate-sample.pdf" },
      userCourse: { course: { name: "Название курса с сертификатом" } },
    } as CertificateListDto,
    {
      id: -2,
      issuedAt: new Date(),
      userCourse: { course: { name: "Ещё один пример курса" } },
      file: { url: "/uploads/certificate-sample.pdf" },
    } as CertificateListDto,
    {
      id: -3,
      issuedAt: new Date(),
      userCourse: { course: { name: "Третий пример сертификата" } },
      file: { url: "/uploads/certificate-sample.pdf" },
    } as CertificateListDto,
  ],
};

export default function CertificateList() {
  const [data, setData] = useState<ListData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const [certsRes, coursesRes] = await Promise.all([
          fetch("/api/certificate", { signal: controller.signal }),
          fetch("/api/course?completed=1", { signal: controller.signal }),
        ]);
        const certificates = await certsRes.json();
        const coursesRaw = await coursesRes.json();

        if (!certsRes.ok) {
          throw new Error(
            certificates?.error ?? "Не удалось загрузить сертификаты",
          );
        }
        if (!coursesRes.ok) {
          throw new Error(coursesRaw?.error ?? "Не удалось загрузить курсы");
        }

        setData({
          certificates: certificates as CertificateListDto[],
          courses: (coursesRaw as CompletedCourseDto[]).filter(
            (course) => !course.hasCertificate,
          ),
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      }
    })();

    return () => controller.abort();
  }, []);

  return (
    <Skeleton
      id="user-certificates"
      data={data}
      sample={SAMPLE}
      label="Загрузка сертификатов"
      error={
        error ? (
          <ErrorView text={error} title="Ошибка при загрузке сертификатов" />
        ) : undefined
      }
    >
      {({ certificates, courses }) => (
        <>
          {courses.length > 0 ? (
            <div className="mb-4 flex flex-col gap-2">
              <div className="text-lg font-bold">
                Вы можете получить сертификаты по следующим курсам:
              </div>
              {courses.map((course) => (
                <CertificateBanner
                  key={course.id}
                  courseId={course.id}
                  bannerTitle={course.name}
                  bannerDescription="Вы закончили курс"
                  buttonText="Получить сертификат"
                />
              ))}
            </div>
          ) : null}

          {certificates.length === 0 ? (
            <div className="text-center text-gray-500">Нет сертификатов</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {certificates.map((certificate) => (
                <Card key={certificate.id}>
                  <CardHeader>
                    <CardTitle>{certificate.userCourse.course.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-500">
                      Сертификат выдан {new Date(certificate.issuedAt).toLocaleDateString("ru-RU")}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => {
                        const filename =
                          typeof certificate.file?.url === "string"
                            ? certificate.file.url.split("/").pop()
                            : null;
                        if (!filename) return;
                        window.open(
                          `/api/uploads/${encodeURIComponent(filename)}`,
                          "_blank",
                        );
                      }}
                    >
                      <DownloadIcon className="h-4 w-4" />
                      Скачать
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </Skeleton>
  );
}
