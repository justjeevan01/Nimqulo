import { createContext, useContext, useState, type PropsWithChildren } from "react";
import { groupContacts } from "./community-fixtures";
import type { Person, ConnectionRequest } from "@/components/social/types";
export const samplePeople: readonly Person[]=__DEV__?[
 {id:"alex",name:"Alex Carter",username:"alexcarter",avatar:require("../../assets/social/people-alex.png"),sharedGroups:3,connected:true},
 {id:"taylor",name:"Taylor Kim",username:"taylorkim",avatar:require("../../assets/social/people-taylor.png"),sharedGroups:5,connected:true,online:true,role:"Product Designer",memberSince:"Mar 2024"},
 {id:"jordan",name:"Jordan Lee",username:"jordanlee",avatar:require("../../assets/social/people-jordan.png"),sharedGroups:2,connected:true},
 {id:"mia",name:"Mia Chen",username:"miachen",avatar:require("../../assets/social/people-mia.png"),sharedGroups:4,connected:true},
 {id:"chris",name:"Chris Park",username:"chrispark",avatar:require("../../assets/social/people-chris.png"),connected:true},
]:[];
const by=(id:string)=>samplePeople.find(person=>person.id===id)!;
const initialRequests:readonly ConnectionRequest[]=__DEV__?[
 {id:"in-taylor",person:{...by("taylor"),avatar:require("../../assets/social/request-taylor.png")},age:"2d",direction:"incoming"},
 {id:"in-jordan",person:{...by("jordan"),avatar:require("../../assets/social/request-jordan.png")},age:"3d",direction:"incoming"},
 {id:"in-mia",person:{...by("mia"),avatar:require("../../assets/social/request-mia.png")},age:"3d",direction:"incoming"},
 {id:"out-chris",person:{...by("chris"),avatar:require("../../assets/social/request-chris.png")},age:"2d",direction:"outgoing"},
 {id:"out-daniel",person:{id:"daniel",name:"Daniel Kim",username:"danielkim",avatar:require("../../assets/social/request-daniel.png")},age:"3d",direction:"outgoing"},
]:[];
export const searchPerson:Person=__DEV__?{id:"casey",name:"Casey Morgan",username:"caseymorgan",avatar:require("../../assets/social/search-alex.png"),connected:false}:{id:"",name:"",username:""};
export function usePreviewState(){
 const [people,setPeople]=useState<readonly Person[]>([...samplePeople.map(person=>initialRequests.some(request=>request.person.username===person.username)?{...person,connected:false}:person),...(__DEV__?[searchPerson,{...groupContacts[5],connected:false}]:[]),...initialRequests.filter(request=>!samplePeople.some(person=>person.id===request.person.id)).map(request=>({...request.person,connected:false}))]);const [requests,setRequests]=useState(initialRequests);const [requested,setRequested]=useState<string[]>(initialRequests.filter(request=>request.direction==="outgoing").map(request=>request.person.username));
 const [reports,setReports]=useState<{personId:string;reason:string}[]>([]);
 function report(personId:string,reason:string):boolean{if(!people.some(person=>person.id===personId)||!reason.trim())return false;setReports(current=>[...current,{personId,reason}]);return true;}
 function connect(person:Person){if(requested.includes(person.username)||people.some(existing=>existing.username===person.username&&existing.connected))return;setRequested(current=>[...current,person.username]);setRequests(current=>[...current,{id:`out-${person.username}`,person,age:"Now",direction:"outgoing"}]);}
 function accept(id:string){const request=requests.find(item=>item.id===id);if(request){setPeople(current=>current.some(p=>p.username===request.person.username)?current.map(person=>person.username===request.person.username?{...person,connected:true}:person):[...current,{...request.person,connected:true}]);}setRequests(current=>current.filter(item=>item.id!==id));}
 function dismiss(id:string){const request=requests.find(item=>item.id===id);if(request?.direction==="outgoing")setRequested(current=>current.filter(name=>name!==request.person.username));setRequests(current=>current.filter(item=>item.id!==id));}
 function remove(id:string){setPeople(current=>current.map(p=>p.id===id?{...p,connected:false}:p));}
 function block(id:string){setPeople(current=>current.map(p=>p.id===id?{...p,blocked:!p.blocked,connected:false}:p));}
 return {people,requests,requested,reports,report,connect,accept,dismiss,remove,block};
}
const PreviewContext=createContext<ReturnType<typeof usePreviewState>|null>(null);
export function SocialPreviewProvider({children}:PropsWithChildren){const state=usePreviewState();return <PreviewContext value={state}>{children}</PreviewContext>;}
export function useSocialPreview(){const context=useContext(PreviewContext);if(!context)throw new Error("Missing social preview provider");return context;}
export function profilePerson(person:Person):Person{return person.id==="taylor"?{...person,avatar:require("../../assets/social/profile-taylor.png"),sharedGroups:3}:person;}
