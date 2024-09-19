import { Form, Link } from "@remix-run/react";
import type { ChangeEvent } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useKeyFileContent } from "../root";

function IdCheck() {
  const { setPublicKeyFileContent, setPrivateKeyFileContent } =
    useKeyFileContent();

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

  return (
    <>
      <Form
        className="text-white grid grid-cols-2 gap-4 p-4"
        method="post"
        action="/chat"
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
        <Button type="submit">Submit</Button>
      </Form>
      <Link to={"/id-check/get-id"} className="p-4">
        <Button variant="default">I need an identity</Button>
      </Link>
    </>
  );
}

export default IdCheck;
