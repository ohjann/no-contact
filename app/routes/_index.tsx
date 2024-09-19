import { useState } from "react";
import type { ChangeEvent } from "react";
import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import Chat from "./components/Chat";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";

import { mongodb } from "../utils/db.server.js";
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
        <Dialog open={!publicFileContent || !privateFileContent}>
          <DialogContent className="noise border-black">
            <DialogHeader>
              <DialogTitle className="text-white">Identity Check</DialogTitle>
              <DialogDescription>
                <form className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="public">Public Key</label>
                    <Input
                      type="file"
                      id="public"
                      name="public"
                      onChange={handleFileChange("public")}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="private">Private Key</label>
                    <Input
                      type="file"
                      id="private"
                      name="private"
                      onChange={handleFileChange("private")}
                      required
                    />
                  </div>
                </form>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <Chat
          messages={messages}
          privateFileContent={privateFileContent as string}
          publicFileContent={publicFileContent as string}
        />
      </div>
    </div>
  );
}

export default App;
