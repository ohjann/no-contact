import {
  MinChatUiProvider,
  MainContainer,
  MessageInput,
  MessageContainer,
  MessageList,
  MessageHeader,
} from "@minchat/react-chat-ui";

import { copycat } from "@snaplet/copycat";
import { Suspense, useMemo } from "react";
import { Await, useSubmit } from "@remix-run/react";
import type { Message } from "../../types";
import { decryptMessage, encryptMessage } from "~/lib/utils";

type Props = {
  messages: Message[];
  privateFileContent?: string;
  publicFileContent?: string;
};

export default function Chat({
  messages,
  privateFileContent,
  publicFileContent,
}: Props) {
  const submit = useSubmit();

  const decryptedMessages = useMemo(
    () =>
      Promise.all(
        messages.map(async (m: any) => {
          if (!privateFileContent || !m.text.includes("BEGIN")) {
            return m;
          }
          return {
            ...m,
            text: await decryptMessage(privateFileContent.toString(), m.text),
          };
        })
      ),
    [messages, privateFileContent]
  );

  if (!privateFileContent || !publicFileContent) {
    return "";
  }

  const handleMessageSend = async (message: string) => {
    const encryptedMessage = await encryptMessage(
      publicFileContent!.toString(),
      message
    );
    submit(
      {
        message: encryptedMessage.toString(),
        scrambled: copycat.scramble(message), // for UI purposes
      },
      { method: "post", preventScrollReset: true, replace: true }
    );
  };

  const currentUserId = "eoghan";
  return (
    <MinChatUiProvider
      colorSet={{
        "--container-background-color": "rgba(0, 0, 0, 0)",
        "--chatitem-background-color": "rgba(0, 0, 0, 0)",
        "--chatlist-header-background-color": "rgba(0, 0, 0, 0)",
        "--message-header-background-color": "rgba(0, 0, 0, 0)",
        "--input-background-color": "rgba(0, 0, 0, 0)",
        "--messagelist-background-color": "rgba(0, 0, 0, 0)",
      }}
      theme="#00000"
    >
      <div>
        <MainContainer>
          <MessageContainer>
            <Suspense fallback={<div className="h-full">Decrypting...</div>}>
              <Await resolve={decryptedMessages}>
                {(resolvedValue) =>
                  currentUserId !== "eoghan" ? (
                    <div className="[&>*>*>*>*>*>div>*>div:nth-child(2)]:bg-black [&>*>*>*>*>*>div>*>div:nth-child(2)]:p-0">
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
            <div>
              <MessageInput
                placeholder="Type message here"
                showSendButton
                onSendMessage={handleMessageSend}
              />
            </div>
          </MessageContainer>
        </MainContainer>
      </div>
    </MinChatUiProvider>
  );
}
