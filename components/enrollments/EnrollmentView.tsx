"use client"

import { useState } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import DeadleneExtensionList from "./DeadleneExtensionList"
import EnrollmentList from "./EnrollmentList"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
export default function EnrollmentView() {
    const searchParams = useSearchParams()
    const {status, data: session} = useSession()
    const [selectedTab, setSelectedTab] = useState<"enrollment" | "extensions">("enrollment")
    const router = useRouter()
    useEffect(() => {
        const tab = searchParams.get("tab")
        if (tab) {
            setSelectedTab(tab as "enrollment" | "extensions")
        }
    }, [searchParams])

    const handleTabChange = (value: string[]) => {
        setSelectedTab(value[0] as "enrollment" | "extensions")
        router.replace(`/user/enrollments?tab=${value[0]}`, { scroll: false })
    }
    useEffect(() => {
        if (status === "authenticated" && session?.user.role === "student") {
            router.replace("/user/enrollments?tab=enrollment", { scroll: false })
        }
    }, [status, session, router])
    return (
        <div className="flex flex-col gap-4">
            {status === "authenticated" && session?.user.role !== "student" && (
            <ToggleGroup value={[selectedTab]} onValueChange={handleTabChange}>
                <ToggleGroupItem value="enrollment">Зачисления</ToggleGroupItem>
                <ToggleGroupItem value="extensions">Сброс сроков</ToggleGroupItem>
            </ToggleGroup>
            )}
            {selectedTab === "enrollment" && <EnrollmentList />}
            {selectedTab === "extensions" && <DeadleneExtensionList />}
        </div>
    )
}