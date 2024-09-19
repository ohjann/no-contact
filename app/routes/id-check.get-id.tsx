import { useState } from "react";
import useSound from "use-sound";

import { Button } from "~/components/ui/button";
import { getPGPKeys, hashString } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { useClientSideDownload } from "~/hooks/useClientSideDownload";

import confirmationSfx from "../assets/sounds/confirmation_001.mp3";
import errorSfx from "../assets/sounds/error_006.mp3";

import {
  Form,
  Link,
  json,
  useActionData,
  useNavigate,
  useNavigation,
} from "@remix-run/react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { mongodb } from "~/utils/db.server";

const EMAIL_REGEX_99_99 =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const RESPONSES = {
  FULL: "full",
  WRONG: "wrong",
} as const;

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get("name");
  const email = formData.get("email");
  if (name && email) {
    const db = mongodb.db("nocontact"); // TODO: db layer
    const collection = db.collection("users");
    const allUsers = await collection.find().toArray();
    if (allUsers.length >= 2) {
      // maximum two users
      return new Response(RESPONSES.FULL, { status: 403 });
    }
    const { salt: emailSalt, hash: emailHash } = hashString(email.toString());
    await collection.insertOne({
      name,
      email: `${emailHash}+${emailSalt}`,
    });

    const { privateKey, publicKey } = await getPGPKeys(
      name.toString(),
      email.toString()
    );

    return json({ privateKey, publicKey });
  }
  return new Response(RESPONSES.WRONG, { status: 400 });
}

function GetId() {
  const [formState, setFormState] = useState({ name: "", email: "" });
  const downloadFile = useClientSideDownload();
  const navigation = useNavigation();
  const navigate = useNavigate();

  const actionData = useActionData<typeof action>();

  const [playConfirmation] = useSound(confirmationSfx, { volume: 0.5 });
  const [playError] = useSound(errorSfx, { volume: 0.5 });

  const validForm =
    formState.name.length &&
    formState.email.length &&
    EMAIL_REGEX_99_99.test(formState.email.trim());

  if (
    navigation.state === "idle" &&
    actionData &&
    ![RESPONSES.FULL, RESPONSES.WRONG].includes(actionData)
  ) {
    downloadFile(actionData.publicKey, "public.pgp");
    downloadFile(actionData.privateKey, "private.pgp");
    playConfirmation();
    navigate("/id-check");
  } else if (
    navigation.state === "idle" &&
    [RESPONSES.FULL, RESPONSES.WRONG].includes(actionData)
  ) {
    playError();
  }

  return navigation.state === "idle" && actionData === "full" ? (
    <div className="text-white">three's a crowd</div>
  ) : (
    <>
      <Form className="text-white flex flex-col p-4 gap-2" method="post">
        <div className="relative">
          <Input
            type="text"
            onChange={(e) =>
              setFormState({ ...formState, name: e.target.value.trim() })
            }
            name="name"
            placeholder="name"
          />
          <p className="text-xs text-gray-400 absolute top-2 text-right -right-20 w-[80px] sm:-right-64  sm:w-[initial] -z-10">
            &lt;-- this is the only input stored in plaintext
          </p>
        </div>
        <Input
          type="email"
          onChange={(e) =>
            setFormState({ ...formState, email: e.target.value.trim() })
          }
          name="email"
          placeholder="email"
        />
        <p className="text-xs text-gray-400 -z-10">
          <u>everything</u> else is either hashed or encrypted
        </p>
        <Button disabled={!validForm} className="col-span-2" type="submit">
          {navigation.state !== "idle"
            ? "Creating public and private key..."
            : "Create key pair"}
        </Button>
      </Form>
      <Link to={"/id-check"}>
        <Button
          variant="outline"
          className="absolute bottom-2 left-2 opacity-50"
        >
          Back
        </Button>
      </Link>
    </>
  );
}

export default GetId;
