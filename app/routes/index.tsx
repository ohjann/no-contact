import {
  MinChatUiProvider,
  MainContainer,
  MessageInput,
  MessageContainer,
  MessageList,
  MessageHeader,
} from "@minchat/react-chat-ui";
import { json } from "@remix-run/node";
import type { ActionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { mongodb } from "~/utils/db.server";

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const message = formData.get("message");

  const db = mongodb.db("nocontact");
  const collection = db.collection("messages");
  await collection.insertOne({
    text: message,
    user: { id: "eoghan", name: "Eoghan" },
    sentAt: new Date(),
  });
  return json({ ok: true });
}

export async function loader() {
  const db = mongodb.db("nocontact");
  const collection = db.collection("messages");

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

  return (
    <MinChatUiProvider theme="#6ea9d7">
      <MainContainer style={{ height: "100vh" }}>
        <MessageContainer>
          <MessageHeader />
          <MessageList currentUserId="eoghan" messages={messages || []} />
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
