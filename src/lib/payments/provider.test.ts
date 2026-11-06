import assert from "node:assert/strict";
import test from "node:test";

import { confirmInvoicePayment, getPaymentProviderStatus } from "./provider.ts";

const customGatewayEnv = {
  PAYMENT_PROVIDER_MODE: "live",
  PAYMENT_PROVIDER: "custom",
  PAYMENT_PROVIDER_URL: "https://gateway.example.test/confirm",
  PAYMENT_PROVIDER_API_KEY: "test-key",
  PAYMENT_CURRENCY: "KES",
};

test("returns disabled when no payment provider is configured", () => {
  const status = getPaymentProviderStatus({});
  assert.equal(status.mode, "disabled");
  assert.equal(status.ready, false);
  assert.match(status.reason ?? "", /configured|integration/i);
});

test("demo mode cannot be used to record real client payments", () => {
  const status = getPaymentProviderStatus({ PAYMENT_PROVIDER_MODE: "demo" });
  assert.equal(status.mode, "demo");
  assert.equal(status.ready, false);
});

test("does not mistake provider credentials for an implemented adapter", () => {
  const status = getPaymentProviderStatus({
    PAYMENT_PROVIDER_MODE: "live",
    PAYMENT_PROVIDER: "stripe",
    PAYMENT_PROVIDER_URL: "https://api.example.test/payments",
    PAYMENT_PROVIDER_API_KEY: "test-key",
  });
  assert.equal(status.mode, "disabled");
  assert.equal(status.ready, false);
});

test("requires an explicit trusted custom adapter configuration", () => {
  const status = getPaymentProviderStatus(customGatewayEnv);
  assert.equal(status.mode, "live");
  assert.equal(status.provider, "custom");
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
    /configured|integration/i,
  );
});

test("requires explicit successful confirmation matching amount, currency, and reference", async () => {
  const previousFetch = globalThis.fetch;
  let capturedHeaders = new Headers();
  let capturedBody: Record<string, unknown> = {};
  globalThis.fetch = async (_input, init) => {
    capturedHeaders = new Headers(init?.headers);
    capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        status: "paid",
        reference: "provider-ref-123",
        amount: 15000,
        currency: "KES",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const result = await confirmInvoicePayment({
      invoiceId: "inv_test_123",
      quoteId: "q_test_123",
      amount: 15000,
      env: customGatewayEnv,
    });
    assert.equal(result.providerReference, "provider-ref-123");
    assert.equal(result.provider, "custom");
    assert.equal(capturedHeaders.get("idempotency-key"), "pay_inv_test_123");
    assert.equal(capturedBody.currency, "KES");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("does not treat an empty provider response as a successful payment", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  try {
    await assert.rejects(
      () =>
        confirmInvoicePayment({
          invoiceId: "inv_test_123",
          quoteId: "q_test_123",
          amount: 15000,
          env: customGatewayEnv,
        }),
      /not been confirmed|remains due/i,
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("rejects a provider confirmation with an amount mismatch", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status: "paid",
        reference: "provider-ref-123",
        amount: 14999,
        currency: "KES",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  try {
    await assert.rejects(
      () =>
        confirmInvoicePayment({
          invoiceId: "inv_test_123",
          quoteId: "q_test_123",
          amount: 15000,
          env: customGatewayEnv,
        }),
      /amount does not match/i,
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});
