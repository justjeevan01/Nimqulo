import { textLineHeight } from "@/theme/typography";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Action, Avatar, icons, Panel, PageHeader, SocialCanvas, type, ui, useSocialLayout } from "./social-ui";
import type { Person } from "./types";
type Props={people?:readonly Person[];initialQuery?:string;available?:boolean;onSearch?:(query:string)=>Promise<readonly Person[]>;onBack:()=>void;onProfile?:(person:Person)=>void;onConnect?:(person:Person)=>void};
export function UsernameSearchScreen({people=[],initialQuery="",available=false,onSearch,onBack,onProfile,onConnect}:Props){
 const l=useSocialLayout();const {s}=l;const [query,setQuery]=useState(initialQuery);
 const exact=query.trim().replace(/^@/,"").toLowerCase();const result=exact?people.find(person=>person.username.toLowerCase()===exact):undefined;
 const [error,setError]=useState("");const [loading,setLoading]=useState(false);
 useEffect(()=>{let active=true;if(!onSearch||exact.length<3)return;const timeout=setTimeout(()=>{setLoading(true);void onSearch(exact).then(()=>{if(active)setError("");}).catch(cause=>{if(active)setError(cause.message);}).finally(()=>{if(active)setLoading(false);});},350);return()=>{active=false;clearTimeout(timeout);};},[exact,onSearch]);
 if(!l.ready)return <View style={ui.root}/>;
 return <KeyboardAvoidingView style={ui.root} behavior={Platform.OS==="ios"?"padding":"height"}><SocialCanvas><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{paddingTop:8*s,paddingBottom:Math.max(l.insets.bottom+24,40*s)}}>
  <PageHeader title="Find People" l={l} onBack={onBack}/>
  <View style={{paddingHorizontal:12*s}}>
   <Panel style={{height:52*s,borderRadius:25*s,paddingHorizontal:18*s,flexDirection:"row",alignItems:"center",gap:17*s,borderColor:"#29415E"}}><Image source={icons.search} style={{width:24*s,height:24*s}} accessible={false}/><TextInput accessibilityLabel="Exact username" placeholder="Search username..." placeholderTextColor="#8198BF" value={query} onChangeText={setQuery} editable={available} autoCapitalize="none" autoCorrect={false} autoComplete="off" returnKeyType="search" maxLength={24} style={[type(l,20,"400","white"),{flex:1,padding:0,height:"100%",outlineWidth:0}]}/>{!!query&&<Pressable accessibilityRole="button" accessibilityLabel="Clear username search" onPress={()=>setQuery("")} style={{minWidth:44,minHeight:44,alignItems:"center",justifyContent:"center"}}><View style={{width:24*s,height:24*s,borderRadius:12*s,backgroundColor:"#233752",alignItems:"center",justifyContent:"center"}}><Text style={type(l,22,"400","#8EA8D6")}>{"\u00D7"}</Text></View></Pressable>}</Panel>
   <Text style={[type(l,15,"400","#8EA8DA"),{marginLeft:6*s,marginTop:9*s}]}>Search exact usernames only.</Text>
   {(!!error||loading)&&<Text accessibilityRole={error?"alert":undefined} style={type(l,14,"400",error?"#FF9BA4":"#8EA8DA")}>{error||"Searching…"}</Text>}
   {result&&<Pressable accessibilityRole="button" accessibilityLabel={`View ${result.name}'s profile`} onPress={()=>onProfile?.(result)} style={{marginTop:20*s}}><Panel style={{minHeight:95*s,borderRadius:20*s,paddingHorizontal:15*s,paddingVertical:13*s,flexDirection:"row",alignItems:"center",gap:14*s}}><Avatar person={result} size={67*s}/><View style={{flex:1,gap:4*s}}><Text style={type(l,19,"600","white")}>{result.name}</Text><Text style={type(l,15.5,"400","#91A9DB")}>@{result.username}</Text></View><Action l={l} label={result.connected?"Connected":result.requested?"Requested":"Connect"} blue style={{width:107*s,height:41*s}} disabled={result.connected||result.requested||!onConnect} onPress={()=>onConnect?.(result)}/></Panel></Pressable>}
   <Panel style={{marginTop:16*s,minHeight:223*s,borderRadius:20*s,paddingHorizontal:22*s,paddingVertical:29*s,alignItems:"center",justifyContent:"center"}}><View style={{width:72*s,height:72*s,borderRadius:38*s,borderWidth:1,borderColor:"#214576",backgroundColor:"#0A1E39",alignItems:"center",justifyContent:"center"}}><Image source={icons.search} style={{width:30*s,height:30*s}} accessible={false}/></View><Text accessibilityRole="header" style={[type(l,20,"600","#FAFBFF"),{marginTop:19*s}]}>{result?"No other results":exact?"No results":"Find your connections"}</Text><Text style={[type(l,16.5,"400","#8EA8DA"),{lineHeight:textLineHeight(22),textAlign:"center",marginTop:10*s}]}>{"Try searching the exact username\nto find someone."}</Text></Panel>
  </View>
 </ScrollView></SocialCanvas></KeyboardAvoidingView>;
}
