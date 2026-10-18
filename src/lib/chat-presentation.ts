export function chatDay(value?:string){if(!value)return undefined;const date=new Date(value);return Number.isNaN(date.getTime())?undefined:`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;}
export function chatDateLabel(value:string,now=new Date()){
 const date=new Date(value);if(Number.isNaN(date.getTime()))return "";
 if(chatDay(value)===chatDay(now.toISOString()))return "Today";
 const yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1);
 if(chatDay(value)===chatDay(yesterday.toISOString()))return "Yesterday";
 return date.toLocaleDateString(undefined,{day:"numeric",month:"long",year:"numeric"});
}
export function shouldStartReply(dx:number,dy:number,scrolling:boolean){return !scrolling&&dx>12&&Math.abs(dy)<12&&dx>Math.abs(dy)*1.7;}
export function shouldFinishReply(dx:number,dy:number,cancelled:boolean){return !cancelled&&dx>=56&&Math.abs(dy)<24;}
