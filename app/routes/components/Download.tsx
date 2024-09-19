import { useState } from "react";
import { Button } from "~/components/ui/button";
import { downloadPGPKeys } from "~/lib/utils";
import { Input } from "~/components/ui/input";

const EMAIL_REGEX_99_99 =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const Download = ({ goBack }: { goBack: Function }) => {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const validForm =
    name.trim().length &&
    email.trim().length &&
    EMAIL_REGEX_99_99.test(email.trim());

  const handleClick = async () => {
    if (validForm) {
      setIsLoading(true);
      await downloadPGPKeys(name.trim(), email.trim());
      goBack();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className="grid gap-4 grid-cols-2"
    >
      <Input
        type="text"
        onChange={(e) => setName(e.target.value)}
        name="name"
        placeholder="name"
      />
      <Input
        type="email"
        onChange={(e) => setEmail(e.target.value)}
        name="email"
        placeholder="email"
      />
      <Button
        disabled={!validForm}
        className="col-span-2"
        onClick={handleClick}
      >
        {isLoading ? "Creating public and private key..." : "Create key pair"}
      </Button>
    </form>
  );
};

export default Download;
