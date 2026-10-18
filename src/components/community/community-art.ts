import { svgSource } from "@/lib/svg";
const line = (body: string) => svgSource(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#B2C7F8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`);
export const communityIcons = {
 image: line('<rect x="3" y="2" width="18" height="20" rx="3"/><path d="m4 18 6-7 4 4 3-5 4 8Z" fill="#B2C7F8" stroke="none"/>'),
 plus: line('<path d="M12 4v16M4 12h16"/>'),
 edit: line('<path d="m4 16-1 5 5-1L21 7l-4-4Z" fill="#B2C7F8"/><path d="m14 6 4 4" stroke="#041020"/>'),
 add: line('<circle cx="8" cy="6" r="4" fill="#B2C7F8"/><path d="M1 22v-4a7 7 0 0 1 14 0v4Z" fill="#B2C7F8"/><path d="M19 9v10M14 14h10"/>'),
 bell: line('<path d="M4 18h16l-3-4V9a5 5 0 0 0-10 0v5ZM10 22h4"/>'),
 palette: line('<path d="M12 2a10 10 0 1 0 0 20h2c3 0 3-4 0-4s-2-4 1-4h3c6 0 4-12-6-12Z"/><circle cx="7" cy="10" r="1"/><circle cx="10" cy="6" r="1"/><circle cx="16" cy="7" r="1"/>'),
 shield: line('<path d="m12 2 9 4v7c0 5-9 10-9 10S3 18 3 13V6Z"/><path d="m8 12 3 3 5-6"/>'),
 help: line('<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 6M12 18h.01"/>'),
 info: line('<circle cx="12" cy="12" r="10"/><path d="M12 11v7M12 7h.01"/>'),
 exit: svgSource('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FF4656" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3H4v18h6M10 12h12m-5-5 5 5-5 5"/></svg>'),
 document: svgSource('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="4" y="1" width="16" height="22" rx="2" fill="#006BFF"/><path d="M8 7h8M8 12h8M8 17h5" stroke="#061D43" stroke-width="2" stroke-linecap="round"/></svg>'),
};
