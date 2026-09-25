import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full max-w-xl mx-auto">
      <h1 className="text-2xl font-bold w-full">Регистрация</h1>
      <p className="text-sm text-gray-500 w-full mb-4">
        Заполните форму для регистрации
      </p>
      <div className="w-full">
        <Suspense>
          <SignupForm editMode={false} />
        </Suspense>
      </div>
    </div>
  );
}