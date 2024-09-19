import { useState } from "react";
import useSound from "use-sound";

import { Button } from "~/components/ui/button";
import { getPGPKeys } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { useClientSideDownload } from "~/hooks/useClientSideDownload";

import confirmationSfx from "../assets/sounds/confirmation_001.mp3";
import { Form, useNavigate } from "@remix-run/react";

const EMAIL_REGEX_99_99 =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const Download = () => {
  const [formState, setFormState] = useState({ name: "", email: "" });
  const [isLoading, setIsLoading] = useState(false);
  const downloadFile = useClientSideDownload();
  const navigation = useNavigate();

  const [playConfirmation] = useSound(confirmationSfx, { volume: 0.5 });

  const validForm =
    formState.name.length &&
    formState.email.length &&
    EMAIL_REGEX_99_99.test(formState.email.trim());

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (validForm) {
      setIsLoading(true);
      const { privateKey, publicKey } = await getPGPKeys(
        formState.name,
        formState.email
      );
      downloadFile(privateKey, "private.pgp");
      downloadFile(publicKey, "public.pgp");
      playConfirmation();
      navigation("/id-check");
    }
  };

  return (
    <Form
      className="text-white flex flex-col p-4 gap-4"
      method="post"
      onSubmit={handleSubmit}
    >
      <Input
        type="text"
        onChange={(e) =>
          setFormState({ ...formState, name: e.target.value.trim() })
        }
        name="name"
        placeholder="name"
      />
      <Input
        type="email"
        onChange={(e) =>
          setFormState({ ...formState, email: e.target.value.trim() })
        }
        name="email"
        placeholder="email"
      />
      <Button disabled={!validForm} className="col-span-2" type="submit">
        {isLoading ? "Creating public and private key..." : "Create key pair"}
      </Button>
    </Form>
  );
};

export default Download;
