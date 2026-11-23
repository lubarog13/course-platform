"use client";

import { CircleHelpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function TestQuestionsFileHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="link" className="gap-1.5 px-0">
            <CircleHelpIcon className="size-4" />
            Как заполнить файл
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Как подготовить файл с вопросами</DialogTitle>
          <DialogDescription>
            Откройте файл в Excel или LibreOffice. Проще всего скачать пример
            («Скачать пример файла») и заменить вопросы своими.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto text-sm text-foreground">
          <div>
            <p className="mb-1 font-medium">Как устроена таблица</p>
            <p className="mb-2 text-muted-foreground">
              Первая строка — названия столбцов. Каждая следующая строка — один
              вопрос теста.
            </p>
            <ul className="list-inside list-disc space-y-1.5 text-muted-foreground">
              <li>
                <span className="text-foreground">вопрос</span> — текст вопроса
                (заполнять обязательно)
              </li>
              <li>
                <span className="text-foreground">тип</span> — как студент
                отвечает:
                <ul className="mt-1 ml-4 list-[circle] space-y-1">
                  <li>
                    <span className="text-foreground">один вариант</span> —
                    выбрать один ответ из списка
                  </li>
                  <li>
                    <span className="text-foreground">несколько вариантов</span>{" "}
                    — отметить несколько ответов
                  </li>
                  <li>
                    <span className="text-foreground">текст</span> — написать
                    ответ своими словами
                  </li>
                </ul>
              </li>
              <li>
                <span className="text-foreground">порядок</span> — номер вопроса
                в тесте: 1, 2, 3… (без повторов)
              </li>
              <li>
                <span className="text-foreground">обязательный</span> — «да»
                или «нет»: нужно ли ответить на вопрос
              </li>
              <li>
                <span className="text-foreground">вложение</span> — «да» или
                «нет»: можно ли прикрепить файл к ответу
              </li>
              <li>
                <span className="text-foreground">баллы</span> — сколько баллов
                даёт этот вопрос
              </li>
              <li>
                <span className="text-foreground">текстовый ответ</span> —
                образец правильного ответа, если тип «текст» (можно оставить
                пустым)
              </li>
              <li>
                <span className="text-foreground">варианты</span> — варианты
                ответа для вопросов с выбором
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-1 font-medium">Столбец «варианты»</p>
            <p className="mb-2 text-muted-foreground">
              Заполняется только для типов «один вариант» и «несколько
              вариантов». Хотя бы один вариант должен быть правильным. Если
              вопрос текстовый — ячейку не трогайте, оставьте пустой.
            </p>
            <p className="mb-1 text-muted-foreground">
              В одной ячейке перечислите ответы через точку с запятой. После
              каждого ответа поставьте вертикальную черту и цифру:{" "}
              <span className="text-foreground">1</span> — верный,{" "}
              <span className="text-foreground">0</span> — неверный.
            </p>
            <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
              {`Вера|1;Закон|0;Дела|0`}
            </pre>
            <p className="mt-2 text-muted-foreground">
              В этом примере правильный ответ — «Вера», остальные нет.
            </p>
          </div>

          <div>
            <p className="mb-1 font-medium">Перед загрузкой</p>
            <ul className="list-inside list-disc space-y-1.5 text-muted-foreground">
              <li>
                Сохраните файл как CSV или Excel — тот формат, который выбран
                рядом с кнопкой загрузки
              </li>
              <li>Не удаляйте столбцы из примера, даже пустые</li>
              <li>
                Загрузка подставит вопросы в редактор вместо текущих — потом их
                можно поправить на этой странице
              </li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Понятно
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
