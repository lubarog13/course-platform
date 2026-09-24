import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full max-w-md mx-auto">
      <h1 className="text-2xl font-bold w-full">Авторизация</h1>
      <p className="text-sm text-gray-500 w-full mb-4">
        Введите ваш email и пароль для авторизации
      </p>
      <div className="w-full max-w-md">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}