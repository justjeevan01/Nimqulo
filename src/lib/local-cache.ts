import { Directory, File, Paths } from "expo-file-system";
// Files stay in Android's app-private directory. The namespace is erased on
// sign-out/replacement; never reuse another account's cache.
const root = () => new Directory(Paths.document,"nimqulo-private");
let generation=0;
let owner:string|undefined;
export function setCacheOwner(user:string){
  const marker=new File(root(),"owner");
  if(!marker.exists||marker.textSync()!==user)clearPrivateCache();
  owner=user;root().create({idempotent:true,intermediates:true});new File(root(),"owner").writeSync(user);
}
function location(user:string,key:string){const directory=new Directory(root(),encodeURIComponent(user));directory.create({idempotent:true,intermediates:true});return new File(directory,`${encodeURIComponent(key)}.json`);}
export async function readCache<T>(user:string,key:string):Promise<T|undefined>{try{const current=generation;if(owner!==user)return undefined;const file=location(user,key);const value=file.exists?JSON.parse(await file.text()):undefined;return generation===current?value:undefined;}catch{return undefined;}}
export async function writeCache(user:string,key:string,value:unknown){if(owner!==user)return;location(user,key).writeSync(JSON.stringify(value));}
export function removeCache(user:string,key:string){if(owner!==user)return;const file=location(user,key);if(file.exists)file.delete();}
export function clearPrivateCache(){generation++;owner=undefined;const directory=root();if(directory.exists)directory.delete();}
