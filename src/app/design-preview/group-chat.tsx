import { router, useLocalSearchParams } from "expo-router";
import { DirectMessageScreen, type DirectMessage } from "@/components/messages/direct-message-screen";
import { useCommunityPreview } from "@/dev/community-fixtures";
import { samplePeople } from "@/dev/social-fixtures";
const members=__DEV__?[{...samplePeople[1],avatar:require("../../../assets/social/group-taylor.png")},{...samplePeople[0],avatar:require("../../../assets/social/group-alex.png")},{...samplePeople[2],avatar:require("../../../assets/social/group-jordan.png")},{...samplePeople[4],avatar:require("../../../assets/social/group-chris.png")},{...samplePeople[3],avatar:require("../../../assets/social/group-mia.png")}]:[];
const messages:readonly DirectMessage[]=__DEV__?[
 {id:"g1",sender:members[0],text:"Hey everyone! Are we still on for the hike this Saturday?",time:"9:24 AM",bubbleWidth:223},
 {id:"g2",sender:members[1],text:"Absolutely! Here\u2019s a shot from the trail we were talking about.",time:"9:28 AM",bubbleWidth:223,image:require("../../../assets/social/group-landscape.png")},
 {id:"g3",sender:members[2],text:"This looks amazing! Can\u2019t wait for this. What time are we meeting?",time:"9:31 AM",bubbleWidth:239},
 {id:"g4",outgoing:true,text:"I\u2019m in! Let\u2019s meet at 9 AM at the main trailhead.",time:"9:32 AM",bubbleWidth:194},
 {id:"g5",sender:members[3],text:"Sounds good to me! \u{1F44D}",time:"9:33 AM",bubbleWidth:170},
 {id:"g6",system:true,text:"Jordan added Mia to the group.",time:"9:40 AM"},
 {id:"g7",sender:members[4],text:"Thanks for adding me! Excited to join! \u{1F64C}",time:"9:41 AM",bubbleWidth:213},
]:[];
export default function GroupChatPreview(){const {name,id}=useLocalSearchParams<{name?:string;id?:string}>();const state=useCommunityPreview();const group=state.groups.find(group=>group.id===(id||"weekend"));return <DirectMessageScreen key={id||"weekend"} groupMode memberCount={group?.members.length||members.length} members={group?.members.map(member=>member.person)||members} peer={{name:group?.name||name||"Weekend Crew",avatar:group?.avatar||require("../../../assets/social/group-cover.png")}} initialMessages={group?.added?[]:messages} onBack={()=>router.dismissTo("/design-preview/chats")} onOpenDetails={()=>router.push({pathname:"/design-preview/group-details",params:{id:group?.id||"weekend"}})} onViewMember={person=>router.push({pathname:"/design-preview/user-profile",params:{id:person.id}})} onSend={async()=>{throw new Error("Preview messages are not delivered.");}}/>;}
