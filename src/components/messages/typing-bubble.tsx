import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { incomingFill, incomingTail } from "./message-art";
import { textSize, textLineHeight } from "@/theme/typography";

export function TypingBubble({names,s,fontFamily,groupMode=false}:{names:readonly string[];s:number;fontFamily?:string;groupMode?:boolean}){
 const [dots]=useState(()=>[new Animated.Value(0),new Animated.Value(0),new Animated.Value(0)]);
 const [reduceMotion,setReduceMotion]=useState(false);
 useEffect(()=>{let active=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active)setReduceMotion(value);}).catch(()=>{});const listener=AccessibilityInfo.addEventListener("reduceMotionChanged",setReduceMotion);return()=>{active=false;listener.remove();};},[]);
 useEffect(()=>{if(reduceMotion){dots.forEach(dot=>dot.setValue(.7));return;}const pause=(duration:number)=>Animated.timing(new Animated.Value(0),{toValue:0,duration,useNativeDriver:true,isInteraction:false});const animations=dots.map((dot,index)=>Animated.loop(Animated.sequence([pause(index*130),Animated.timing(dot,{toValue:1,duration:180,useNativeDriver:true,isInteraction:false}),Animated.timing(dot,{toValue:0,duration:180,useNativeDriver:true,isInteraction:false}),pause(600-index*130)])));animations.forEach(animation=>animation.start());return()=>animations.forEach(animation=>animation.stop());},[dots,reduceMotion]);
 const people=names.length>2?`${names.slice(0,2).join(", ")} and ${names.length-2} ${names.length===3?"other":"others"}`:names.join(" and ");
 const label=`${people} ${names.length===1?"is":"are"} typing`;
 return <View accessibilityRole="text" accessibilityLabel={label} accessibilityLiveRegion="polite" accessible style={{alignSelf:"flex-start",gap:4*s,paddingVertical:7*s,paddingLeft:groupMode?48*s:0}}>
   {groupMode&&<Text numberOfLines={1} style={{fontFamily,fontSize:textSize(12),lineHeight:textLineHeight(16),color:"#ACC3F2",maxWidth:280*s}}>{label}</Text>}
   <View style={{position:"relative"}}><Image source={incomingTail} style={{position:"absolute",left:-6*s,bottom:s,width:13*s,height:17*s}} accessible={false}/><View style={{borderWidth:1,borderColor:"#253C58",backgroundColor:"#142237",borderRadius:17*s,paddingHorizontal:17*s,paddingVertical:14*s,flexDirection:"row",gap:6*s,overflow:"hidden"}}>
     <Image source={incomingFill} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false}/>
     {dots.map((dot,index)=><Animated.View key={index} style={{width:6*s,height:6*s,borderRadius:3*s,backgroundColor:"#B6CBED",opacity:dot.interpolate({inputRange:[0,1],outputRange:[.35,1]}),transform:[{translateY:dot.interpolate({inputRange:[0,1],outputRange:[0,-3*s]})}]}}/>)}
   </View></View>
 </View>;
}
