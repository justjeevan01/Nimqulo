import { useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Action, Avatar, Panel, PageHeader, SocialCanvas, type, ui, useSocialLayout } from "./social-ui";
import type { ConnectionRequest, Person } from "./types";
type Props={requests?:readonly ConnectionRequest[];onBack:()=>void;onProfile?:(person:Person)=>void;onAccept?:(id:string)=>void;onDecline?:(id:string)=>void;onCancel?:(id:string)=>void};
export function ConnectionRequestsScreen({requests=[],onBack,onProfile,onAccept,onDecline,onCancel}:Props){
 const l=useSocialLayout();const {s}=l;const [active,setActive]=useState("incoming");const scroll=useRef<ComponentRef<typeof ScrollView>>(null);const outgoingTop=useRef(0);
 const incoming=requests.filter(r=>r.direction==="incoming");const outgoing=requests.filter(r=>r.direction==="outgoing");
 if(!l.ready)return <View style={ui.root}/>;
 const card=(request:ConnectionRequest)=><Panel key={request.id} style={{borderRadius:12*s,padding:10*s,minHeight:(request.direction==="incoming"?98:109)*s}}>
  <View style={{flexDirection:"row",gap:19*s}}><Pressable accessibilityRole="button" accessibilityLabel={`View ${request.person.name}'s profile`} onPress={()=>onProfile?.(request.person)}><Avatar person={request.person} size={55*s}/></Pressable>
   <View style={{flex:1,paddingTop:2*s}}><View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"baseline"}}><Text style={type(l,15.5,"600","#FAFBFF")}>{request.person.name}</Text><Text style={type(l,12,"400","#8EAADD")}>{request.age}</Text></View><View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:2*s}}><Text style={type(l,13.5,"400","#8BA8DA")}>@{request.person.username}</Text>{request.direction==="outgoing"&&<View style={{paddingHorizontal:9*s,paddingVertical:4*s,borderRadius:20,borderWidth:1,borderColor:"#92600A",backgroundColor:"#322718"}}><Text style={type(l,10.5,"500","#FFB426")}>{"\u25F7"} Pending</Text></View>}</View>
    <View style={{flexDirection:"row",gap:7*s,marginTop:8*s}}>{request.direction==="incoming"?<><Action l={l} textSize={12.5} label="Accept" blue disabled={!onAccept} onPress={()=>onAccept?.(request.id)} style={{flex:1}}/><Action l={l} textSize={12.5} label="Decline" danger disabled={!onDecline} onPress={()=>onDecline?.(request.id)} style={{flex:1}}/></>:<Action l={l} textSize={12.5} label="Cancel" disabled={!onCancel} onPress={()=>onCancel?.(request.id)} style={{flex:1}}/>}</View>
   </View>
  </View>
 </Panel>;
 return <SocialCanvas><PageHeader title="Connection Requests" l={l} onBack={onBack}/>
  <Panel style={{marginHorizontal:13*s,flexDirection:"row",padding:2*s,borderRadius:24*s,marginTop:-5*s}}><Action l={l} label={`Incoming (${incoming.length})`} blue={active==="incoming"} onPress={()=>{setActive("incoming");scroll.current?.scrollTo({y:0,animated:true});}} style={{flex:1,height:39*s,borderWidth:active==="incoming"?1:0}}/><Action l={l} label={`Outgoing (${outgoing.length})`} blue={active==="outgoing"} onPress={()=>{setActive("outgoing");scroll.current?.scrollTo({y:outgoingTop.current,animated:true});}} style={{flex:1,height:39*s,borderWidth:active==="outgoing"?1:0}}/></Panel>
  <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:12*s,paddingTop:13*s,paddingBottom:Math.max(l.insets.bottom+12,24*s)}}>
   <Text accessibilityRole="header" style={[type(l,15.5,"600","#BBD0F1"),{marginBottom:7*s}]}>Incoming Requests</Text><View style={{gap:7*s}}>{incoming.map(card)}{!incoming.length&&<Panel style={{padding:20*s}}><Text style={type(l,15,"400","#8FAADA")}>No incoming requests</Text></Panel>}</View>
   <View onLayout={event=>{outgoingTop.current=event.nativeEvent.layout.y;}} style={{marginTop:18*s}}><Text accessibilityRole="header" style={[type(l,15.5,"600","#BBD0F1"),{marginBottom:9*s}]}>Outgoing Requests</Text><View style={{gap:7*s}}>{outgoing.map(card)}{!outgoing.length&&<Panel style={{padding:20*s}}><Text style={type(l,15,"400","#8FAADA")}>No outgoing requests</Text></Panel>}</View></View>
  </ScrollView>
 </SocialCanvas>;
}
