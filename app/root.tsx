import { Outlet, Meta, Scripts } from "@remix-run/react";

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
      </head>
      <body>
        <Outlet />
      </body>
      <Scripts />
    </html>
  );
}
