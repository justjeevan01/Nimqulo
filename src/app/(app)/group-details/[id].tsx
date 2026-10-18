import { router, useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";
import { GroupDetailsScreen } from "@/components/community/group-details-screen";
import { useCommunity } from "@/state/community-fixtures";
export default function GroupDetailsRoute(){
 const {id}=useLocalSearchParams<{id?:string}>();const state=useCommunity();const found=state.groups.find(g=>g.id===id);const group=found||{id:id||"",name:"Group unavailable",members:[],membersAvailable:false};
 const canManage=found&&found.myRole!=="Member";
 const canLeave=found&&!(found.myRole==="Owner"&&found.members.length>1);
 return <GroupDetailsScreen group={group} onBack={()=>router.canGoBack()?router.back():router.replace("/home")} onMessage={found?()=>router.push({pathname:"/groups/[id]",params:{id:group.id}}):undefined} onEdit={canManage?()=>router.push({pathname:"/create-group",params:{id:group.id}}):undefined} onAdd={canManage?()=>router.push({pathname:"/create-group",params:{id:group.id}}):undefined} onMember={member=>router.push({pathname:"/profiles/[id]",params:{id:member.person.id}})} onRole={found?.myRole==="Owner"?(personId,role)=>state.setRole(group.id,personId,role):undefined} onTransfer={found?.myRole==="Owner"?personId=>state.transferOwner(group.id,personId):undefined} onRemove={canManage?personId=>state.removeMember(group.id,personId):undefined} onLeave={canLeave?()=>{void state.leaveGroup(group.id).then(()=>router.dismissTo("/home")).catch(error=>Alert.alert("Could not leave group",error instanceof Error?error.message:"Please try again."));}:undefined}/>;
}
