import { Outlet, Meta, Scripts, Links } from "@remix-run/react";

import type { LinksFunction } from "@remix-run/node";
import stylesheet from "~/tailwind.css?url";
import custom from "./styles/app.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "stylesheet", href: custom },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="noise overflow-hidden shadow-white shadow-inner">
        <Outlet />
      </body>
      <Scripts />
    </html>
  );
}
