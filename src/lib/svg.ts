const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Android's Expo Image data-URL loader expects Base64, rather than percent-encoded SVG.
// Keep this independent of browser/Node globals so the same source works in Hermes and web.
export function svgSource(markup: string): { uri: string } {
  const bytes = encodeURIComponent(markup).replace(/%([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const value = (bytes.charCodeAt(index) << 16) | ((bytes.charCodeAt(index + 1) || 0) << 8) | (bytes.charCodeAt(index + 2) || 0);
    encoded += alphabet[(value >>> 18) & 63] + alphabet[(value >>> 12) & 63];
    encoded += index + 1 < bytes.length ? alphabet[(value >>> 6) & 63] : "=";
    encoded += index + 2 < bytes.length ? alphabet[value & 63] : "=";
  }
  return { uri: `data:image/svg+xml;base64,${encoded}` };
}
