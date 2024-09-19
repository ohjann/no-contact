import { Suspense, useEffect, useMemo } from "react";
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
import type { Message } from "../types";
import { decryptMessage, encryptMessage } from "../lib/utils";
import { useGetUserIdFromPublicKey } from "../hooks/useGetUserIdFromPublicKey";

import { useKeyFileContent } from "../root";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const message = formData.get("message");
  const scrambled = formData.get("scrambled");
  const identity = formData.get("identity");

  if (message && identity) {
    const db = mongodb.db("nocontact"); // TODO: db layer
    const collection = db.collection("messages");
    await collection.insertOne({
      text: message,
      scrambled,
      user: JSON.parse(identity.toString()),
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
  const { getUser, user } = useGetUserIdFromPublicKey();

  const { publicKeyFileContent, privateKeyFileContent } = useKeyFileContent();

  useEffect(() => {
    getUser(publicKeyFileContent as string);
  }, [publicKeyFileContent, getUser]);

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
    return <Navigate to={"/id-check"} replace />;
  }

  const handleMessageSend = async (message: string) => {
    const encryptedMessage = await encryptMessage(
      publicKeyFileContent!.toString(),
      message
    );
    submit(
      {
        message: encryptedMessage.toString(),
        scrambled: copycat.scramble(message), // for UI purposes
        identity: JSON.stringify(user),
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
                  {(resolvedValue) => {
                    console.log(user, resolvedValue);
                    return user ? (
                      <div>
                        <MessageList
                          currentUserId={user.id}
                          messages={resolvedValue.map((m) => ({
                            ...m,
                            text: m.text.includes("BEGIN")
                              ? m.scrambled
                              : m.text,
                            user: user,
                          }))}
                        />
                      </div>
                    ) : (
                      ""
                    );
                  }}
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
