import type { Metadata } from "next";

import { auth } from "@/auth";
import { getPublicUserProfile } from "@/app/lib/user";
import NotFound from "@/components/layout/not-found";
import { PublicUserProfile } from "@/components/user/PublicUserProfile";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const user = await getPublicUserProfile((await params).id);
  if (!user) {
    return { title: "Профиль не найден" };
  }
  const fullName = [user.name, user.surname].filter(Boolean).join(" ");
  return {
    title: fullName,
    description: user.userDetails?.position
      ? `Профиль: ${fullName} — ${user.userDetails.position}`
      : `Публичный профиль пользователя ${fullName}`,
  };
}

export default async function ProfilePage() {
  const session = await auth();
  const user = await getPublicUserProfile(session?.user?.id ?? "");
  if (!user) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <NotFound text="Пользователь не найден" />
      </main>
    );
  }

  return (
    <main>
      <PublicUserProfile
        user={user}
        isOwn={true}
        isLoggedIn={!!session?.user}
      />
    </main>
  );
}