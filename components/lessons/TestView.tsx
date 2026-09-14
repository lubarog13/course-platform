"use client";

import { LessonFullDto } from "@/app/lib/lessons";
import { Timer, CircleDashedCheck, PlayCircle, SquarePause, PauseCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import TestQuestion from "./TestQuestion";

export default function TestView({lesson}: {lesson: LessonFullDto}) {
    const [timeLimit, setTimeLimit] = useState(lesson.timeLimitSeconds);
    const [isStarted, setIsStarted] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [remainingTime, setRemainingTime] = useState(timeLimit);
    const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    useEffect(() => {
        if (isStarted) {
            const interval = setInterval(() => {
                setRemainingTime((remainingTime ?? 0) - 1);
            }, 1000);
            setTimerInterval(interval);
        }
        return () => {
            if (timerInterval) {
                clearInterval(timerInterval as NodeJS.Timeout);
                setTimerInterval(null);
            }
        };
    }, [isStarted, remainingTime]);
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
    const handleStartTest = () => {
        setIsStarted(true);
    };
    return <div className="mt-4">
        <div className="text-gray-700 dark:text-gray-300 mb-4">
                    {lesson.maxAttempts? `Максимальное количество попыток для прохождения теста: ${lesson.maxAttempts}. ` : 'Количество попыток не ограничено. '}
                    {lesson.reviewEnabled? `После прохождения теста вы сможете просмотреть ответы на вопросы. ` : ''}
                    {lesson.manualGrading? `Тест будет отправлен на проверку преподавателю.` : ''}
                </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="flex gap-2">
                <Timer className="w-8 h-8" />
                <div>
                    <div>
                        <span>Ограничение по времени: </span>
                        <span className="text-gray-500 dark:text-gray-400">{timeLimit? formatTime(timeLimit) : 'Без ограничения'}</span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                        После этого времени тест будет завершен автоматически.
                    </div>
                </div>
            </div>
            <div className="flex md:justify-end md:text-right gap-2">
            <CircleDashedCheck className="w-8 h-8 md:order-last" />

                <div>
                    <div>
                        <span>Проходной балл: </span>
                        <span className="text-gray-500 dark:text-gray-400">{lesson.passingScore ?? 0}</span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                        Максимальное количество баллов: {lesson.points ?? 0}.
                    </div>
                </div>

            </div>
            </div>
        <div className="flex gap-4 justify-between items-center mt-8">
            {!isStarted && <Button variant="outline" className="flex-1 text-lg cursor-pointer p-6 sm:flex-none" onClick={handleStartTest}>
                <PlayCircle className="w-5 h-5 mr-2" />
                Начать тест
            </Button>}
            <div className="flex flex-col">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Осталось:
                </div>
                <div className="text-2xl font-bold">
                    {formatTime(remainingTime ?? 0)}
                </div>
            </div>
        </div>
        {isStarted && (
        <div className="mt-4 flex flex-col gap-6">
        {lesson.testQuestions.map((question) => (
            <TestQuestion key={question.id} question={question} isSubmitted={isSubmitted} />
        ))}
        </div>
        )}
        {isStarted && (
            <div className="mt-8 flex">
                <Button variant="destructive" className="flex-1 text-lg cursor-pointer p-6 sm:flex-none">
                <PauseCircle className="w-5 h-5 mr-2" />
                Завершить тест
            </Button>
            </div>
        )}
        </div>
}