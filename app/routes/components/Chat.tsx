import {
  MinChatUiProvider,
  MainContainer,
  MessageInput,
  MessageContainer,
  MessageList,
  MessageHeader,
} from "@minchat/react-chat-ui";

import { Suspense } from "react";
import { Await } from "@remix-run/react";
import type { Message } from "../../types";
import { decryptMessage } from "~/lib/utils";

type Props = {
  messages: Message[];
  privateFileContent?: string;
  handleMessageSend: (text: string) => void;
};

export default function Chat({
  messages,
  privateFileContent,
  handleMessageSend,
}: Props) {
  const decryptedMessages = Promise.all(
    messages.map(async (m: any) => {
      if (!privateFileContent || !m.text.includes("BEGIN")) {
        return m;
      }
      return {
        ...m,
        text: await decryptMessage(privateFileContent.toString(), m.text),
      };
    })
  );

  const currentUserId = "eoghan";
  return (
    <MinChatUiProvider theme="#6ea9d7">
      <MainContainer style={{ height: "100vh" }}>
        <MessageContainer>
          <MessageHeader />
          <Suspense fallback={<div>Loading...</div>}>
            <Await resolve={decryptedMessages}>
              {(resolvedValue) =>
                currentUserId !== "eoghan" ? (
                  <div className="[&>*>*>*>*>*>div>*>div]:blur-sm">
                    <MessageList
                      currentUserId={currentUserId}
                      messages={
                        messages.map((m) => ({
                          ...m,
                          text: m.scrambled,
                          user: currentUserId,
                        })) || []
                      }
                    />
                  </div>
                ) : (
                  <MessageList
                    currentUserId={currentUserId}
                    messages={resolvedValue || []}
                  />
                )
              }
            </Await>
          </Suspense>
          <MessageInput
            placeholder="Type message here"
            showSendButton
            onSendMessage={handleMessageSend}
          />
        </MessageContainer>
      </MainContainer>
    </MinChatUiProvider>
  );
}
