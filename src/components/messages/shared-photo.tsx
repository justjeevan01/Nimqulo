import { Image, type ImageProps } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type Props={source?:ImageProps["source"];imageId?:string;loadImage?:(id:string)=>Promise<{url:string}>;isScrolling:()=>boolean;onOpen:(source:ImageProps["source"])=>void;s:number};
export function SharedPhoto({source,imageId,loadImage,isScrolling,onOpen,s}:Props){
  const [remote,setRemote]=useState<string>();const [failed,setFailed]=useState(false);const [retry,setRetry]=useState(0);const [opening,setOpening]=useState(false);
  const touch=useRef({x:0,y:0,cancelled:false});const alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{let active=true;if(imageId&&loadImage){void loadImage(imageId).then(value=>{if(active){setRemote(value.url);setFailed(false);}}).catch(()=>{if(active)setFailed(true);});}return()=>{active=false;};},[imageId,loadImage,retry]);
  const resolved=imageId?(remote?{uri:remote}:undefined):source;
  async function open(){
    if(opening)return;
    if(!imageId||!loadImage){if(resolved)onOpen(resolved);return;}
    setOpening(true);
    try{const value=await loadImage(imageId);if(alive.current){setRemote(value.url);onOpen({uri:value.url});}}
    catch{if(alive.current)setFailed(true);}finally{if(alive.current)setOpening(false);}
  }
  return <View style={{width:"100%",aspectRatio:518/268,borderRadius:14*s,overflow:"hidden",backgroundColor:"#0A192C"}}>
    {failed?<Pressable accessibilityRole="button" accessibilityLabel="Retry loading photo" onPress={()=>{setFailed(false);setRemote(undefined);setRetry(value=>value+1);}} style={{flex:1,alignItems:"center",justifyContent:"center",minHeight:48}}><Text style={{color:"#BCD1F7",fontSize:14}}>Photo unavailable. Tap to retry.</Text></Pressable>:<Pressable accessibilityRole="button" accessibilityLabel="Open shared photo" style={{flex:1}} onPressIn={event=>{touch.current={x:event.nativeEvent.pageX,y:event.nativeEvent.pageY,cancelled:isScrolling()};}} onTouchMove={event=>{if(Math.hypot(event.nativeEvent.pageX-touch.current.x,event.nativeEvent.pageY-touch.current.y)>8)touch.current.cancelled=true;}} onTouchCancel={()=>{touch.current.cancelled=true;}} onAccessibilityTap={()=>void open()} onPress={event=>{if(!touch.current.cancelled&&!isScrolling()&&Math.hypot(event.nativeEvent.pageX-touch.current.x,event.nativeEvent.pageY-touch.current.y)<=8)void open();}}>
      {resolved?<Image source={resolved} cachePolicy="memory" contentFit="cover" style={{width:"100%",height:"100%"}} accessibilityLabel="Shared photo" onError={()=>setFailed(true)}/>:<ActivityIndicator color="#9FCBFF" style={{flex:1}}/>}
    </Pressable>}
    {opening&&<View pointerEvents="none" style={{position:"absolute",inset:0,alignItems:"center",justifyContent:"center"}}><ActivityIndicator color="white"/></View>}
  </View>;
}
