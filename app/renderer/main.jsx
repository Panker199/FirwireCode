import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

class Catch extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return <pre style={{color:"red",padding:20,whiteSpace:"pre-wrap",position:"fixed",inset:0,zIndex:99999,background:"#000"}}>{this.state.error.message + "\n\n" + this.state.error.stack}</pre>;
    }
    return this.props.children;
  }
}

document.documentElement.setAttribute("data-theme", localStorage.getItem("wormgpt-theme") || "dark");
createRoot(document.getElementById("root")).render(
  <Catch><App /></Catch>
);
