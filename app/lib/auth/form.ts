import z, { object, string } from "zod"
 
export const signInSchema = object({
  email: z.string({error: "Email не может быть пустым"}).min(1, "Email не может быть пустым").email("Неверный email"),
  password: z.string({error: "Пароль не может быть пустым"}).min(1, "Заполните пароль"),
})

export const signUpSchema = object({
  email: z.string({error: "Email не может быть пустым"}).min(1, "Email не может быть пустым").email("Неверный email"),
  password: z.string("Пароль не может быть пустым").min(1, "Заполните пароль"),
  confirmPassword: z.string({error: "Подтверждение пароля не может быть пустым"}).min(1, "Заполните подтверждение пароля"),
  name: z.string({error: "Имя не может быть пустым"}).min(1, "Имя не может быть пустым"),
  surname: z.string({error: "Фамилия не может быть пустым"}).min(1, "Фамилия не может быть пустым"),
  patronymic: z.string().nullable(),
  phone: z.string().nullable(),
  userDetails: object({
    position: z.string().nullable(),
    achievements: z.array(z.string()).nullable(),
  }).nullable(),
  role: z.enum(["student", "teacher", "admin"]),

}).refine((data) => {
  if (data.patronymic) {
    return data.patronymic.length > 0;
  }
  return true;
}, {
  path: ["patronymic"],
  message: "Отчество не может быть пустым",
}).refine((data) => {
  if (data.phone) {
    return data.phone.length > 0 && /^\+7\d{10}$/.test(data.phone);
  }
  return true;
}, {
  path: ["phone"],
  message: "Неверный формат телефона",
})
.refine((data) => {
  if (data.password) {
    // Пароль должен быть не менее 8 символов, содержать буквы и цифры
    if (data.password.length < 8) return false;
    // Должен содержать хотя бы одну букву и одну цифру
    if (!/[A-Za-zА-Яа-яЁё]/.test(data.password)) return false;
    if (!/[0-9]/.test(data.password)) return false;
    return data.password.length >= 8 && !/^\s*$/.test(data.password);
  }
  return true;
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