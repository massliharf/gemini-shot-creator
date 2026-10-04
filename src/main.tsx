import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installDemoLayer } from "./lib/demo";
import "./index.css";

installDemoLayer();

createRoot(document.getElementById("root")!).render(<App />);
