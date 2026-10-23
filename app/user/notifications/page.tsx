import NotificationList from "@/components/user/NotificationList";

export default function NotificationsPage() {
    return <div className="container max-w-2xl min-h-screen px-4 md:px-0 mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Уведомления</h1>
        <NotificationList />
    </div>
}