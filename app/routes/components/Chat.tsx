import {
  MinChatUiProvider,
  MainContainer,
  MessageInput,
  MessageContainer,
  MessageList,
} from "@minchat/react-chat-ui";

import { copycat } from "@snaplet/copycat";
import { Suspense, useMemo } from "react";
import { Await, useSubmit } from "@remix-run/react";
import type { Message, User } from "../../types";
import {
  decryptMessage,
  encryptMessage,
  getUserIdFromPublicKey,
} from "~/lib/utils";

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

  let identity: User;

  getUserIdFromPublicKey(publicFileContent).then((id) => {
    if (id) {
      const [name, email] = id[0].split(" <");
      identity = {
        name,
        id: email.substring(0, email.length - 1),
      };
    }
  });

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

  return (
    <MinChatUiProvider
      colorSet={{
        "--container-background-color": "rgba(0, 0, 0, 0)",
        "--chatitem-background-color": "rgba(0, 0, 0, 0)",
        "--chatlist-header-background-color": "rgba(0, 0, 0, 0)",
        "--message-header-background-color": "rgba(0, 0, 0, 0)",
        "--input-background-color": "rgba(0, 0, 0, 0)",
        "--messagelist-background-color": "rgba(0, 0, 0, 0)",
        "--incoming-message-background-color": "rgba(0, 0, 0, 0.2)",
        "--incoming-message-text-color": "rgba(200, 200, 200, 0.8)",
        "--incoming-message-name-text-color": "rgba(255, 255, 255, 0.4)",
        "--outgoing-message-background-color": "rgba(200, 200, 200, 0.8)",
        "--outgoing-message-text-color": "rgba(0, 0, 0, 0.9)",
        "--outgoing-message-name-text-color": "rgba(255, 255, 255, 0.4)",
      }}
      theme="#00000"
    >
      <div className="col-start-2 bg-white rounded-sm h-[700px] max-h-[100vh] shadow-[0_0px_20px_0px_rgba(255,255,255,255.3)] min-w-[490px]">
        <MainContainer>
          <MessageContainer>
            <Suspense fallback={<div className="h-full">Decrypting...</div>}>
              <Await resolve={decryptedMessages}>
                {(resolvedValue) =>
                  identity && identity.name !== "eoghan" ? (
                    <div className="[&>*>*>*>*>*>div>*>div:nth-child(2)]:bg-black [&>*>*>*>*>*>div>*>div:nth-child(2)]:p-0">
                      <MessageList
                        currentUserId={identity}
                        messages={
                          messages.map((m) => ({
                            ...m,
                            text: m.scrambled,
                            user: identity,
                          })) || []
                        }
                      />
                    </div>
                  ) : (
                    <MessageList
                      currentUserId={identity}
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
                showAttachButton={false}
              />
            </div>
          </MessageContainer>
        </MainContainer>
      </div>
    </MinChatUiProvider>
  );
}
