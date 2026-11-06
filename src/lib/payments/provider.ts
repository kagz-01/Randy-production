export type PaymentProviderMode = "demo" | "live" | "disabled";

export type PaymentProviderStatus = {
  mode: PaymentProviderMode;
  provider: "demo" | "stripe" | "mpesa" | "paystack" | "custom";
  ready: boolean;
  reason?: string;
};

export type ConfirmInvoicePaymentInput = {
  invoiceId: string;
  quoteId: string;
  amount: number;
  customerName?: string | null;
  customerEmail?: string | null;
  env?: Record<string, string | undefined>;
};

function normalizeProviderName(value?: string): PaymentProviderStatus["provider"] | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;

  if (
    normalized === "stripe" ||
    normalized === "paystack" ||
    normalized === "mpesa" ||
    normalized === "custom"
  ) {
    return normalized;
  }

  return null;
}

function detectProvider(
  env: Record<string, string | undefined>,
): PaymentProviderStatus["provider"] {
  const explicitProvider = normalizeProviderName(env.PAYMENT_PROVIDER);
  if (explicitProvider) return explicitProvider;
  if (env.STRIPE_SECRET_KEY) return "stripe";
  if (env.PAYSTACK_SECRET_KEY) return "paystack";
  if (env.MPESA_CONSUMER_KEY || env.MPESA_SHORTCODE) return "mpesa";
  return "custom";
}

export function getPaymentProviderStatus(
  env: Record<string, string | undefined> = process.env,
): PaymentProviderStatus {
  const mode = (env.PAYMENT_PROVIDER_MODE ?? env.PAYMENT_MODE ?? "disabled").trim().toLowerCase();

  if (mode === "demo") {
    return {
      mode: "demo",
      provider: "demo",
      ready: false,
      reason:
        "Demo payments are disabled because they must never be recorded as real client payments.",
    };
  }

  if (mode === "live") {
    const provider = detectProvider(env);
    if (provider !== "custom" || env.PAYMENT_PROVIDER?.trim().toLowerCase() !== "custom") {
      return {
        mode: "disabled",
        provider,
        ready: false,
        reason: "A provider-specific payment integration has not been selected and configured.",
      };
    }

    const gatewayUrl = env.PAYMENT_PROVIDER_URL?.trim();
    const apiKey = env.PAYMENT_PROVIDER_API_KEY?.trim();

    if (!gatewayUrl || !apiKey) {
      return {
        mode: "disabled",
        provider: "custom",
        ready: false,
        reason: "The trusted payment adapter endpoint and its API key are not configured.",
      };
    }

    return {
      mode: "live",
      provider,
      ready: true,
      reason: "Live payment provider is configured.",
    };
  }

  const provider = detectProvider(env);
  return {
    mode: "disabled",
    provider,
    ready: false,
    reason: "No live payment integration is configured.",
  };
}

export async function confirmInvoicePayment({
  invoiceId,
  quoteId,
  amount,
  customerName,
  customerEmail,
  env = process.env,
}: ConfirmInvoicePaymentInput): Promise<{
  ok: true;
  mode: "live";
  provider: PaymentProviderStatus["provider"];
  providerReference: string;
}> {
  const status = getPaymentProviderStatus(env);
  if (!status.ready) {
    throw new Error(status.reason || "Payment provider is not configured.");
  }

  const providerUrl = env.PAYMENT_PROVIDER_URL?.trim();
  const providerApiKey = env.PAYMENT_PROVIDER_API_KEY?.trim();

  if (!providerUrl || !providerApiKey) {
    throw new Error("The trusted payment adapter endpoint and its API key are not configured.");
  }

  const currency = (env.PAYMENT_CURRENCY ?? "KES").trim().toUpperCase();
  const idempotencyKey = `pay_${invoiceId}`;
  const response = await fetch(providerUrl, {
    signal: AbortSignal.timeout(20_000),
    method: "POST",
    headers: {
      "idempotency-key": idempotencyKey,
      "content-type": "application/json",
      authorization: `Bearer ${providerApiKey}`,
    },
    body: JSON.stringify({
      invoiceId,
      quoteId,
      amount,
      currency,
      customerName: customerName ?? "Client",
      customerEmail: customerEmail ?? null,
      provider: status.provider,
      reference: idempotencyKey,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Payment provider rejected the request: ${errorText || response.statusText}`);
  }

  let payload: { status?: unknown; reference?: unknown; amount?: unknown; currency?: unknown };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new Error("The payment adapter returned an invalid confirmation response.");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The payment adapter returned an invalid confirmation response.");
  }
  if (
    typeof payload.status !== "string" ||
    !["succeeded", "paid"].includes(payload.status.toLowerCase())
  ) {
    throw new Error("Payment has not been confirmed. The invoice remains due.");
  }
  if (typeof payload.reference !== "string" || !payload.reference.trim()) {
    throw new Error("The payment adapter did not return a transaction reference.");
  }
  if (payload.amount !== amount) {
    throw new Error("The confirmed payment amount does not match the invoice.");
  }
  if (typeof payload.currency !== "string" || payload.currency.trim().toUpperCase() !== currency) {
    throw new Error("The confirmed payment currency does not match the invoice.");
  }

  return {
    ok: true,
    mode: "live",
    provider: status.provider,
    providerReference: payload.reference.trim(),
  };
}
