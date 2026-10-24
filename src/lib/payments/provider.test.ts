import assert from "node:assert/strict";
import test from "node:test";

import { confirmInvoicePayment, getPaymentProviderStatus } from "./provider.ts";

test("returns disabled when no payment provider is configured", () => {
  const status = getPaymentProviderStatus({});
  assert.equal(status.mode, "disabled");
  assert.equal(status.ready, false);
  assert.match(status.reason ?? "", /configured|credentials/i);
});

test("allows demo mode without external credentials", () => {
  const status = getPaymentProviderStatus({ PAYMENT_PROVIDER_MODE: "demo" });
  assert.equal(status.mode, "demo");
  assert.equal(status.ready, true);
});

test("honors an explicit live provider selection in the env contract", () => {
  const status = getPaymentProviderStatus({
    PAYMENT_PROVIDER_MODE: "live",
    PAYMENT_PROVIDER: "stripe",
    PAYMENT_PROVIDER_URL: "https://api.example.com/payments",
    PAYMENT_PROVIDER_API_KEY: "sk_live_test",
  });

  assert.equal(status.mode, "live");
  assert.equal(status.provider, "stripe");
  assert.equal(status.ready, true);
});

test("fails closed when a payment is attempted without a configured provider", async () => {
  await assert.rejects(
    () =>
      confirmInvoicePayment({
        invoiceId: "inv_test_123",
        quoteId: "q_test_123",
        amount: 15000,
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        env: {},
      }),
    /configured|credentials/i,
  );
});
