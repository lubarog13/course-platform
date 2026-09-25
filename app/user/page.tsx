import { UserProfile } from "@/components/user/UserProfile"
export default function UserPage() {
    return (
        <div className="container max-w-2xl min-h-screen mx-auto py-8">
            <h1 className="text-2xl font-bold mb-4">Профиль</h1>
            <UserProfile />
        </div>
    )
}