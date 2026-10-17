import { Image } from "expo-image";
import { svgSource } from "@/lib/svg";

export const vector = (body: string, viewBox = "0 0 24 24", stretch = false) => svgSource(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${stretch ? ' preserveAspectRatio="none"' : ""}>${body}</svg>`);
export const searchIcon = vector('<circle cx="10.5" cy="10.5" r="7" fill="none" stroke="#B3C3ED" stroke-width="2.2"/><path d="m16 16 5 5" stroke="#B3C3ED" stroke-width="2.2" stroke-linecap="round"/>');
export const inboxIcon = vector('<path d="m4 11 5-7a2 2 0 0 1 1.6-.8h8.8A2 2 0 0 1 21 4l5 7v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" fill="none" stroke="#AFBFE9" stroke-width="1" stroke-linejoin="round"/><path d="M4 11h5.2c2.2 0 1.2 3.6 5.8 3.6s3.6-3.6 5.8-3.6H26" fill="none" stroke="#AFBFE9" stroke-width="1"/>', '0 0 30 24');
export const blueFill = vector('<defs><radialGradient id="b" cx=".5" cy=".6" r=".85"><stop stop-color="#0066FF"/><stop offset=".8" stop-color="#0060FF"/><stop offset="1" stop-color="#45ABFF"/></radialGradient></defs><rect width="300" height="60" fill="url(#b)"/>','0 0 300 60', true);
export const bubbleFill = vector('<defs><radialGradient id="b"><stop stop-color="#0066FF"/><stop offset=".85" stop-color="#0063FF"/><stop offset="1" stop-color="#3C9EFF"/></radialGradient></defs><circle cx="32" cy="32" r="31.5" fill="url(#b)" stroke="#3A9DFF"/>', '0 0 64 64');
export const panelFill = vector('<defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0A1728"/><stop offset=".52" stop-color="#06111E"/><stop offset="1" stop-color="#081422"/></linearGradient></defs><rect width="390" height="100" fill="url(#p)"/>', '0 0 390 100', true);
export const backdrop = vector('<defs><linearGradient id="w" x1="0" y1=".8" x2="1" y2="0"><stop stop-color="#020C17"/><stop offset=".55" stop-color="#00102A"/><stop offset="1" stop-color="#001C50"/></linearGradient></defs><rect width="390" height="801" fill="#020C17"/><path d="M0 0H326C344 29 284 95 201 100H0Z" fill="url(#w)"/>','0 0 390 801');

export function TabIcon({ name, selected, size }: { name: "Chats" | "People" | "Settings"; selected: boolean; size: number }) {
  const color = selected ? "#0873FF" : "#99ADD5";
  const paths = name === "Chats" ? `<path d="M12 1C5.5 1 1 5.4 1 11c0 2.7 1.1 5.2 1.1 5.2L1.5 23l6.3-2.6s2 .6 4.2.6c6.5 0 11-4.2 11-10S18.5 1 12 1Z" fill="${color}"/><circle cx="9" cy="10.5" r="1.25" fill="#05234B"/><circle cx="15" cy="10.5" r="1.25" fill="#05234B"/>` : name === "People" ? `<circle cx="12" cy="6" r="4.7" fill="${color}"/><path d="M2 20c0-5 4.2-7.5 10-7.5S22 15 22 20v1.5H2Z" fill="${color}"/>` : `<path d="m10 1-1 3-2 .9-3-.7-3 5 2 2.4v2.8L1 17l3 5 3-.8 2 .9 1 2h5l1-2 2-.9 3 .8 3-5-2-2.6v-2.8l2-2.4-3-5-3 .7-2-.9-1-3Z" fill="${color}"/><circle cx="12.5" cy="12.5" r="4.5" fill="#041221"/>`;
  return <Image source={vector(paths, name === "Settings" ? "0 0 25 25" : "0 0 24 24")} style={{ width: size, height: size }} accessible={false} />;
}
