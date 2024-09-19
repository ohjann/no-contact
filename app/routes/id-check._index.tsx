import { Form, Link, redirect, useSubmit } from "@remix-run/react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useKeyFileContent } from "../root";
import type { ActionFunctionArgs } from "@remix-run/node";
import { getUserIdFromPublicKey, verifyHashedString } from "~/lib/utils";
import { mongodb } from "~/utils/db.server";

export async function action({ request }: ActionFunctionArgs) {
  // Verify the pgp keys match expected keys in db
  const formData = await request.formData();
  const publicKey = formData.get("publicKey");
  const privateKey = formData.get("privateKey");
  if (!publicKey || !privateKey) {
    return new Response("", { status: 400 });
  }
  const userId = await getUserIdFromPublicKey(JSON.parse(publicKey.toString()));
  if (!userId?.length) {
    return new Response("", { status: 400 });
  }
  const [name, email] = userId[0].split(" ");
  const cleanedEmail = email.slice(1, -1);

  const db = mongodb.db("nocontact"); // TODO: db layer
  const collection = db.collection("users");
  const allUsers = await collection.find().toArray();

  if (
    !allUsers.find(({ name: hashedName, email: hashedEmail }) => {
      // iterate through all users because there's going to be max 2
      const [nameHash, nameSalt] = hashedName.split("+");
      const [emailHash, emailSalt] = hashedEmail.split("+");
      return (
        verifyHashedString(name, nameHash, nameSalt) &&
        verifyHashedString(cleanedEmail, emailHash, emailSalt)
      );
    })
  ) {
    return new Response("", { status: 400 });
  }

  return redirect("/chat");
}

const IdCheck = () => {
  const {
    publicKeyFileContent,
    setPublicKeyFileContent,
    privateKeyFileContent,
    setPrivateKeyFileContent,
  } = useKeyFileContent();
  const submit = useSubmit();

  const handleFileChange =
    (type: string) => (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target) {
            const content = e.target.result;
            if (type === "public") {
              setPublicKeyFileContent(content);
            } else {
              setPrivateKeyFileContent(content);
            }
          }
        };
        reader.readAsText(file);
      }
    };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (publicKeyFileContent && privateKeyFileContent) {
      submit(
        {
          publicKey: JSON.stringify(publicKeyFileContent),
          privateKey: JSON.stringify(privateKeyFileContent),
        },
        {
          method: "post",
        }
      );
    }
  };

  return (
    <>
      <Form
        className="text-white grid grid-cols-2 gap-4 p-4"
        method="post"
        onSubmit={handleSubmit}
      >
        <div className="row-span-2">
          <label htmlFor="public">Public Key</label>
          <Input
            type="file"
            id="public"
            name="public"
            onChange={handleFileChange("public")}
            required
          />
        </div>
        <div className="row-span-2">
          <label htmlFor="private">Private Key</label>
          <Input
            type="file"
            id="private"
            name="private"
            onChange={handleFileChange("private")}
            required
          />
        </div>
        <Button type="submit" className="col-span-2">
          Submit
        </Button>
      </Form>
      <Link
        to={"/id-check/get-id"}
        className="p-4 absolute bottom-2 right-2 opacity-50"
      >
        <Button variant="outline">I need an identity</Button>
      </Link>
    </>
  );
};

export default IdCheck;
