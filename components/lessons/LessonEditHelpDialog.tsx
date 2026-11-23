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

type LessonEditHelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function LessonEditHelpDialog({
  open,
  onOpenChange,
}: LessonEditHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Как заполнять урок</DialogTitle>
          <DialogDescription>
            Краткая подсказка для преподавателя: что означает каждое поле и в
            каком порядке удобнее работать.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto text-sm text-foreground">
          <div>
            <p className="mb-1 font-medium">С чего начать</p>
            <ol className="list-inside list-decimal space-y-1.5 text-muted-foreground">
              <li>
                Выберите <span className="text-foreground">часть курса</span> —
                неделю или раздел, к которому относится урок
              </li>
              <li>
                Укажите <span className="text-foreground">номер урока</span> —
                порядок внутри этой части (1, 2, 3…)
              </li>
              <li>
                Введите <span className="text-foreground">название</span> и
                короткое <span className="text-foreground">описание</span>
              </li>
              <li>
                Выберите тип: текстовый урок, видео или тест
              </li>
              <li>
                Нажмите <span className="text-foreground">Сохранить</span>, затем
                при необходимости — <span className="text-foreground">Опубликовать</span>
              </li>
            </ol>
            <p className="mt-2 text-muted-foreground">
              Пока урок не опубликован, студенты его не видят. Черновик
              сохраняется в браузере автоматически (Ctrl+S — сохранить на
              сервер).
            </p>
          </div>

          <div>
            <p className="mb-1 font-medium">Общие поля</p>
            <ul className="list-inside list-disc space-y-1.5 text-muted-foreground">
              <li>
                <span className="text-foreground">Баллы за урок</span> — сколько
                баллов студент получает за прохождение (для теста лучше
                совпадать с суммой баллов за вопросы)
              </li>
              <li>
                <span className="text-foreground">Продолжительность</span> —
                ориентировочное время в секундах (например, 1800 = 30 минут).
                Для текста и видео может подставляться автоматически
              </li>
              <li>
                <span className="text-foreground">Вложение</span> — файл для
                скачивания (презентация, PDF и т.п.), по желанию
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-1 font-medium">Текстовый урок</p>
            <p className="text-muted-foreground">
              Основной материал пишете в редакторе: заголовки, списки, картинки.
              Когда студент откроет урок, он считается прочитанным после
              просмотра.
            </p>
          </div>

          <div>
            <p className="mb-1 font-medium">Видеоурок</p>
            <p className="text-muted-foreground">
              Укажите ссылку на YouTube / Rutube или загрузите файл. Можно
              добавить текстовые пояснения под видео. Длительность подтянется из
              ролика, если платформа её отдаёт.
            </p>
          </div>

          <div>
            <p className="mb-1 font-medium">Тест</p>
            <ul className="list-inside list-disc space-y-1.5 text-muted-foreground">
              <li>
                <span className="text-foreground">Проходной балл</span> —
                минимум баллов, чтобы тест считался сданным. Если не указать —
                достаточно любой сдачи. Урок станет «зелёным» у студента только
                при достижении этого порога
              </li>
              <li>
                <span className="text-foreground">Время на прохождение</span> —
                лимит в секундах; пустое поле — без ограничения
              </li>
              <li>
                <span className="text-foreground">Разрешить просмотр ответов</span>{" "}
                — студент видит разбор после сдачи
              </li>
              <li>
                <span className="text-foreground">Проверка преподавателем</span>{" "}
                — баллы выставляете вы вручную (удобно для развёрнутых ответов)
              </li>
              <li>
                <span className="text-foreground">Обязательный урок</span> —
                без него нельзя завершить часть курса
              </li>
              <li>
                <span className="text-foreground">Ограничить попытки</span> —
                сколько раз студент может пройти тест
              </li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              Вопросы добавляйте вручную или загрузите из файла Excel/CSV —
              рядом есть ссылка «Как заполнить файл» и пример для скачивания.
            </p>
          </div>

          <div>
            <p className="mb-1 font-medium">Сохранение и публикация</p>
            <ul className="list-inside list-disc space-y-1.5 text-muted-foreground">
              <li>
                <span className="text-foreground">Сохранить</span> — записывает
                урок на сервер, но студентам он ещё не виден
              </li>
              <li>
                <span className="text-foreground">Опубликовать</span> —
                открывает урок студентам (доступна после сохранения)
              </li>
              <li>
                Для теста нужно добавить хотя бы один вопрос, иначе сохранить
                нельзя
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
