/* eslint-disable react-hooks/refs -- PanResponder stores callbacks; refs are read only by gesture events. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, Text, View } from "react-native";
import { shouldStartReply, shouldFinishReply } from "@/lib/chat-presentation";

export function SwipeToReply({children,onReply,isScrolling,label,disabled=false}:{children:ReactNode;onReply:()=>void;isScrolling:()=>boolean;label:string;disabled?:boolean}){
 const [translation]=useState(()=>new Animated.Value(0));
 const latest=useRef({onReply,isScrolling,disabled});const cancelled=useRef(false);
 useEffect(()=>{latest.current={onReply,isScrolling,disabled};},[onReply,isScrolling,disabled]);
 const [pan]=useState(()=>PanResponder.create({
   onStartShouldSetPanResponder:()=>false,
   onMoveShouldSetPanResponderCapture:(_,g)=>!latest.current.disabled&&shouldStartReply(g.dx,g.dy,latest.current.isScrolling()),
   onMoveShouldSetPanResponder:(_,g)=>!latest.current.disabled&&shouldStartReply(g.dx,g.dy,latest.current.isScrolling()),
   onPanResponderGrant:()=>{cancelled.current=false;},
   onPanResponderMove:(_,g)=>{if(Math.abs(g.dy)>=24||latest.current.isScrolling())cancelled.current=true;translation.setValue(cancelled.current?0:Math.min(76,Math.max(0,g.dx)));},
   onPanResponderRelease:(_,g)=>{if(!latest.current.disabled&&shouldFinishReply(g.dx,g.dy,cancelled.current))latest.current.onReply();Animated.spring(translation,{toValue:0,useNativeDriver:true,speed:28,bounciness:0}).start();},
   onPanResponderTerminationRequest:()=>true,
   onPanResponderTerminate:()=>{cancelled.current=true;translation.setValue(0);},
 }));
 return <View style={{position:"relative"}}>
   <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{position:"absolute",left:5,top:12,opacity:translation.interpolate({inputRange:[0,48],outputRange:[0,1],extrapolate:"clamp"})}}><Text style={{fontSize:24,color:"#A9CCFF"}}>↩</Text></Animated.View>
   <Animated.View {...pan.panHandlers} accessibilityActions={disabled?[]:[{name:"reply",label:"Reply to this message"}]} accessibilityLabel={label} onAccessibilityAction={event=>{if(event.nativeEvent.actionName==="reply"&&!disabled)onReply();}} style={{transform:[{translateX:translation}]}}>{children}</Animated.View>
 </View>;
}
