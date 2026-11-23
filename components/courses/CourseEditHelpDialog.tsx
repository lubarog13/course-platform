"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CourseEditHelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function CourseEditHelpDialog({
  open,
  onOpenChange,
}: CourseEditHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Как заполнять курс</DialogTitle>
          <DialogDescription>
            Краткая подсказка: что заполнить на этой странице и в каком порядке
            удобнее идти.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto text-sm text-foreground">
          <div>
            <p className="mb-1 font-medium">С чего начать</p>
            <ol className="list-inside list-decimal space-y-1.5 text-muted-foreground">
              <li>
                Укажите <span className="text-foreground">название</span> и
                напишите <span className="text-foreground">описание</span> курса
              </li>
              <li>
                При желании добавьте <span className="text-foreground">обложку</span>
              </li>
              <li>
                Выберите <span className="text-foreground">уровень</span>,{" "}
                <span className="text-foreground">категорию</span> и{" "}
                <span className="text-foreground">язык</span>
              </li>
              <li>
                Добавьте <span className="text-foreground">части курса</span>{" "}
                (недели или разделы) — внутри них потом будут уроки
              </li>
              <li>
                Нажмите <span className="text-foreground">Сохранить</span>, затем{" "}
                <span className="text-foreground">Опубликовать</span>
              </li>
            </ol>
            <p className="mt-2 text-muted-foreground">
              Пока курс не опубликован, студенты его не видят в каталоге.
              Черновик сохраняется в браузере (Ctrl+S — сохранить на сервер).
            </p>
          </div>

          <div>
            <p className="mb-1 font-medium">Основные сведения</p>
            <ul className="list-inside list-disc space-y-1.5 text-muted-foreground">
              <li>
                <span className="text-foreground">Описание</span> — текст о
                курсе: цели, для кого он, чему научитесь. Можно оформить
                заголовками и списками
              </li>
              <li>
                <span className="text-foreground">Обложка</span> — картинка в
                списке курсов (необязательно)
              </li>
              <li>
                <span className="text-foreground">Соавторы</span> — другие
                преподаватели, которые смогут править курс вместе с вами
              </li>
              <li>
                <span className="text-foreground">Требуется регистрация</span> —
                студент подаёт заявку, вы её одобряете. Без галочки курс открыт
                сразу после записи
              </li>
              <li>
                <span className="text-foreground">Уровень</span> — начальный,
                средний или продвинутый
              </li>
              <li>
                <span className="text-foreground">Категория</span> и{" "}
                <span className="text-foreground">теги</span> — помогают найти
                курс в каталоге. Новую категорию или тег можно создать прямо в
                списке
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-1 font-medium">Сроки и сертификат</p>
            <ul className="list-inside list-disc space-y-1.5 text-muted-foreground">
              <li>
                <span className="text-foreground">Срок выполнения курса</span> —
                сколько дней даётся на весь курс с момента записи (можно
                оставить пустым)
              </li>
              <li>
                <span className="text-foreground">Необходимый прогресс</span> —
                какой процент прохождения нужен, чтобы курс считался завершённым
                и стал доступен сертификат (от 0 до 100)
              </li>
              <li>
                <span className="text-foreground">Шаблон сертификата</span> —
                оформление документа, который студент получит в конце
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-1 font-medium">Части курса</p>
            <p className="mb-2 text-muted-foreground">
              Курс делится на части (например, «Неделя 1», «Неделя 2»). Их
              можно перетаскивать, чтобы менять порядок.
            </p>
            <ul className="list-inside list-disc space-y-1.5 text-muted-foreground">
              <li>
                У части есть название, краткое описание и свой срок сдачи в днях
                (если нужен)
              </li>
              <li>
                После сохранения курса откройте часть и добавьте в неё уроки
                (текст, видео или тесты)
              </li>
              <li>
                Без хотя бы одной части курс трудно наполнить материалами —
                лучше сразу создать структуру
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-1 font-medium">Сохранение и публикация</p>
            <ul className="list-inside list-disc space-y-1.5 text-muted-foreground">
              <li>
                <span className="text-foreground">Сохранить</span> — записывает
                курс на сервер, студентам ещё не виден
              </li>
              <li>
                <span className="text-foreground">Опубликовать</span> —
                открывает курс в каталоге (кнопка появляется после сохранения,
                когда нет несохранённых правок)
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
