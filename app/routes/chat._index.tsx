import { useEffect, useState } from "react";
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
import { useLoaderData, useSubmit, json, Navigate } from "@remix-run/react";
import type { Message } from "../types";
import { decryptMessage, encryptMessage } from "../lib/utils";
import { useGetUserIdFromPublicKey } from "../hooks/useGetUserIdFromPublicKey";

import { useKeyFileContent } from "../root";
import { ObjectId } from "mongodb";

type MessageType = {
  user: {
    id: string;
    name: string;
  };
  id?: string;
  text?: string;
  createdAt?: Date;
  seen?: boolean;
  loading?: boolean;
};

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
  const users = await db.collection("users").find().toArray();
  return json({ messages, users: users.map((u) => u.name) });
}

export default function Chat() {
  const { messages: initialMessages, users } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const { getUser, user } = useGetUserIdFromPublicKey();
  const { publicKeyFileContent, privateKeyFileContent } = useKeyFileContent();
  const [decryptedMessages, setDecryptedMessages] = useState<MessageType[]>([]);

  useEffect(() => {
    getUser(publicKeyFileContent as string);
  }, [publicKeyFileContent, getUser]);

  useEffect(() => {
    const decryptInitialMessages = async () => {
      // get name of other user from db
      const otherUser = users.find((u) => u !== user?.name);

      const convertToMessageType = (
        message: Message,
        messageUser: { id: string; name: string } | null
      ): MessageType => ({
        id: message._id?.toString(),
        text: message.text,
        user: {
          id: messageUser?.id || "unknown",
          name: messageUser?.name || "unknown",
        },
        createdAt: new Date(message.sentAt),
      });

      // decrypt the messages
      const decrypted = await Promise.all(
        initialMessages
          .filter(({ text }) => text)
          .map(async (m: Message) => {
            if (!privateKeyFileContent || !m.text.includes("BEGIN")) {
              return convertToMessageType(m, user);
            }
            try {
              const decryptedText = await decryptMessage(
                privateKeyFileContent.toString(),
                m.text
              );
              return convertToMessageType(
                {
                  ...m,
                  text: decryptedText.toString(),
                },
                user
              );
            } catch (e) {
              return convertToMessageType(
                {
                  ...m,
                  text: m.scrambled,
                },
                { id: otherUser, name: otherUser }
              );
            }
          })
      );
      setDecryptedMessages(decrypted);
    };

    if (initialMessages.length > 0 && privateKeyFileContent && user) {
      decryptInitialMessages();
    }
  }, [initialMessages, privateKeyFileContent, user, users]);

  if (!privateKeyFileContent || !publicKeyFileContent) {
    console.log(privateKeyFileContent, publicKeyFileContent);
    return <Navigate to={"/id-check"} replace />;
  }

  const handleMessageSend = async (messageText: string) => {
    const encryptedMessage = await encryptMessage(
      publicKeyFileContent!.toString(),
      messageText
    );

    // Optimistic update
    const newMessage: MessageType = {
      id: new ObjectId().toString(),
      text: messageText,
      user: {
        id: user!.id,
        name: user!.name,
      },
      createdAt: new Date(),
    };
    setDecryptedMessages((prev) => [...prev, newMessage]);

    submit(
      {
        message: encryptedMessage.toString(),
        scrambled: copycat.scramble(messageText),
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
      <div className="col-start-2 bg-white rounded-sm h-[700px] max-h-[100vh] shadow-[0_0px_20px_0px_rgba(255,255,255,255.3)] min-w-[490px] [&>div>div>div:first-child]:min-h-[calc(100%-56px)] [&>div>div>div:nth-child(2)>div]:z-50 [&>div>div>div:nth-child(2)>div]:absolute [&>div>div>div:nth-child(2)>div]:bottom-0 [&>div>div>div>div>div:nth-child(2)>div]:justify-end">
        <MainContainer>
          <MessageContainer>
            {decryptedMessages.length > 0 && (
              <div>
                <MessageList
                  currentUserId={user?.id}
                  messages={decryptedMessages}
                />
              </div>
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
