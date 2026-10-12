const { spawn } = require("child_process");
const path = require("path");

// Ensure essential Windows system directories are present in PATH for child process spawning
const winDir = process.env.SystemRoot || "C:\\Windows";
const sys32 = path.join(winDir, "System32");
const sys32Wbem = path.join(winDir, "System32", "Wbem");
const currentPath = process.env.PATH || "";

if (!currentPath.toLowerCase().includes("system32")) {
  process.env.PATH = `${sys32};${winDir};${sys32Wbem};${currentPath}`;
}

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

console.log("Starting Resume AI Platform dev servers...");

const server = spawn(npmCmd, ["--prefix", "backend", "run", "dev"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

const client = spawn(npmCmd, ["--prefix", "frontend", "run", "dev"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

const cleanup = () => {
  server.kill();
  client.kill();
  process.exit();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

server.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`Backend API process exited with code ${code}`);
  }
});

client.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`Frontend client process exited with code ${code}`);
  }
});
