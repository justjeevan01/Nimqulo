import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
let pending:Promise<string>|undefined;
export function deviceId(){return pending ||= (async()=>{const current=await SecureStore.getItemAsync("nimqulo-device");if(current)return current;const id=randomUUID();await SecureStore.setItemAsync("nimqulo-device",id);return id;})().catch(error=>{pending=undefined;throw error;});}
