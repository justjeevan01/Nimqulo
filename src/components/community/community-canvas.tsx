import { Image } from "expo-image";
import type { PropsWithChildren } from "react";
import { useWindowDimensions, View } from "react-native";
import { ui } from "@/components/social/social-ui";
import { svgSource } from "@/lib/svg";
type Variant="create"|"details"|"invites"|"settings"|"privacy";
const paths:Record<Variant,string>={
 create:'<path d="M0 0H390V123C329 137 258 83 173 69S52 22 0 30Z" fill="url(#top)"/><path d="M0 192c78-14 112 73 204 91L390 400V806H0Z" fill="url(#left)"/>',
 details:'<path d="M0 0H365C297 51 274 102 208 74S66 25 0 29Z" fill="url(#top)"/><path d="M0 112c112-2 151 150 286 153 47 1 78-20 104-40V806H0Z" fill="url(#left)"/><path d="M240 261c63 16 115-9 150-36V806H240Z" fill="url(#right)"/>',
 invites:'<path d="M0 0H390V84C315 128 255 117 202 79S108 26 64 61L0 110Z" fill="url(#top)"/><path d="M0 79c137-47 182 63 390 85v30C180 176 129 104 0 129Z" fill="url(#dark)"/><path d="M390 523c-66 45-108 129-196 206L390 806Z" fill="url(#right)"/>',
 settings:'<path d="M0 0H390V47C348 106 296 107 245 85S91 19 0 29Z" fill="url(#top)"/>',
 privacy:'<path d="M0 0H390V55C277 144 239 130 167 104S56 33 0 33Z" fill="url(#top)"/><path d="M0 687c110-43 143 62 231 59 70-1 113-43 159-76V806H0Z" fill="url(#left)"/><path d="M210 746c73 6 135-40 180-76V806H210Z" fill="url(#right)"/>'
};
const edges:Record<Variant,string[]>={
 create:["M0 30C52 22 88 55 173 69S329 137 390 123","M0 192c78-14 112 73 204 91"],
 details:["M0 29C66 25 142 45 208 74S297 51 365 0","M0 112c112-2 151 150 286 153 47 1 78-20 104-40"],
 invites:["M0 110L64 61C108 26 149 41 202 79S315 128 390 84","M390 523c-66 45-108 129-196 206"],
 settings:["M0 29C91 19 194 63 245 85S348 106 390 47"],
 privacy:["M0 33C56 33 95 88 167 104S277 144 390 55","M0 687c110-43 143 62 231 59 70-1 113-43 159-76"]
};
const light:Record<Variant,[number,number,number,number]>={create:[375,120,192,120],details:[240,80,112,250],invites:[270,105,48,523],settings:[280,90,90,90],privacy:[275,120,687,670]};
const backdrops=Object.fromEntries(Object.entries(paths).map(([key,path])=>{const [topX,topY,leftY,rightY]=light[key as Variant];const glow=edges[key as Variant].map(edge=>[26,12,4,.6].map((width,index)=>`<path d="${edge}" fill="none" stroke="url(#edge)" stroke-width="${width}" opacity="${[.025,.04,.08,.45][index]}"/>`).join("")).join("");return [key,svgSource(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 806"><defs><linearGradient id="edge" gradientUnits="userSpaceOnUse" x1="0" x2="390"><stop stop-color="#0051CF" stop-opacity=".35"/><stop offset=".4" stop-color="#005BFF" stop-opacity=".2"/><stop offset="1" stop-color="#0051CF" stop-opacity="1"/></linearGradient><radialGradient id="top" gradientUnits="userSpaceOnUse" cx="${topX}" cy="${topY}" r="185"><stop stop-color="#00348F"/><stop offset=".14" stop-color="#001E55"/><stop offset=".5" stop-color="#00102B"/><stop offset="1" stop-color="#020C17"/></radialGradient><radialGradient id="left" gradientUnits="userSpaceOnUse" cx="0" cy="${leftY}" r="190"><stop stop-color="#003799"/><stop offset=".17" stop-color="#001E53"/><stop offset=".68" stop-color="#020D1A"/><stop offset="1" stop-color="#020C17"/></radialGradient><linearGradient id="dark" x2="100%" y2="100%"><stop stop-color="#00122F"/><stop offset="1" stop-color="#020C17"/></linearGradient><radialGradient id="right" gradientUnits="userSpaceOnUse" cx="390" cy="${rightY}" r="180"><stop stop-color="#00338B"/><stop offset=".2" stop-color="#001A4A"/><stop offset="1" stop-color="#020C17" stop-opacity="0"/></radialGradient></defs><rect width="390" height="806" fill="#020C17"/>${path}${glow}</svg>`)];})) as Record<Variant,ReturnType<typeof svgSource>>;
export function CommunityCanvas({children,variant}:PropsWithChildren<{variant:Variant}>){const {height}=useWindowDimensions();return <View style={ui.root}><View style={ui.canvas}><Image source={backdrops[variant]} contentFit="fill" style={{position:"absolute",top:0,left:0,width:"100%",height}} accessible={false}/>{children}</View></View>;}
