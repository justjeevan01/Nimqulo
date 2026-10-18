import { Image } from "expo-image";
import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Action, Avatar, icons, Panel, SocialCanvas, type, ui, useSocialLayout } from "@/components/social/social-ui";
import type { Person } from "@/components/social/types";
import { CreateGroupButton } from "./create-group-button";
type Props={people?:readonly Person[];onSearch?:()=>void;onRequests?:()=>void;onInvitations?:()=>void;onCreateGroup?:()=>void;onProfile?:(person:Person)=>void;onMessage?:(person:Person)=>void};
export function PeopleScreen({people=[],onSearch,onRequests,onInvitations,onCreateGroup,onProfile,onMessage}:Props) {
 const l=useSocialLayout();const {s}=l;const [invites,setInvites]=useState(false);const [selected,setSelected]=useState<Person>();
 if(!l.ready)return <View style={ui.root}/>;
 return <SocialCanvas>
  <View style={{paddingTop:Math.max(l.insets.top+12*s,72*s),paddingHorizontal:14*s}}>
   <View style={{minHeight:45*s,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8*s}}><Text accessibilityRole="header" style={type(l,36,"700","white")}>People</Text><View style={{flexDirection:"row",alignItems:"center",gap:8*s}}><CreateGroupButton onPress={onCreateGroup} s={s} fontFamily={l.fontFamily}/><Pressable accessibilityRole="button" accessibilityLabel="Find people" onPress={onSearch} style={[ui.round,{width:45*s,height:45*s}]}><Image source={icons.search} style={{width:22*s,height:22*s}} accessible={false}/></Pressable></View></View>
   <View style={{flexDirection:"row",gap:8*s,marginTop:13*s,marginBottom:17*s}}>
    <Action l={l} label="Connections" blue={!invites} style={{flex:1.16,height:41*s,paddingHorizontal:2}} onPress={()=>setInvites(false)}/>
    <Action l={l} label="Requests" style={{flex:1,height:41*s,paddingHorizontal:2}} onPress={onRequests}/>
    <Action l={l} label="Invitations" disabled={!onInvitations} blue={invites} style={{flex:1.03,height:41*s,paddingHorizontal:2}} onPress={()=>{if(onInvitations)onInvitations();else setInvites(true);}}/>
   </View>
  </View>
  <FlatList data={invites?[]:people} keyExtractor={person=>person.id} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:10*s,paddingBottom:20*s,gap:7*s,flexGrow:1}} renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={`View ${item.name}'s profile`} onPress={()=>onProfile?.(item)}>
   <Panel style={{minHeight:80*s,paddingVertical:8*s,paddingLeft:13*s,paddingRight:7*s,borderRadius:19*s,flexDirection:"row",alignItems:"center",gap:17*s}}>
    <Avatar person={item} size={61*s}/><View style={{flex:1,gap:3*s}}><Text numberOfLines={1} style={type(l,18,"600","#F8FAFF")}>{item.name}</Text><Text numberOfLines={1} style={type(l,15,"400","#91A9D6")}>@{item.username}</Text></View>
    <View style={{flexDirection:"row",alignItems:"center",gap:8*s}}>{item.sharedGroups?<Image source={icons.people} style={{width:15*s,height:15*s}} accessible={false}/>:<View style={{width:11*s,height:11*s,borderRadius:8,backgroundColor:"#00CC80"}}/>}<Text style={type(l,11.5,"400","#9BB5E7")}>{item.sharedGroups?`${item.sharedGroups} shared groups`:"Connected"}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Options for ${item.name}`} onPress={event=>{event.stopPropagation();setSelected(item);}} style={{width:28*s,minHeight:44,alignItems:"center",justifyContent:"center"}} hitSlop={4}><Image source={icons.more} style={{width:23*s,height:23*s}} accessible={false}/></Pressable>
   </Panel>
  </Pressable>} ListEmptyComponent={<View style={[ui.empty,{flex:1}]}><Image source={icons.people} style={{width:48*s,height:48*s}} accessible={false}/><Text style={type(l,22,"600","white")}>{invites?"No invitations yet":"No connections yet"}</Text><Text style={[type(l,16,"400","#93AADA"),{textAlign:"center",lineHeight:23*s}]}>{invites?"Your invitations will appear here.":"Find people by their exact username\nand send a connection request."}</Text><Action l={l} blue label="Find People" style={{minHeight:44,width:240*s}} onPress={onSearch}/></View>}/>
  <Modal visible={!!selected} transparent animationType="fade" onRequestClose={()=>setSelected(undefined)}><View style={styles.overlay}><Panel style={{width:"100%",maxWidth:340,padding:24,gap:16}}><Text style={type(l,22,"600","white")}>{selected?.name}</Text><Action l={l} label="View profile" blue onPress={()=>{if(selected)onProfile?.(selected);setSelected(undefined);}}/><Action l={l} label="Message" onPress={()=>{if(selected)onMessage?.(selected);setSelected(undefined);}}/><Action l={l} label="Close options" onPress={()=>setSelected(undefined)}/></Panel></View></Modal>
 </SocialCanvas>;
}
const styles=StyleSheet.create({overlay:{flex:1,backgroundColor:"#000B",alignItems:"center",justifyContent:"center",padding:24}});
