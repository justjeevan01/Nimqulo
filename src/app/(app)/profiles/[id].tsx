import { router, useLocalSearchParams } from "expo-router";
import { UserProfileScreen } from "@/components/social/user-profile-screen";
import { useMessenger } from "@/state/messenger";
import { useSocial } from "@/state/social-fixtures";
export default function UserProfileRoute(){
 const {id}=useLocalSearchParams<{id?:string}>();const social=useSocial();const {snapshot,api,perform}=useMessenger();const found=social.people.find(p=>p.id===id);const groups=snapshot.groups.filter(g=>g.members.some(m=>m.person.id===id));
 const person=found||{id:id||"",name:"User unavailable",username:""};
 return <UserProfileScreen available={!!found} person={{...person,sharedGroups:groups.length}} groups={groups.map(g=>g.name)} onBack={()=>router.dismissTo("/people")} onMessage={person.connected&&!person.blocked?()=>{void perform(()=>api.direct(person.id)).then(c=>router.push({pathname:"/messages/[id]",params:{id:c.id}})).catch(()=>{});}:undefined} onConnect={()=>social.connect(person)} onRemove={()=>social.remove(person.id)} onBlock={()=>social.block(person.id)} onOpenReport={()=>router.push({pathname:"/report-user",params:{id:person.id}})} onOpenGroup={name=>{const group=groups.find(g=>g.name===name);if(group)router.push({pathname:"/groups/[id]",params:{id:group.id}});}}/>;
}
