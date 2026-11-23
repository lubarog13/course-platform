import {
  getPopularCourses,
  getNewCourses,
  getRecommendedCourses,
  getCategories,
} from "@/app/lib/courses";
import CourseSlider from "@/components/courses/CourseSlider";
import MainPageSearch from "@/components/courses/MainPageSearch";
import Marquee06 from "@/components/shadcn-space/marquee/marquee-06";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
export default async function Home() {
  const [popularCourses, newCourses, recommendedCourses] = await Promise.all([
    getPopularCourses(10),
    getNewCourses(10),
    getRecommendedCourses(10),
  ]);

  const categories = await getCategories();
  const catLength = categories.length;
  if (catLength < 20) {
    for (let i = catLength; i < 20; i++) {
      categories.push({
        ...categories[categories.length - catLength],
        id: parseInt(crypto.randomUUID().slice(0, 8), 16),
      });
    }
  }

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-7xl relative px-4 py-8">
      <Image src="/images/cover.png" alt="Обложка сайта" width={1000} height={1000} className="w-full min-h-[600px] object-cover object-left rounded-lg hidden md:block" />
      <Image src="/images/cover_mobile.png" alt="Обложка сайта" width={1000} height={1000} className="w-full max-h-[500px] h-auto object-cover object-center rounded-lg block md:hidden" />
      <div className="absolute top-0 left-0 sm:left-4 pl-4 pr-4 md:pr-0 right-0 md:right-auto md:pl-22 w-full sm:w-[calc(100%-5rem)] h-full flex flex-col justify-center items-center sm:items-start">
      <div className="flex items-center gap-5">
      <Image src="/images/logo.svg" alt="Логотип" width={100} height={100} className="sm:w-40 sm:h-40 w-20 h-20" />  
      <h1 className="sm:text-3xl text-2xl font-semibold font-lora text-[#10375d] pl-5 border-l-2 border-[#10375d] sm:h-30 h-20 flex flex-col justify-center">
        Библейские<br /> курсы
      </h1>
      </div>
      <p className="sm:text-[1.6rem] text-[1.2rem] mt-2 pl-4 mb-8 font-inter text-[#10375d] opacity-90">
        Изучайте писание онлайн
      </p>
      <Button
      className="bg-yellow-500 hover:bg-yellow-600 text-white
      rounded-full px-6 py-6 text-lg font-medium animate-pop 
      sm:w-fit w-[85%] max-w-[300px]
      "
      style={{ animationIterationCount: "infinite", animationDuration: "2s" }}
      >
        Начать обучение <ArrowRight className="w-4 h-4" />
      </Button>
      </div>
      </div>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <MainPageSearch />
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Курсы</h1>
      <h2 className="mb-4 text-xl font-semibold tracking-tight">
        Популярные курсы
      </h2>
      <CourseSlider courses={popularCourses} isLoading={false} />
      </div>
      <div className="mx-auto w-full max-w-8xl flex-1 px-2 py-8">
      <Marquee06 categories={categories} />
      </div>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h2 className="mb-4 mt-8 text-xl font-semibold tracking-tight">
        Новые курсы
      </h2>
      <CourseSlider courses={newCourses} isLoading={false} />
      <h2 className="mb-4 mt-8 text-xl font-semibold tracking-tight">
        Лучшие курсы
      </h2>
      <CourseSlider courses={recommendedCourses} isLoading={false} />
      </div>
    </main>
  );
}
