"use client"

import { useSession } from "next-auth/react"
import { User } from "@prisma/client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Loading from "../layout/loading";
import NotFound from "../layout/not-found";
import { SignupForm } from "../auth/SignupForm"

export function UserProfile() {
    const { data: session, status } = useSession()
    const sessionUser = session?.user
    const [loading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter()
    if (status === "unauthenticated") {
        router.push("/login")
        return null
    }
    console.log(status, sessionUser?.id)
    const [user, setUser] = useState<User | null>(null);
    const fetchUser = async (signal: AbortSignal) => {
        fetch(`/api/user/${sessionUser?.id}`, {
            signal: signal,
        })
        .then(res => {
            if (!res.ok) {
                if (res.status === 401) {

                    //router.push("/login");
                    return null;
                }
                throw new Error("Не удалось загрузить профиль");
            }
            return res.json();})
        .then(data => setUser(data))
        .catch(err => setError(err.message))
        .finally(() => {
            if (!signal.aborted) setIsLoading(false);
        });
    }
    useEffect(() => {
        if (status === "authenticated") {
        const abortController = new AbortController();
        fetchUser(abortController.signal);
        return () => abortController.abort();
        } else if (status === "loading") {
            setIsLoading(true);
        } else if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [sessionUser?.id, status])
    if (loading) return <Loading text="Загрузка профиля..." />;
    if (!user) {
        return <NotFound text="Пользователь не найден" />
    }
    return <>
        {error && (
            <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm mb-4">
              {error}
            </p>
          )}
          <SignupForm editMode={true} user={user} />
        </>
}