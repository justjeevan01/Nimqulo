import { createContext, useContext, useState, type PropsWithChildren } from "react";
import type { Person } from "@/components/social/types";
import type { Group, Invitation } from "@/components/community/types";
const contact = (id:string,name:string,avatar:Person["avatar"]):Person => ({id,name,username:name.toLowerCase().replace(/\s/g,""),connected:true,avatar});
// These contacts form the independent Create Group reference scenario, not the pending-request fixture.
export const groupContacts:readonly Person[]=__DEV__?[
 contact("taylor","Taylor Kim",require("../../assets/community/create-taylor.png")),
 contact("jordan","Jordan Lee",require("../../assets/community/create-jordan.png")),
 contact("mia","Mia Chen",require("../../assets/community/create-mia.png")),
 contact("chris","Chris Park",require("../../assets/community/create-chris.png")),
 contact("alex","Alex Carter",require("../../assets/community/create-alex.png")),
 contact("priya","Priya Shah",require("../../assets/community/create-priya.png")),
]:[];
export const referenceGroup:Group={id:"weekend",added:false,name:"Weekend Crew",avatar:__DEV__?require("../../assets/community/group-cover.png"):undefined,members:__DEV__?[
 {person:{...groupContacts[4],avatar:require("../../assets/community/detail-alex.png")},role:"Owner"},
 {person:{...groupContacts[0],avatar:require("../../assets/community/detail-taylor.png")},role:"Admin"},
 {person:{...groupContacts[1],avatar:require("../../assets/community/detail-jordan.png")},role:"Admin"},
 {person:{...groupContacts[2],avatar:require("../../assets/community/detail-mia.png")},role:"Member"},
 {person:{...groupContacts[3],avatar:require("../../assets/community/detail-chris.png")},role:"Member"},
]:[]};
const initialInvitations:readonly Invitation[]=__DEV__?[
 {id:"hiking",name:"Hiking Friends",invitedBy:"Taylor Kim",avatar:require("../../assets/community/invite-hiking.png"),status:"pending"},
 {id:"squad-invite",name:"Design Squad",invitedBy:"Jordan Lee",avatar:require("../../assets/community/invite-design.png"),status:"pending"},
 {id:"family-history",name:"Family Group",avatar:require("../../assets/community/invite-family.png"),status:"accepted",age:"3d ago"},
 {id:"book-history",name:"Book Club",status:"declined",age:"1w ago"},
]:[];
const initialBlocked:readonly Person[]=__DEV__?[{id:"blocked-morgan",name:"Morgan Reed",username:"morganreed",blocked:true},{id:"blocked-sam",name:"Sam Wilson",username:"samwilson",blocked:true},{id:"blocked-jamie",name:"Jamie Lee",username:"jamielee",blocked:true}]:[];
function useCommunityState(){
 const [groups,setGroups]=useState<readonly Group[]>(__DEV__?[referenceGroup,{...referenceGroup,id:"design",name:"Design Squad",avatar:require("../../assets/chats/preview-design.png")},{...referenceGroup,id:"family",name:"Family Group",avatar:require("../../assets/chats/preview-family.png")}]:[]);
 const [invitations,setInvitations]=useState(initialInvitations);const [blocked,setBlocked]=useState(initialBlocked);
 const [appearance,setAppearance]=useState("System");const [notifications,setNotifications]=useState(true);
 function saveGroup(name:string,ids:readonly string[],avatar:Group["avatar"],id?:string){
  const unique=[...new Set(ids)];if(!name.trim()||name.trim().length>50||!unique.length||unique.length>20||unique.some(id=>!groupContacts.some(person=>person.id===id)))return undefined;
  const existing=id?groups.find(group=>group.id===id):undefined;if(id&&!existing)return undefined;
  const owner=existing?.members.find(member=>member.role==="Owner")?.person||groupContacts[4];
  const selected=groupContacts.filter(person=>unique.includes(person.id));if(!selected.some(person=>person.id===owner.id))selected.unshift(owner);if(selected.length>20)return undefined;
  const group:Group={id:id||`local-${Date.now()}`,name:name.trim(),avatar,members:selected.map(person=>({person,role:person.id===owner.id?"Owner":existing?.members.find(member=>member.person.id===person.id)?.role||"Member"})),added:existing?.added??true};
  setGroups(current=>existing?current.map(item=>item.id===id?group:item):[...current,group]);return group;
 }
 function decideInvitation(id:string,status:"accepted"|"declined"){
  const invitation=invitations.find(item=>item.id===id&&item.status==="pending");if(!invitation)return;
  setInvitations(current=>current.map(item=>item.id===id?{...item,status,age:"Just now"}:item));
  if(status==="accepted")setGroups(current=>current.some(group=>group.id===id)?current:[...current,{id,name:invitation.name,avatar:invitation.avatar,members:referenceGroup.members,added:true}]);
 }
 function setRole(groupId:string,personId:string,role:"Admin"|"Member"){setGroups(current=>current.map(group=>group.id===groupId?{...group,members:group.members.map(member=>member.person.id===personId&&member.role!=="Owner"?{...member,role}:member)}:group));}
 function removeMember(groupId:string,personId:string){setGroups(current=>current.map(group=>group.id===groupId?{...group,members:group.members.filter(member=>member.person.id!==personId||member.role==="Owner")}:group));}
 return {groups,invitations,blocked,appearance,notifications,saveGroup,decideInvitation,setRole,removeMember,setAppearance,setNotifications,unblock:(id:string)=>setBlocked(current=>current.filter(person=>person.id!==id)),leaveGroup:(id:string)=>setGroups(current=>current.filter(group=>group.id!==id))};
}
const Context=createContext<ReturnType<typeof useCommunityState>|null>(null);
export function CommunityPreviewProvider({children}:PropsWithChildren){const value=useCommunityState();return <Context value={value}>{children}</Context>;}
export function useCommunityPreview(){const value=useContext(Context);if(!value)throw Error("Missing community preview provider");return value;}
