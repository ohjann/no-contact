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
import { Await, useLoaderData, useSubmit } from "@remix-run/react";
import { mongodb } from "~/utils/db.server";
import * as openpgp from "openpgp";
import { Suspense, useState } from "react";

import * as steg from "../lib/steganography.js";
import Raffle from "../assets/raffle-ticket-sheet-png-64-os4g9z2rhcq4vwsq.png";
import { copycat } from "@snaplet/copycat";

export async function action({ request }: ActionArgs) {
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
  const collection = db.collection("messages");

  const messages = await collection.find().toArray();

  return json({ messages });
}

async function encryptMessage(passedPublicKey: string, message: string) {
  const publicKey = await openpgp.readKey({ armoredKey: passedPublicKey });

  return openpgp.encrypt({
    message: await openpgp.createMessage({ text: message }), // input as Message object
    encryptionKeys: publicKey,
  });
}

async function decryptMessage(passedPrivateKey: string, encrypted: string) {
  if (!encrypted.includes("BEGIN")) {
    // not a pgp message
    return encrypted;
  }

  const message = await openpgp.readMessage({
    armoredMessage: encrypted, // parse armored message
  });
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({ armoredKey: passedPrivateKey }),
    passphrase: "super long and hard to guess secret",
  });
  const { data: decrypted } = await openpgp.decrypt({
    message,
    decryptionKeys: privateKey,
  });
  return decrypted;
}

async function downloadPGPKeys() {
  const { privateKey, publicKey } = await openpgp.generateKey({
    type: "rsa", // Type of the key
    rsaBits: 4096, // RSA key size (defaults to 4096 bits)
    userIDs: [{ name: "Jon Smith", email: "jon@example.com" }], // you can pass multiple user IDs
    passphrase: "super long and hard to guess secret", // protects the private key
  });

  /* HACKY PGP FILE DOWNLOAD */
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(privateKey)
  );
  element.setAttribute("download", "private.pgp");
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);

  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(publicKey)
  );
  element.setAttribute("download", "public.pgp");
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function App() {
  const { messages } = useLoaderData();
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

  const handleFileChange =
    (type: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
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
    <>
      <button onClick={downloadPGPKeys}>Download</button>
      <MinChatUiProvider theme="#6ea9d7">
        <MainContainer style={{ height: "100vh" }}>
          <MessageContainer>
            <MessageHeader />
            <Suspense fallback={<div>Loading...</div>}>
              <Await resolve={decryptedMessages}>
                {(resolvedValue) => (
                  <MessageList
                    currentUserId="eoghan"
                    messages={resolvedValue || []}
                  />
                )}
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
      <div>
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
    </>
  );
}

export default App;
