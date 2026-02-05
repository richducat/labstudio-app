'use client';

import { readStorage, writeStorage } from './storage';

export type CartLine = {
  price_id: string;
  slug: string;
  name: string;
  unit_amount_cents: number;
  quantity: number;
  image_url?: string | null;
};

export type CartState = {
  lines: CartLine[];
};

const KEY = 'lab-cart-v1';

export function readCart(): CartState {
  return readStorage<CartState>(KEY, { lines: [] });
}

export function writeCart(cart: CartState) {
  writeStorage(KEY, cart);
}

export function addToCart(line: Omit<CartLine, 'quantity'>, quantity = 1): CartState {
  const cart = readCart();
  const q = Math.max(1, Math.floor(quantity));
  const idx = cart.lines.findIndex((l) => l.price_id === line.price_id);
  if (idx >= 0) {
    const next = cart.lines.map((l, i) => (i === idx ? { ...l, quantity: l.quantity + q } : l));
    const out = { lines: next };
    writeCart(out);
    return out;
  }

  const out = { lines: [...cart.lines, { ...line, quantity: q }] };
  writeCart(out);
  return out;
}

export function setLineQty(price_id: string, quantity: number): CartState {
  const cart = readCart();
  const q = Math.max(0, Math.floor(quantity));
  const next = cart.lines
    .map((l) => (l.price_id === price_id ? { ...l, quantity: q } : l))
    .filter((l) => l.quantity > 0);
  const out = { lines: next };
  writeCart(out);
  return out;
}

export function clearCart(): CartState {
  const out = { lines: [] };
  writeCart(out);
  return out;
}

export function cartTotals(cart: CartState) {
  const subtotal_cents = cart.lines.reduce((sum, l) => sum + l.unit_amount_cents * l.quantity, 0);
  const item_count = cart.lines.reduce((sum, l) => sum + l.quantity, 0);
  return { subtotal_cents, item_count };
}
