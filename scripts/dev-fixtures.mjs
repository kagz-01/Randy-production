import { spawn } from "node:child_process";

const role = process.argv[2] ?? "admin";
if (!["admin", "staff", "client"].includes(role)) {
  console.error("Choose a preview role: admin, staff, or client.");
  process.exit(2);
}

for (const key of [
  "DATABASE_URL",
  "DATABASE_MIGRATION_URL",
  "XAI_API_KEY",
  "PAYMENT_PROVIDER_URL",
  "PAYMENT_PROVIDER_API_KEY",
  "STRIPE_SECRET_KEY",
  "PAYSTACK_SECRET_KEY",
  "MPESA_CONSUMER_KEY",
  "MPESA_CONSUMER_SECRET",
  "MPESA_SHORTCODE",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "GROK_CONNECTORS_URL",
  "GROK_CONNECTOR_ACCESS_TOKEN",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GROK_AUTH_CLIENT_SECRET",
  "BETTER_AUTH_SECRET",
]) {
  process.env[key] = "";
}

process.env.RANDY_PREVIEW_FIXTURES = "1";
process.env.RANDY_PREVIEW_ROLE = role;
process.env.VITE_AUTH_ENABLED = "false";
process.env.VITE_RANDY_PREVIEW_FIXTURES = "true";
process.env.PAYMENT_PROVIDER_MODE = "disabled";
process.env.PAYMENT_MODE = "disabled";

const child = spawn("npm", ["run", "dev"], { stdio: "inherit", env: process.env });
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error("[dev:fixtures] failed to run npm run dev:", error.message);
  process.exit(127);
});
child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
