import { router, useLocalSearchParams } from "expo-router";
import { DirectMessageScreen, type DirectMessage } from "@/components/messages/direct-message-screen";
import { useCommunity } from "@/state/community-fixtures";
import { samplePeople } from "@/state/social-fixtures";
const members=[{...samplePeople[1],avatar:require("../../../../assets/social/group-taylor.png")},{...samplePeople[0],avatar:require("../../../../assets/social/group-alex.png")},{...samplePeople[2],avatar:require("../../../../assets/social/group-jordan.png")},{...samplePeople[4],avatar:require("../../../../assets/social/group-chris.png")},{...samplePeople[3],avatar:require("../../../../assets/social/group-mia.png")}];
const messages:readonly DirectMessage[]=[
 {id:"g1",sender:members[0],text:"Hey everyone! Are we still on for the hike this Saturday?",time:"9:24 AM",bubbleWidth:223},
 {id:"g2",sender:members[1],text:"Absolutely! Here\u2019s a shot from the trail we were talking about.",time:"9:28 AM",bubbleWidth:223,image:require("../../../../assets/social/group-landscape.png")},
 {id:"g3",sender:members[2],text:"This looks amazing! Can\u2019t wait for this. What time are we meeting?",time:"9:31 AM",bubbleWidth:239},
 {id:"g4",outgoing:true,text:"I\u2019m in! Let\u2019s meet at 9 AM at the main trailhead.",time:"9:32 AM",bubbleWidth:194},
 {id:"g5",sender:members[3],text:"Sounds good to me! \u{1F44D}",time:"9:33 AM",bubbleWidth:170},
 {id:"g6",system:true,text:"Jordan added Mia to the group.",time:"9:40 AM"},
 {id:"g7",sender:members[4],text:"Thanks for adding me! Excited to join! \u{1F64C}",time:"9:41 AM",bubbleWidth:213},
];
export default function GroupChatRoute(){const {name,id}=useLocalSearchParams<{name?:string;id?:string}>();const state=useCommunity();const groupId=id??(name===undefined?"weekend":undefined);const group=state.groups.find(group=>group.id===groupId);return <DirectMessageScreen key={id??name??"weekend"} groupMode memberCount={group?.membersAvailable===false?undefined:group?.members.length} members={group?.members.map(member=>member.person)||[]} peer={{name:group?.name||name||(id===undefined&&name===undefined?"Weekend Crew":"Group unavailable"),avatar:group?.avatar||require("../../../../assets/social/group-cover.png")}} initialMessages={group&&!group.added?messages:[]} onBack={()=>router.dismissTo("/home")} onOpenDetails={group?()=>router.push({pathname:"/group-details/[id]",params:{id:group.id}}):undefined} onViewMember={person=>router.push({pathname:"/profiles/[id]",params:{id:person.id}})} onSend={async()=>{throw new Error("Message delivery is not connected yet.");}}/>;}
