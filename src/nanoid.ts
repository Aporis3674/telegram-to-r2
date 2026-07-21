/**
 * Simple nanoid implementation for Cloudflare Workers
 */
const urlAlphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

export function nanoid(size = 21): string {
  let id = '';
  let i = size;
  const bytes = crypto.getRandomValues(new Uint8Array(i));
  while (i--) {
    id += urlAlphabet[bytes[i] & 63];
  }
  return id;
}
