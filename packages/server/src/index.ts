import { buildServer } from "./server.js";

const PORT = parseInt(process.env.PORT ?? "4100", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  const app = await buildServer();
  await app.listen({ port: PORT, host: HOST });
}

main().catch((err) => {
  console.error("Failed to start Prosperus server:", err);
  process.exit(1);
});
