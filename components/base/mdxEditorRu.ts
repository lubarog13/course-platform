import type { Translation } from "@mdxeditor/editor";

const ru: Record<string, string> = {
  "contentArea.editableMarkdown": "Редактируемый markdown",

  "dialog.close": "Закрыть",
  "dialogControls.cancel": "Отмена",
  "dialogControls.save": "Сохранить",

  "uploadImage.dialogTitle": "Добавить изображение",
  "uploadImage.uploadInstructions": "Загрузите изображение с устройства:",
  "uploadImage.addViaUrlInstructions": "Или вставьте ссылку на изображение:",
  "uploadImage.addViaUrlInstructionsNoUpload": "Вставьте ссылку на изображение:",
  "uploadImage.autoCompletePlaceholder": "Выберите или вставьте URL изображения",
  "uploadImage.alt": "Альтернативный текст:",
  "uploadImage.title": "Подпись:",
  "uploadImage.width": "Ширина:",
  "uploadImage.height": "Высота:",

  "imageEditor.deleteImage": "Удалить изображение",
  "imageEditor.editImage": "Изменить изображение",

  "createLink.title": "Создать ссылку",
  "createLink.url": "URL",
  "createLink.urlPlaceholder": "Выберите или вставьте URL",
  "createLink.text": "Текст",
  "createLink.textTooltip": "Текст ссылки",
  "createLink.titleTooltip": "Заголовок ссылки",
  "createLink.saveTooltip": "Сохранить ссылку",
  "createLink.cancelTooltip": "Отменить",

  "linkPreview.open": "Открыть",
  "linkPreview.edit": "Изменить",
  "linkPreview.copyToClipboard": "Копировать",
  "linkPreview.copied": "Скопировано",
  "linkPreview.remove": "Удалить",

  "toolbar.bold": "Жирный",
  "toolbar.removeBold": "Убрать жирный",
  "toolbar.italic": "Курсив",
  "toolbar.removeItalic": "Убрать курсив",
  "toolbar.underline": "Подчёркивание",
  "toolbar.removeUnderline": "Убрать подчёркивание",
  "toolbar.strikethrough": "Зачёркивание",
  "toolbar.removeStrikethrough": "Убрать зачёркивание",
  "toolbar.inlineCode": "Код",
  "toolbar.removeInlineCode": "Убрать код",
  "toolbar.highlight": "Выделение",
  "toolbar.removeHighlight": "Убрать выделение",
  "toolbar.subscript": "Нижний индекс",
  "toolbar.removeSubscript": "Убрать нижний индекс",
  "toolbar.superscript": "Верхний индекс",
  "toolbar.removeSuperscript": "Убрать верхний индекс",
  "toolbar.link": "Ссылка",
  "toolbar.image": "Изображение",
  "toolbar.table": "Таблица",
  "toolbar.codeBlock": "Блок кода",
  "toolbar.thematicBreak": "Разделитель",
  "toolbar.bulletedList": "Маркированный список",
  "toolbar.numberedList": "Нумерованный список",
  "toolbar.checkList": "Чек-лист",
  "toolbar.admonition": "Примечание",
  "toolbar.undo": "Отменить",
  "toolbar.redo": "Повторить",
  "toolbar.richText": "Визуальный режим",
  "toolbar.source": "Исходный код",
  "toolbar.diffMode": "Сравнение",
  "toolbar.insertFrontmatter": "Добавить frontmatter",
  "toolbar.editFrontmatter": "Редактировать frontmatter",
  "toolbar.toggleGroup": "Группа переключателей",
  "toolbar.blockTypeSelect.placeholder": "Тип блока",
  "toolbar.blockTypeSelect.selectBlockTypeTooltip": "Выберите тип блока",
  "toolbar.blockTypes.paragraph": "Абзац",
  "toolbar.blockTypes.quote": "Цитата",
  "toolbar.blockTypes.heading": "Заголовок {{level}}",

  "table.deleteTable": "Удалить таблицу",
  "table.columnMenu": "Меню столбца",
  "table.rowMenu": "Меню строки",
  "table.textAlignment": "Выравнивание текста",
  "table.alignLeft": "По левому краю",
  "table.alignCenter": "По центру",
  "table.alignRight": "По правому краю",
  "table.insertColumnLeft": "Столбец слева",
  "table.insertColumnRight": "Столбец справа",
  "table.deleteColumn": "Удалить столбец",
  "table.insertRowAbove": "Строка сверху",
  "table.insertRowBelow": "Строка снизу",
  "table.deleteRow": "Удалить строку",

  "codeBlock.language": "Язык",
  "codeBlock.selectLanguage": "Выберите язык",
  "codeBlock.inlineLanguage": "Язык кода",
  "codeblock.delete": "Удалить блок кода",

  "admonitions.note": "Заметка",
  "admonitions.tip": "Совет",
  "admonitions.info": "Информация",
  "admonitions.caution": "Внимание",
  "admonitions.danger": "Важно",
  "admonitions.changeType": "Изменить тип",
  "admonitions.placeholder": "Введите текст…",

  "frontmatterEditor.title": "Frontmatter",
  "frontmatterEditor.key": "Ключ",
  "frontmatterEditor.value": "Значение",
  "frontmatterEditor.addEntry": "Добавить поле",
};

export const mdxEditorRu: Translation = (key, defaultValue, interpolations = {}) => {
  let value = ru[key] ?? defaultValue;
  for (const [k, v] of Object.entries(interpolations)) {
    value = value.replaceAll(`{{${k}}}`, String(v));
  }
  return value;
};

export async function uploadEditorImage(image: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", image);
  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Не удалось загрузить изображение");
  }
  const file = (await response.json()) as { url?: string };
  const filename =
    typeof file.url === "string"
      ? file.url.split(/[/\\]/).pop()
      : undefined;
  if (!filename) {
    throw new Error("Сервер не вернул URL файла");
  }
  return `/api/uploads/${encodeURIComponent(filename)}`;
}
