import { router, useLocalSearchParams } from "expo-router";
import { CreateGroupScreen } from "@/components/community/create-group-screen";
import { useCommunity } from "@/state/community-fixtures";
import { useSocial } from "@/state/social-fixtures";
export default function CreateGroupRoute(){
 const {id}=useLocalSearchParams<{id?:string}>();const state=useCommunity();const social=useSocial();const existing=state.groups.find(group=>group.id===id);
 const blocked=new Set([...state.blocked.map(p=>p.id),...social.people.filter(p=>p.blocked).map(p=>p.id)]);
 const members=new Set(existing?.members.map(m=>m.person.id)||[]);
 const contacts=social.people.filter(p=>p.connected&&!blocked.has(p.id)&&!members.has(p.id));
 return <CreateGroupScreen key={id||"new"} people={contacts} initialName={existing?.name||""} initialSelected={[]} editing={!!id} onBack={()=>router.canGoBack()?router.back():router.replace("/people")} onSave={id&&!existing?undefined:async(name,ids,image)=>{const group=await state.saveGroup(name,ids,image,id);router.replace({pathname:"/group-details/[id]",params:{id:group.id}});return true;}}/>;
}
