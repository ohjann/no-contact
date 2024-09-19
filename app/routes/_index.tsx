import { useState } from "react";
import type { ChangeEvent } from "react";
import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";

import Chat from "./components/Chat";

import { copycat } from "@snaplet/copycat";
import { mongodb } from "../utils/db.server.js";
import { encryptMessage } from "../lib/utils.js";
import type { Message } from "~/types";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const message = formData.get("message");
  const scrambled = formData.get("scrambled");

  const db = mongodb.db("nocontact");
  const collection = db.collection("messages");
  await collection.insertOne({
    text: message,
    scrambled,
    user: { id: "eoghan", name: "Eoghan" },
    sentAt: new Date(),
  });
  return json({ ok: true });
}

export async function loader() {
  const db = mongodb.db("nocontact");
  const collection = db.collection<Message>("messages");

  const messages: Message[] = await collection.find().toArray();

  return json({ messages });
}

function App() {
  const { messages } = useLoaderData<typeof loader>();
  const [publicFileContent, setPublicFileContent] = useState<
    string | ArrayBuffer | null
  >();
  const [privateFileContent, setPrivateFileContent] = useState<
    string | ArrayBuffer | null
  >();

  const submit = useSubmit();
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

  const handleFileChange =
    (type: string) => (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target) {
            const content = e.target.result;
            if (type === "public") {
              setPublicFileContent(content);
            } else {
              setPrivateFileContent(content);
            }
          }
        };
        reader.readAsText(file);
      }
    };

  return (
    <div>
      <div>
        <Chat
          messages={messages}
          privateFileContent={privateFileContent as string}
          handleMessageSend={handleMessageSend}
        />
        <label htmlFor="public">Public:</label>
        <input
          type="file"
          id="public"
          name="public"
          onChange={handleFileChange("public")}
          required
        />
      </div>
      <div>
        <label htmlFor="private">Private:</label>
        <input
          type="file"
          id="private"
          name="private"
          onChange={handleFileChange("private")}
          required
        />
      </div>
    </div>
  );
}

export default App;
