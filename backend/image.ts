export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export function imageContentType(body: Uint8Array) {
  if (body.length < 12 || body.length > MAX_IMAGE_BYTES) return undefined;
  if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return "image/jpeg";
  if ([137,80,78,71,13,10,26,10].every((n,i) => body[i] === n)) return "image/png";
  if (Buffer.from(body.subarray(0,4)).toString() === "RIFF" && Buffer.from(body.subarray(8,12)).toString() === "WEBP") return "image/webp";
}
