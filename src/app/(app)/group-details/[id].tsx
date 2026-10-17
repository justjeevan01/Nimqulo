import { router, useLocalSearchParams } from "expo-router";
import { GroupDetailsScreen } from "@/components/community/group-details-screen";
export default function GroupDetailsRoute(){const {id}=useLocalSearchParams<{id:string}>();return <GroupDetailsScreen group={{id,name:"Group details",members:[]}} onBack={()=>router.canGoBack()?router.back():router.replace("/home")}/>;}
