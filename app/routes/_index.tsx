import { Link } from "@remix-run/react";
import useSound from "use-sound";

import clickSfx from "../assets/sounds/click1.mp3";

function App() {
  const [playClick] = useSound(clickSfx, { volume: 0.5 });

  return (
    <div>
      <h1 className="text-white">
        <Link to="id-check" onClick={() => playClick()}>
          Hello
        </Link>
      </h1>
    </div>
  );
}

export default App;
