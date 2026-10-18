import type { PropsWithChildren } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { Action, Panel, type, type SocialLayout } from "@/components/social/social-ui";
export function Sheet({ title, visible, onClose, l, children, closeLabel="Close", closeDisabled=false }: PropsWithChildren<{title:string;visible:boolean;onClose:()=>void;closeLabel?:string;closeDisabled?:boolean;l:SocialLayout}>) {
 return <Modal visible={visible} transparent animationType="fade" onRequestClose={()=>{if(!closeDisabled)onClose();}}><View style={{flex:1,backgroundColor:"#000B",padding:24,alignItems:"center",justifyContent:"center"}}><Panel style={{width:"100%",maxWidth:400,maxHeight:"85%",padding:22,gap:18}}><Text accessibilityRole="header" style={type(l,22,"600","white")}>{title}</Text><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:14}}>{children}</ScrollView><Action l={l} label={closeLabel} disabled={closeDisabled} onPress={onClose} style={{minHeight:44}}/></Panel></View></Modal>;
}
