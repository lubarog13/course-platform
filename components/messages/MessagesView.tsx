"use client";

import { useSession } from "next-auth/react";
import Loading from "../layout/loading";
import ErrorView from "../layout/error-view";
import MessagesChat from "./MessagesChat";
import MessagesSidebar from "./MessagesSidebar";
import { Receiver } from "@/app/lib/messages";
import { useState } from "react";
export default function MessagesView() {
    const {data: session, status} = useSession();
    const [receiver, setReceiver] = useState<Receiver | null>(null);

    if (status === "loading") {
        return <Loading />;
    }

    if (status === "unauthenticated") {
        return <ErrorView title="Не авторизован" text="Необходимо авторизоваться" type="access_denied" showBackButton={true} showReloadButton={false} />;
    }


  return <div className="min-h-full w-full container mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="col-span-1">
        <MessagesSidebar />
      </div>
      <div className="col-span-1">
        <MessagesChat userId={Number(session?.user.id)} receiver={receiver} />
      </div>
    </div>
  </div>
}