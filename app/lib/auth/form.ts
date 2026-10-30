import z, { object, string } from "zod"
 
export const signInSchema = object({
  email: z.string({error: "Email не может быть пустым"}).min(1, "Email не может быть пустым").email("Неверный email"),
  password: z.string({error: "Пароль не может быть пустым"}).min(1, "Заполните пароль"),
})

const emptyToNull = (value: unknown) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

/** Пустой или незаполненный маской номер (+7) → null */
const phoneToNull = (value: unknown) => {
  const normalized = emptyToNull(value);
  if (normalized == null || typeof normalized !== "string") return null;
  const digits = normalized.replace(/\D/g, "");
  if (!digits || digits === "7") return null;
  return normalized.startsWith("+") ? normalized : `+${digits}`;
};

export const signUpSchema = object({
  email: z.string({error: "Email не может быть пустым"}).min(1, "Email не может быть пустым").email("Неверный email"),
  password: z.string("Пароль не может быть пустым").min(1, "Заполните пароль"),
  confirmPassword: z.string({error: "Подтверждение пароля не может быть пустым"}).min(1, "Заполните подтверждение пароля"),
  name: z.string({error: "Имя не может быть пустым"}).min(1, "Имя не может быть пустым"),
  surname: z.string({error: "Фамилия не может быть пустым"}).min(1, "Фамилия не может быть пустым"),
  patronymic: z.preprocess(emptyToNull, z.string().nullable()),
  phone: z.preprocess(phoneToNull, z.string().nullable()),
  userDetails: z.preprocess(
    emptyToNull,
    object({
      position: z.preprocess(emptyToNull, z.string().nullable()).optional(),
      achievements: z.array(z.string()).nullable().optional(),
    }).nullable(),
  ),
  role: z.enum(["student", "teacher", "admin"]).default("student"),
}).refine((data) => {
  if (data.phone == null) return true;
  return /^\+7\d{10}$/.test(data.phone);
}, {
  path: ["phone"],
  message: "Неверный формат телефона",
})
.refine((data) => {
  if (!data.password) return true;
  if (data.password.length < 8) return false;
  if (!/[A-Za-zА-Яа-яЁё]/.test(data.password)) return false;
  if (!/[0-9]/.test(data.password)) return false;
  return !/^\s*$/.test(data.password);
}, {
  path: ["password"],
  message: "Пароль должен быть не менее 8 символов, содержать буквы и цифры",
})
.refine((data) => {
  return data.password === data.confirmPassword;
}, {
  path: ["confirmPassword"],
  message: "Пароли не совпадают",
})