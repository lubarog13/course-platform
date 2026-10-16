import MessagesView from "@/components/messages/MessagesView";

export default function MessagesPage() {
  return (
    <div className="container mx-auto p-4 min-h-screen">
      <h1 className="text-2xl font-bold my-8">Сообщения</h1>
      <MessagesView />
    </div>
  );
}