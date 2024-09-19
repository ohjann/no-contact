import { Suspense, useMemo } from "react";
import {
  MinChatUiProvider,
  MainContainer,
  MessageInput,
  MessageContainer,
  MessageList,
} from "@minchat/react-chat-ui";

import { mongodb } from "../utils/db.server.js";
import { copycat } from "@snaplet/copycat";
import type { ActionFunctionArgs } from "@remix-run/node";
import {
  Await,
  useLoaderData,
  useSubmit,
  json,
  Navigate,
} from "@remix-run/react";
import type { Message, User } from "../types";
import {
  decryptMessage,
  encryptMessage,
  getUserIdFromPublicKey,
} from "../lib/utils";

import { useKeyFileContent } from "../root";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const message = formData.get("message");
  const scrambled = formData.get("scrambled");

  if (message) {
    const db = mongodb.db("nocontact");
    const collection = db.collection("messages");
    await collection.insertOne({
      text: message,
      scrambled,
      user: { id: "eoghan", name: "Eoghan" },
      sentAt: new Date(),
    });
  }
  return json({ ok: true });
}

export async function loader() {
  const db = mongodb.db("nocontact");
  const collection = db.collection<Message>("messages");

  const messages: Message[] = await collection.find().toArray();
  return json({ messages });
}

export default function Chat() {
  const { messages } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const { publicKeyFileContent, privateKeyFileContent } = useKeyFileContent();

  const decryptedMessages = useMemo(
    () =>
      Promise.all(
        messages
          .filter(({ text }) => text)
          .map(async (m: any) => {
            if (!privateKeyFileContent || !m.text.includes("BEGIN")) {
              return m;
            }
            try {
              const text = await decryptMessage(
                privateKeyFileContent.toString(),
                m.text
              );
              return {
                ...m,
                text,
              };
            } catch (e) {
              console.log(e);
              return {
                ...m,
                text: "ERROR",
              };
            }
          })
      ),
    [messages, privateKeyFileContent]
  );

  if (!privateKeyFileContent || !publicKeyFileContent) {
    console.log(privateKeyFileContent, publicKeyFileContent);
    return <Navigate to={"/id-check"} replace />;
  }

  let identity: User;

  getUserIdFromPublicKey(publicKeyFileContent as string).then((id) => {
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
      publicKeyFileContent!.toString(),
      message
    );
    submit(
      {
        message: encryptedMessage.toString(),
        scrambled: copycat.scramble(message), // for UI purposes
      },
      {
        method: "post",
        preventScrollReset: true,
        replace: true,
        navigate: false,
      }
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
            {messages.length > 0 && (
              <Suspense fallback={<div className="h-full">Decrypting...</div>}>
                <Await resolve={decryptedMessages}>
                  {(resolvedValue) =>
                    identity && identity.name !== "eoghan" ? (
                      <div className="[&>*>*>*>*>*>div>*>div:nth-child(2)]:bg-black [&>*>*>*>*>*>div>*>div:nth-child(2)]:p-0">
                        <MessageList
                          currentUserId={identity.id}
                          messages={messages.map((m) => ({
                            ...m,
                            text: m.scrambled,
                            user: identity,
                          }))}
                        />
                      </div>
                    ) : (
                      <MessageList
                        currentUserId={identity.id}
                        messages={resolvedValue}
                      />
                    )
                  }
                </Await>
              </Suspense>
            )}
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
