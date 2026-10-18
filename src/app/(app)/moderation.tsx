import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { Alert, ScrollView, Text, View } from "react-native";
import { Action, PageHeader, Panel, type, useSocialLayout } from "@/components/social/social-ui";
import { CommunityCanvas } from "@/components/community/community-canvas";
import { useMessenger } from "@/state/messenger";
export default function ModerationRoute(){
 const {api,snapshot}=useMessenger();const l=useSocialLayout();const [reports,setReports]=useState<Awaited<ReturnType<typeof api.reports>>>([]);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const load=useCallback(()=>{setBusy(true);void api.reports().then(setReports).catch(cause=>setError(cause.message)).finally(()=>setBusy(false));},[api]);
 useEffect(()=>{if(!snapshot.operator)return;const timeout=setTimeout(load,0);return()=>clearTimeout(timeout);},[load,snapshot.operator]);
 function decide(id:string,status:"reviewed"|"dismissed",suspend=false){if(busy)return;setBusy(true);setError("");void api.moderate(id,status,suspend).then(()=>{setReports(current=>current.map(r=>r.id===id?{...r,status}:r));}).catch(cause=>setError(cause.message)).finally(()=>setBusy(false));}
 return <CommunityCanvas variant="settings"><PageHeader l={l} title="Report review" onBack={()=>router.dismissTo("/settings")}/><ScrollView contentContainerStyle={{padding:16,gap:16,paddingBottom:l.insets.bottom+24}}>{!snapshot.operator?<Text accessibilityRole="alert" style={type(l,16)}>Operator access is required.</Text>:<>{!!error&&<Text accessibilityRole="alert" style={type(l,14,"400","#FF9BA4")}>{error}</Text>}<Action l={l} label={busy?"Please wait…":"Refresh reports"} disabled={busy} onPress={load}/>{!reports.length&&<Text style={type(l,16)}>No reports to review.</Text>}{reports.map(r=><Panel key={r.id} style={{padding:16,gap:12}}><Text style={type(l,18,"600")}>{r.target_name||"Deleted account"}</Text><Text style={type(l,16)}>{r.reason}</Text><Text style={type(l,14,"400","#A9BCE0")}>{r.status}</Text>{r.status==="open"&&<View style={{gap:8}}><Action l={l} label="Mark reviewed" disabled={busy} onPress={()=>decide(r.id,"reviewed")}/><Action l={l} label="Dismiss report" disabled={busy} onPress={()=>decide(r.id,"dismissed")}/><Action l={l} label="Suspend account" danger disabled={busy} onPress={()=>Alert.alert("Suspend account?","This person will lose access to Nimqulo.",[{text:"Cancel",style:"cancel"},{text:"Suspend",style:"destructive",onPress:()=>decide(r.id,"reviewed",true)}])}/></View>}</Panel>)}</>}</ScrollView></CommunityCanvas>;
}
