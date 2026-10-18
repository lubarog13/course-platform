"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import Loading from "../layout/loading";
import ErrorView from "../layout/error-view";
import MessagesChat from "./MessagesChat";
import MessagesSidebar from "./MessagesSidebar";
import type { ConversationDto, Receiver } from "@/app/lib/messages";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export default function MessagesView() {
  const { data: session, status } = useSession();
  const [receiver, setReceiver] = useState<Receiver | null>(null);
  const [refetch, setRefetch] = useState(false);
  const [currentTab, setCurrentTab] = useState<"sidebar" | "chat">("sidebar");
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const openChat = (next: Receiver) => {
    setReceiver(next);
    setCurrentTab("chat");
  };

  const handleDialogClick = (dialog: ConversationDto) => {
    openChat({
      id: dialog.peer.id,
      name: dialog.peer.name,
      surname: dialog.peer.surname,
      patronymic: dialog.peer.patronymic,
      email: dialog.peer.email,
      phone: null,
      role: dialog.peer.role,
    });
  };

  const handleMessageSend = () => {
    setRefetch((value) => !value);
  };

  const handleBackButtonClick = () => {
    setCurrentTab("sidebar");
    // receiver оставляем до конца exit-анимации чата — очистим после
  };

  const handleChatDeleted = () => {
    setRefetch((value) => !value);
    setCurrentTab("sidebar");
    setReceiver(null);
  };

  if (status === "loading") {
    return <Loading />;
  }

  if (status === "unauthenticated") {
    return (
      <ErrorView
        title="Не авторизован"
        text="Необходимо авторизоваться"
        type="access_denied"
        showLoginButton={true}
        showBackButton={true}
        showReloadButton={false}
      />
    );
  }

  const showSidebar = isDesktop || currentTab === "sidebar";
  const showChat = isDesktop || currentTab === "chat";

  return (
    <div className="container mx-auto min-h-full w-full">
      <div
        className={cn(
          "relative h-full w-full gap-4",
          "md:grid md:grid-cols-[300px_1fr]",
          "min-h-[calc(100dvh-12rem)]",
        )}
      >
        <AnimatePresence
          initial={false}
          onExitComplete={() => {
            if (currentTab === "sidebar") setReceiver(null);
          }}
        >
          {showSidebar && (
            <motion.div
              key="messages-sidebar"
              className={cn(
                "col-span-1 h-full w-full",
                !isDesktop && "absolute inset-0 z-20",
              )}
              initial={isDesktop ? false : { opacity: 0, x: "-28%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={
                isDesktop
                  ? undefined
                  : { opacity: 0, x: "-28%", transition: { duration: 0.28, ease } }
              }
              transition={{ duration: 0.32, ease }}
            >
              <MessagesSidebar
                userId={Number(session?.user.id)}
                currentReceiver={receiver}
                refetch={refetch}
                onDialogClick={handleDialogClick}
                onReceiverClick={openChat}
              />
            </motion.div>
          )}

          {showChat && (
            <motion.div
              key="messages-chat"
              className={cn(
                "col-span-1 h-full w-full",
                !isDesktop && "absolute inset-0 z-10",
              )}
              initial={isDesktop ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={
                isDesktop
                  ? undefined
                  : { opacity: 0, transition: { duration: 0.22, ease } }
              }
              transition={{ duration: 0.28, ease }}
            >
              <MessagesChat
                userId={Number(session?.user.id)}
                receiver={receiver}
                onMessageSend={handleMessageSend}
                onBackButtonClick={handleBackButtonClick}
                onChatDeleted={handleChatDeleted}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
