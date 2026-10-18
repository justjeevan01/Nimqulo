type LocalMessage={id:string;retryId?:string;seq?:number;pending?:boolean;failed?:boolean;local?:boolean};
// A verified history response replaces cached server text. Only unsent work and
// commits made in this mounted conversation can survive ahead of that response.
export function reconcileMessages<T extends LocalMessage>(history:readonly T[]|undefined,stored:readonly T[]):readonly T[]{
 if(!history)return stored;
 const newestSeq=history.at(-1)?.seq||0;
 return [...history,...stored.filter(local=>(local.pending||local.failed||(local.local&&(local.seq||0)>newestSeq))&&!history.some(server=>server.id===local.id||(!!local.retryId&&server.retryId===local.retryId)))];
}
export function restoreMessages<T extends LocalMessage>(cached:readonly T[]):readonly T[]{return cached.map(message=>({...message,local:false,...(message.pending?{pending:false,failed:true}:{})}));}
