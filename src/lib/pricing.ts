import {
  ADDONS,
  EVENT_TYPES,
  GUEST_BANDS,
  TIERS,
  type EventType,
  type ServiceKey,
  type TierKey,
} from "@/data/catalog";

export type QuoteInput = {
  eventType: EventType;
  guests: number;
  tier: TierKey;
  services: ServiceKey[];
};

export type QuoteBreakdown = {
  amount: number;
  lines: { label: string; amount: number }[];
};

export function priceQuote(input: QuoteInput): QuoteBreakdown {
  const event = EVENT_TYPES.find((e) => e.key === input.eventType) ?? EVENT_TYPES[1];
  const guests = GUEST_BANDS.find((g) => g.key === input.guests) ?? GUEST_BANDS[1];
  const tier = TIERS.find((t) => t.key === input.tier) ?? TIERS[1];
  const base = Math.round(event.base * guests.multiplier * tier.multiplier);
  const lines: { label: string; amount: number }[] = [
    { label: `${event.label} · ${guests.label} · ${tier.label}`, amount: base },
  ];
  let total = base;
  for (const key of input.services) {
    const addon = ADDONS.find((a) => a.key === key);
    if (!addon) continue;
    const amount = Math.round(base * addon.factor);
    lines.push({ label: addon.label, amount });
    total += amount;
  }
  return { amount: total, lines };
}
