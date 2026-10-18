import { Text, View } from "react-native";
import { textSize, textLineHeight } from "@/theme/typography";
import type { MessageReply } from "../../../backend/messenger-types";
export function ReplyPreview({reply,fontFamily,outgoing=false}:{reply:MessageReply;fontFamily?:string;outgoing?:boolean}){
 return <View accessibilityLabel={`Reply to ${reply.name}: ${reply.text}`} style={{borderLeftWidth:3,borderLeftColor:outgoing?"#C5E5FF":"#469AFF",backgroundColor:outgoing?"#004FC9":"#0A192C",borderRadius:7,paddingHorizontal:9,paddingVertical:6,marginBottom:7,maxWidth:"100%"}}>
   <Text numberOfLines={1} style={{fontFamily,fontSize:textSize(12),lineHeight:textLineHeight(16),fontWeight:"600",color:"#B8DCFF"}}>{reply.name}</Text>
   <Text numberOfLines={2} style={{fontFamily,fontSize:textSize(13),lineHeight:textLineHeight(17),color:"#E0ECFF"}}>{reply.text}</Text>
 </View>;
}
