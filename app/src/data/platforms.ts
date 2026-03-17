// app/src/data/platforms.ts
// Static registry of supported financial platforms (exchanges, banks, wallets).
// Consumed by the data sources slice and the add/edit modal dropdown.

export interface PlatformDef {
  id: string; // Unique key, e.g. 'binance', 'coinbase', 'lloyds'
  name: string; // Display name, e.g. 'Binance', 'Coinbase'
  category: 'exchange' | 'bank' | 'wallet' | 'other';
}

// The "custom" platform is not in this list — it's handled separately in the UI.
export const platforms: PlatformDef[] = [
  { id: 'binance', name: 'Binance', category: 'exchange' },
  { id: 'coinbase', name: 'Coinbase', category: 'exchange' },
  { id: 'crypto_com', name: 'Crypto.com', category: 'exchange' },
  { id: 'kraken', name: 'Kraken', category: 'exchange' },
  { id: 'bybit', name: 'Bybit', category: 'exchange' },
  { id: 'kucoin', name: 'KuCoin', category: 'exchange' },
  { id: 'lloyds', name: 'Lloyds', category: 'bank' },
  { id: 'monzo', name: 'Monzo', category: 'bank' },
  { id: 'revolut', name: 'Revolut', category: 'bank' },
  { id: 'metamask', name: 'MetaMask', category: 'wallet' },
  { id: 'ledger', name: 'Ledger', category: 'wallet' },
];

/** Look up a platform by its ID. Returns undefined for custom platforms. */
export function getPlatformById(id: string): PlatformDef | undefined {
  return platforms.find((p) => p.id === id);
}
