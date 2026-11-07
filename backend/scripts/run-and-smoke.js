import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "../src/server.js");
const smokePath = path.resolve(__dirname, "smoke-test.js");

const server = spawn("node", [serverPath], {
  stdio: "inherit",
  cwd: path.resolve(__dirname, ".."),
});

let testProcess = null;

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server failed to start at ${url} within ${timeoutMs}ms`);
}

async function main() {
  try {
    await waitForServer("http://localhost:5000/api/health");
    console.log("Server is healthy, running smoke tests...\n");

    testProcess = spawn("node", [smokePath], {
      stdio: "inherit",
      cwd: path.resolve(__dirname, ".."),
    });

    testProcess.on("exit", (code) => {
      server.kill();
      process.exit(code ?? 0);
    });
  } catch (err) {
    console.error(err);
    server.kill();
    process.exit(1);
  }
}

main();
