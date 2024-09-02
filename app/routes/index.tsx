import {
  MinChatUiProvider,
  MainContainer,
  MessageInput,
  MessageContainer,
  MessageList,
  MessageHeader,
} from "@minchat/react-chat-ui";
import { json } from "@remix-run/node";
import type { LoaderArgs, type ActionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { mongodb } from "~/utils/db.server";

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const message = formData.get("message");

  const db = await mongodb.db("nocontact");
  const collection = await db.collection("messages");
  const result = await collection.insertOne({
    text: message,
    user: { id: "eoghan", name: "Eoghan" },
    sentAt: new Date(),
  });
  return json({ ok: true });
}

export async function loader({ request }: LoaderArgs) {
  const db = await mongodb.db("nocontact");
  const collection = await db.collection("messages");

  const messages = await collection.find().toArray();
  return json({ messages });
}

function App() {
  const { messages } = useLoaderData();
  const submit = useSubmit();
  const handleMessageSend = (message: string) => {
    submit(
      { message },
      { method: "post", preventScrollReset: true, replace: true }
    );
  };

  console.log(messages);
  return (
    <MinChatUiProvider theme="#6ea9d7">
      <MainContainer style={{ height: "100vh" }}>
        <MessageContainer>
          <MessageHeader />
          <MessageList currentUserId="dan" messages={messages || []} />
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

export default App;
