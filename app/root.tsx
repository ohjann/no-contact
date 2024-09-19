import type { MetaFunction } from "@remix-run/react";
import type { Dispatch, SetStateAction } from "react";
import {
  Outlet,
  Meta,
  Scripts,
  Links,
  useOutletContext,
} from "@remix-run/react";

import type { LinksFunction } from "@remix-run/node";
import stylesheet from "~/tailwind.css?url";
import custom from "./styles/app.css?url";
import { useState } from "react";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "stylesheet", href: custom },
];

export const meta: MetaFunction = () => [
  { name: "viewport", content: "width=device-width, initial-scale=1.0" },
];

type ContextType = {
  publicKeyFileContent: string | ArrayBuffer | null;
  setPublicKeyFileContent: Dispatch<
    SetStateAction<string | ArrayBuffer | null>
  >;
  privateKeyFileContent: string | ArrayBuffer | null;
  setPrivateKeyFileContent: Dispatch<
    SetStateAction<string | ArrayBuffer | null>
  >;
};

export default function App() {
  const [publicKeyFileContent, setPublicKeyFileContent] = useState<
    string | ArrayBuffer | null
  >(null);
  const [privateKeyFileContent, setPrivateKeyFileContent] = useState<
    string | ArrayBuffer | null
  >(null);

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="noise overflow-hidden shadow-white shadow-inner min-h-[100vh] max-w-[100vw]">
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-full">
            <div className="flex justify-center">
              <Outlet
                context={
                  {
                    publicKeyFileContent,
                    setPublicKeyFileContent,
                    privateKeyFileContent,
                    setPrivateKeyFileContent,
                  } satisfies ContextType
                }
              />
            </div>
          </div>
        </div>
      </body>
      <Scripts />
    </html>
  );
}

export function useKeyFileContent() {
  return useOutletContext<ContextType>();
}
