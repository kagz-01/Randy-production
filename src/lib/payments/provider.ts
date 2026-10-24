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

  if (normalized === "stripe" || normalized === "paystack" || normalized === "mpesa" || normalized === "custom") {
    return normalized;
  }

  return null;
}

function detectProvider(env: Record<string, string | undefined>): PaymentProviderStatus["provider"] {
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
      ready: true,
      reason: "Demo mode enabled for local testing.",
    };
  }

  if (mode === "live") {
    const provider = detectProvider(env);
    const gatewayUrl = env.PAYMENT_PROVIDER_URL?.trim();
    const apiKey =
      env.PAYMENT_PROVIDER_API_KEY?.trim() ??
      env.STRIPE_SECRET_KEY?.trim() ??
      env.PAYSTACK_SECRET_KEY?.trim() ??
      env.MPESA_CONSUMER_KEY?.trim();

    if (provider === "custom" && !gatewayUrl) {
      return {
        mode: "disabled",
        provider: "custom",
        ready: false,
        reason:
          "No live payment provider is configured. Set PAYMENT_PROVIDER_MODE=demo for local testing or configure PAYMENT_PROVIDER_URL plus provider credentials.",
      };
    }

    if (!gatewayUrl || !apiKey) {
      return {
        mode: "disabled",
        provider,
        ready: false,
        reason:
          "Payment gateway credentials are missing. Configure PAYMENT_PROVIDER_URL and PAYMENT_PROVIDER_API_KEY or the relevant provider secret keys.",
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
  if (provider !== "custom") {
    return {
      mode: "disabled",
      provider,
      ready: false,
      reason:
        "Payment provider credentials are present, but PAYMENT_PROVIDER_MODE is not enabled. Set PAYMENT_PROVIDER_MODE=live to accept real payments.",
    };
  }

  return {
    mode: "disabled",
    provider: "custom",
    ready: false,
    reason:
      "No payment provider is configured. Set PAYMENT_PROVIDER_MODE=demo for local testing or configure live payment credentials before launch.",
  };
}

export async function confirmInvoicePayment({
  invoiceId,
  quoteId,
  amount,
  customerName,
  customerEmail,
  env = process.env,
}: ConfirmInvoicePaymentInput): Promise<{ ok: true; mode: PaymentProviderMode; providerReference: string }> {
  const status = getPaymentProviderStatus(env);
  if (!status.ready) {
    throw new Error(
      status.reason ||
        "Payment provider not configured. Add PAYMENT_PROVIDER_MODE=demo for local testing or configure live payment credentials.",
    );
  }

  const providerReference = `pay_${invoiceId}_${quoteId}`;

  if (status.mode === "demo") {
    return {
      ok: true,
      mode: "demo",
      providerReference,
    };
  }

  const providerUrl = env.PAYMENT_PROVIDER_URL?.trim();
  const providerApiKey =
    env.PAYMENT_PROVIDER_API_KEY?.trim() ??
    env.STRIPE_SECRET_KEY?.trim() ??
    env.PAYSTACK_SECRET_KEY?.trim() ??
    env.MPESA_CONSUMER_KEY?.trim();

  if (!providerUrl || !providerApiKey) {
    throw new Error(
      "Payment gateway credentials are missing. Configure PAYMENT_PROVIDER_URL and PAYMENT_PROVIDER_API_KEY or the relevant provider keys before starting live payments.",
    );
  }

  const response = await fetch(providerUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${providerApiKey}`,
    },
    body: JSON.stringify({
      invoiceId,
      quoteId,
      amount,
      currency: env.PAYMENT_CURRENCY ?? "KES",
      customerName: customerName ?? "Client",
      customerEmail: customerEmail ?? null,
      provider: status.provider,
      reference: providerReference,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Payment provider rejected the request: ${errorText || response.statusText}`);
  }

  const payload = (await response.json().catch(() => ({}))) as { status?: string; reference?: string; id?: string };
  const normalizedStatus = String(payload.status ?? "success").toLowerCase();
  if (normalizedStatus && !["success", "succeeded", "paid", "approved"].includes(normalizedStatus)) {
    throw new Error(`Payment provider reported a non-success status: ${payload.status ?? "unknown"}`);
  }

  return {
    ok: true,
    mode: "live",
    providerReference: String(payload.reference ?? payload.id ?? providerReference),
  };
}
