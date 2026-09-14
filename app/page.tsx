"use client";

import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Style = "direct" | "natural" | "detailed";
type Item = { id: string; label: string; emoji: string; category: string; phrase?: string };
type SavedPhrase = { id: string; text: string; favorite: boolean };
type HistoryItem = { time: string; text: string; date?: string; category?: string };
type ConversationMessage = { id: string; side: "me"|"partner"; text: string };
type Routine = { id: string; name: string; emoji: string; phrases: string[] };
const languages = [
  ["en-US","English (United States)"],["en-GB","English (United Kingdom)"],["es-ES","Spanish (Spain)"],["es-MX","Spanish (Mexico)"],["fr-FR","French"],["de-DE","German"],["it-IT","Italian"],["pt-BR","Portuguese (Brazil)"],["pt-PT","Portuguese (Portugal)"],["nl-NL","Dutch"],["sv-SE","Swedish"],["da-DK","Danish"],["no-NO","Norwegian"],["fi-FI","Finnish"],["pl-PL","Polish"],["cs-CZ","Czech"],["sk-SK","Slovak"],["hu-HU","Hungarian"],["ro-RO","Romanian"],["el-GR","Greek"],["tr-TR","Turkish"],["ru-RU","Russian"],["uk-UA","Ukrainian"],["ar-SA","Arabic"],["he-IL","Hebrew"],["fa-IR","Persian"],["hi-IN","Hindi"],["bn-IN","Bengali"],["ta-IN","Tamil"],["te-IN","Telugu"],["ur-PK","Urdu"],["zh-CN","Chinese (Simplified)"],["zh-TW","Chinese (Traditional)"],["ja-JP","Japanese"],["ko-KR","Korean"],["vi-VN","Vietnamese"],["th-TH","Thai"],["id-ID","Indonesian"],["ms-MY","Malay"],["fil-PH","Filipino"],["sw-KE","Swahili"],["af-ZA","Afrikaans"],["ca-ES","Catalan"],["hr-HR","Croatian"],["sr-RS","Serbian"],["bg-BG","Bulgarian"]
] as const;

const categories = [
  ["quick", "Quick", "⚡"], ["want", "I Want", "☝️"], ["needs", "I Need", "🤲"],
  ["feelings", "Feelings", "♡"], ["food", "Food", "🍽️"], ["drinks", "Drinks", "💧"],
  ["people", "People", "👥"], ["places", "Places", "⌂"], ["activities", "Activities", "✦"],
  ["questions", "Questions", "?"], ["responses", "Responses", "↩"], ["help", "Help", "＋"],
  ["favorites", "Favorites", "★"], ["custom", "Custom", "✎"],
];
const emojiGroups = {
  "Smileys & people": "😀 😃 😄 😁 😆 😅 😂 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😋 😛 😜 🤪 🤨 🧐 🤓 😎 🥳 😏 😒 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤯 😳 🥵 🥶 😨 😰 😥 🤗 🤔 🫣 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😴 🤤 😷 🤒 🤕 🤢 🤮 🤧 😈 👻 🤖 👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💪 👂 👃 👀 🧠 🫂 👤 👥 👶 🧒 👧 🧑 👨 👩 🧓".split(" "),
  "Animals & nature": "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦅 🦉 🐴 🦄 🐝 🪲 🐛 🦋 🐌 🐞 🐢 🐍 🦎 🐙 🦑 🦀 🐠 🐟 🐬 🐳 🌸 🌹 🌻 🌞 🌝 ⭐ 🌟 ✨ ⚡ 🔥 🌈 ☁️ ❄️ 💧 🌊 🌳 🌲 🌴 🌵 🍀 🍁".split(" "),
  "Food & drink": "🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥝 🍅 🥑 🥦 🥬 🥒 🌶️ 🌽 🥕 🧄 🥔 🍞 🥐 🥯 🥞 🧇 🧀 🍳 🥓 🥩 🍗 🌭 🍔 🍟 🍕 🥪 🌮 🌯 🥗 🍝 🍜 🍲 🍛 🍣 🍚 🍦 🍩 🍪 🎂 🍫 🍿 🥤 🧃 🥛 ☕ 🍵 🧊 🍽️".split(" "),
  "Activities & places": "⚽ 🏀 🏈 ⚾ 🎾 🏐 🎱 🏓 🏸 🥅 ⛳ 🏹 🎣 🛝 🛹 🏊 🚴 🚶 🏃 🧘 🎨 🎮 🎲 🧩 🎭 🎧 🎤 🎸 🎹 📖 ✏️ 🏠 🏫 🏥 🏪 🏬 🏨 🏦 ⛪ 🏕️ 🏖️ 🌳 🛍️ 🚗 🚌 🚲 ✈️ 🚀 🚻".split(" "),
  "Objects & symbols": "⌚ 📱 💻 ⌨️ 🖨️ 📷 📺 📻 ⏰ ⏱️ 💡 🔦 📕 📚 📝 ✏️ 📌 📍 🔒 🔑 🔨 🧰 🩺 💊 🩹 🛏️ 🚪 🪑 🎁 🎈 💬 ❤️ 🧡 💛 💚 💙 💜 🤍 🤎 🖤 💔 ❣️ 💕 💯 ✅ ❌ ❓ ❗ ➕ ➖ ➡️ ⬅️ ⬆️ ⬇️ ▶️ ⏸️ ☎️ ♻️".split(" "),
} as const;
const emojiSearchNames:Record<string,string>={"😀":"happy smile face","😊":"happy blush","😔":"sad","😠":"angry","😟":"worried nervous","😨":"scared afraid","😴":"sleep tired","😕":"confused","😣":"frustrated","💧":"water drink","🍽️":"food meal eat","🚻":"bathroom toilet","☁️":"cloud break quiet","🎧":"headphones music","📖":"read book","🎮":"game play","🚶":"walk","🌳":"outside tree nature","🏫":"school","🏠":"home house","🩺":"doctor medical","👤":"person","👥":"people group","🫂":"hug friend","🙏":"please thanks","🤲":"need help hands","⏱️":"time timer","☎️":"phone call","💬":"talk conversation","❓":"question","❗":"urgent important"};

const data: Item[] = [
  ...[["yes","Yes","✓"],["no","No","✕"],["maybe","Maybe","↔"],["please","Please","🙏"],["thanks","Thank you","♡"],["dont-know","I don't know","?"],["moment","Give me a moment","⏱"],["need-help","I need help","＋"],["need-break","I need a break","☁"],["dont-understand","I don't understand","?"],["repeat","Can you repeat that?","↻"],["okay","I'm okay","✓"],["not-okay","I'm not okay","!"],["home-now","I want to go home","⌂"],["tired-now","I'm tired","☾"],["hungry-now","I'm hungry","🍽️"],["thirsty-now","I'm thirsty","💧"],["stop","Please stop","■"],["more","More","＋"],["less","Less","−"]].map(([id,label,emoji])=>({id,label,emoji,category:"quick",phrase:label+(/[?.!]$/.test(label)?"":".")})),
  ...[["want","I want","☝️"],["dont-want","I don't want","✕"],["like","I would like","♡"]].map(([id,label,emoji])=>({id,label,emoji,category:"want"})),
  ...[["water","Water","💧"],["bathroom","Bathroom","🚻"],["break","A break","☁"],["help","Help","＋"],["quiet","Quiet","♩"],["space","Space","↔"],["rest","Rest","☾"],["leave","To leave","→"],["time","More time","⏱"],["trust","Someone I trust","👤"],["food-need","Food","🍽️"]].map(([id,label,emoji])=>({id,label,emoji,category:"needs"})),
  ...[["happy","Happy","😊"],["sad","Sad","😔"],["angry","Angry","😠"],["nervous","Nervous","😟"],["scared","Scared","😨"],["excited","Excited","🤩"],["tired","Tired","😴"],["overwhelmed","Overwhelmed","😵"],["confused","Confused","😕"],["frustrated","Frustrated","😣"],["calm","Calm","😌"],["uncomfortable","Uncomfortable","😖"],["too-loud","It's too loud","🔊"],["crowded","It's too crowded","👥"],["space-feel","I need space","↔"],["stay","Please stay with me","👤"]].map(([id,label,emoji])=>({id,label,emoji,category:"feelings"})),
  ...[["pizza","Pizza","🍕"],["sandwich","Sandwich","🥪"],["pasta","Pasta","🍝"],["rice","Rice","🍚"],["fruit","Fruit","🍎"],["snack","A snack","🥨"],["soup","Soup","🥣"],["salad","Salad","🥗"],["breakfast","Breakfast","🥞"],["something-else","Something else","…"]].map(([id,label,emoji])=>({id,label,emoji,category:"food"})),
  ...[["water-drink","Water","💧"],["juice","Juice","🧃"],["milk","Milk","🥛"],["tea","Tea","🍵"],["coffee","Coffee","☕"],["soda","Soda","🥤"],["smoothie","Smoothie","🧋"],["hot-chocolate","Hot chocolate","☕"]].map(([id,label,emoji])=>({id,label,emoji,category:"drinks"})),
  ...[["mom","Mom","👩"],["dad","Dad","👨"],["teacher","Teacher","🧑‍🏫"],["friend","Friend","🫂"],["caregiver","Caregiver","🤲"],["doctor-person","Doctor","🩺"],["family","Family","👪"],["someone","Someone","👤"]].map(([id,label,emoji])=>({id,label,emoji,category:"people"})),
  ...[["home","Home","⌂"],["school","School","🏫"],["work","Work","💼"],["restaurant","Restaurant","🍽️"],["store","Store","🛍️"],["doctor","Doctor","🩺"],["outside","Outside","🌳"],["elsewhere","Somewhere else","⌖"]].map(([id,label,emoji])=>({id,label,emoji,category:"places"})),
  ...[["read","Read","📖"],["music","Listen to music","🎧"],["walk","Go for a walk","🚶"],["draw","Draw","✏️"],["game","Play a game","🎮"],["watch","Watch something","▶"],["talk","Talk","💬"],["rest-act","Rest","☾"],["outside-act","Go outside","🌳"],["alone","Be alone","○"]].map(([id,label,emoji])=>({id,label,emoji,category:"activities"})),
  ...[["where-bathroom","Where is the bathroom?","🚻"],["what-time","What time is it?","⏱"],["what-next","What happens next?","→"],["who","Who is that?","👤"],["why","Why?","?"],["can-help","Can you help me?","＋"]].map(([id,label,emoji])=>({id,label,emoji,category:"questions",phrase:label})),
  ...[["yes-please","Yes, please.","✓"],["no-thanks","No, thank you.","✕"],["little","A little.","◐"],["finished","I'm finished.","✓"],["ready","I'm ready.","→"],["not-ready","I'm not ready yet.","⏱"]].map(([id,label,emoji])=>({id,label,emoji,category:"responses",phrase:label})),
  ...[["urgent-help","I need help now.","!"],["hurt","Something hurts.","＋"],["lost","I'm lost.","⌖"],["unsafe","I don't feel safe.","!"],["call-trust","Please call someone I trust.","☎"]].map(([id,label,emoji])=>({id,label,emoji,category:"help",phrase:label})),
];

const defaultRoutines: Routine[] = [
  {id:"school-morning",name:"School Morning",emoji:"🎒",phrases:["I need breakfast.","I need my backpack.","I'm ready to leave."]},
  {id:"restaurant",name:"Restaurant",emoji:"🍽️",phrases:["I would like to order.","Yes, please.","No, thank you.","I'm finished."]},
  {id:"wind-down",name:"Wind Down",emoji:"☾",phrases:["I need quiet.","I want my headphones.","I'm ready to rest."]},
];

function generateCommunicationPhrase(items: Item[], style: Style) {
  const ids = items.map(i=>i.id); const labels = items.map(i=>i.label);
  if (items.length === 0) return "Choose a few ideas to create your message.";
  if (items.length === 1 && items[0].phrase) return items[0].phrase;
  const feeling = items.find(i=>i.category === "feelings" && !["too-loud","crowded","space-feel","stay"].includes(i.id));
  const context = ids.includes("too-loud") ? "It's too loud" : ids.includes("crowded") ? "It's too crowded" : "";
  if (feeling) {
    const need = ids.includes("break") || ids.includes("need-break") ? (style === "natural" ? "Could I take a break?" : "I need a break.") : ids.includes("space") || ids.includes("space-feel") ? "I need some space." : ids.includes("help") ? "I need help." : "";
    return `${context ? context + " and I'm feeling " + feeling.label.toLowerCase() + "." : "I'm feeling " + feeling.label.toLowerCase() + "."}${need ? " " + need : ""}`;
  }
  const object = items.find(i=>["food","drinks","needs","activities","people","places"].includes(i.category));
  if (ids.includes("bathroom")) return "I need to use the bathroom.";
  if (ids.includes("dont-want") && object) return `I don't want ${object.label.toLowerCase()}.`;
  if (object) {
    const x = object.label.toLowerCase().replace(/^a /, "");
    if (style === "direct") return `I want ${x}.`;
    if (style === "detailed") return `I would like ${x}, please.`;
    return `Could I have ${x}, please?`;
  }
  return labels.join(". ") + (/[?.!]$/.test(labels.at(-1) || "") ? "" : ".");
}

function useLocal<T>(key:string, initial:T) {
  const [value,setValue]=useState<T>(initial);
  useEffect(()=>{try{const v=localStorage.getItem(key);if(v)setValue(JSON.parse(v));}catch{}},[key]);
  useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}},[key,value]);
  return [value,setValue] as const;
}

function useCloudLocal<T>(key:string, initial:T, userId?:string) {
  const [value,setValue]=useLocal<T>(key,initial);
  const [cloudUser,setCloudUser]=useState<string>();
  const valueRef=useRef(value);
  useEffect(()=>{valueRef.current=value},[value]);
  useEffect(()=>{
    let active=true;
    if(!userId)return;
    supabase.from("voxa_user_data").select("value").eq("user_id",userId).eq("key",key).maybeSingle().then(async({data,error})=>{
      if(!active)return;
      if(error){console.error("Voxa sync load failed",error);return;}
      if(data?.value!==undefined)setValue(data.value as T);
      else await supabase.from("voxa_user_data").upsert({user_id:userId,key,value:valueRef.current},{onConflict:"user_id,key"});
      if(active)setCloudUser(userId);
    });
    return()=>{active=false};
  },[key,userId,setValue]);
  useEffect(()=>{
    if(!userId||cloudUser!==userId)return;
    const timer=window.setTimeout(()=>{void supabase.from("voxa_user_data").upsert({user_id:userId,key,value},{onConflict:"user_id,key"})},250);
    return()=>window.clearTimeout(timer);
  },[cloudUser,key,userId,value]);
  return [value,setValue] as const;
}

export default function Home() {
  const [session,setSession]=useState<Session|null>(null); const [authReady,setAuthReady]=useState(false); const [authOpen,setAuthOpen]=useState(false); const [recovery,setRecovery]=useState(false);
  const [entered,setEntered]=useState(false); const [page,setPage]=useState("Communicate"); const [profileComplete,setProfileComplete]=useState(false); const [profileName,setProfileName]=useState(""); const [profileMessage,setProfileMessage]=useState("");
  const [category,setCategory]=useState("quick"); const [selected,setSelected]=useState<Item[]>([]);
  const [message,setMessage]=useState(""); const [editing,setEditing]=useState(false); const [speaking,setSpeaking]=useState(false);
  const userId=session?.user.id;
  const [style,setStyle]=useCloudLocal<Style>("voxa-style","natural",userId); const [phrases,setPhrases]=useCloudLocal<SavedPhrase[]>("voxa-phrases",[],userId);
  const [history,setHistory]=useCloudLocal<HistoryItem[]>("voxa-history",[],userId);
  const [icons,setIcons]=useCloudLocal("voxa-icons",true,userId);
  const [animations,setAnimations]=useCloudLocal("voxa-animations",true,userId); const [buttonSize,setButtonSize]=useCloudLocal("voxa-size","large",userId);
  const [tts,setTts]=useCloudLocal("voxa-tts",true,userId); const [autoSpeak,setAutoSpeak]=useCloudLocal("voxa-auto-speak",false,userId); const [voiceName,setVoiceName]=useCloudLocal("voxa-voice","",userId); const [language,setLanguage]=useCloudLocal("voxa-language","en-US",userId);
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]); const [activeRoutine,setActiveRoutine]=useState<number|null>(null); const [routineStep,setRoutineStep]=useState(0);
  const [partner,setPartner]=useState(""); const [customName,setCustomName]=useState("");
  const [routines,setRoutines]=useCloudLocal<Routine[]>("voxa-routines",defaultRoutines,userId); const [addingRoutine,setAddingRoutine]=useState(false);
  const [routineName,setRoutineName]=useState(""); const [routinePhrases,setRoutinePhrases]=useState<string[]>([]);
  const [addingWord,setAddingWord]=useState(false); const [newWord,setNewWord]=useState(""); const [newEmoji,setNewEmoji]=useState("✨"); const [emojiScreen,setEmojiScreen]=useState(false); const [emojiQuery,setEmojiQuery]=useState(""); const [emojiGroup,setEmojiGroup]=useState("All");
  const [conversation,setConversation]=useCloudLocal<ConversationMessage[]>("voxa-conversation",[],userId); const [composingConversation,setComposingConversation]=useState(false);
  const [custom,setCustom]=useCloudLocal<Item[]>("voxa-custom",[],userId); const [demo,setDemo]=useState(false); const [demoStep,setDemoStep]=useState(0);
  const [source,setSource]=useState<"local"|"gemini">("local");
  const allData=[...data,...custom];
  const grid=category==="favorites"?allData.filter(i=>["water-drink","need-break","headphones"].includes(i.id)):allData.filter(i=>i.category===category);
  const isSaved=Boolean(message&&phrases.some(p=>p.text===message));
  const phraseCounts=history.reduce<Record<string,number>>((counts,item)=>{counts[item.text]=(counts[item.text]||0)+1;return counts},{});
  const topPhrases=Object.entries(phraseCounts).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const categoryCounts=history.reduce<Record<string,number>>((counts,item)=>{const key=item.category||"Communicate";counts[key]=(counts[key]||0)+1;return counts},{});
  const topCategory=Object.entries(categoryCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"None yet";
  const week=Array.from({length:7},(_,offset)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(6-offset));const key=d.toISOString().slice(0,10);return{label:d.toLocaleDateString([],{weekday:"narrow"}),count:history.filter(h=>h.date===key).length}});
  const accountName=String(session?.user.user_metadata?.full_name||session?.user.user_metadata?.name||session?.user.email?.split("@")[0]||"Account");

  useEffect(()=>{const load=()=>setVoices(window.speechSynthesis?.getVoices()||[]);load();window.speechSynthesis?.addEventListener("voiceschanged",load);return()=>window.speechSynthesis?.removeEventListener("voiceschanged",load)},[]);
  useEffect(()=>{setProfileComplete(session?.user.user_metadata?.profile_complete===true);setProfileName(accountName)},[session?.user.id,session?.user.user_metadata?.profile_complete,accountName]);
  useEffect(()=>{
    void supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{
      setSession(next);setAuthReady(true);
      if(event==="PASSWORD_RECOVERY"){setRecovery(true);setAuthOpen(true)}
      if(event==="SIGNED_IN"){setAuthOpen(false);setEntered(true)}
      if(event==="SIGNED_OUT")setEntered(false);
    });
    return()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{if(localStorage.getItem("voxa-empty-phrases-v2"))return;setPhrases([]);setHistory(h=>h.filter(x=>![["10:42 AM","Could I have some water, please?"],["10:38 AM","It's too loud in here."]].some(([time,text])=>x.time===time&&x.text===text)));localStorage.setItem("voxa-empty-phrases-v2","1")},[setPhrases,setHistory]);

  function choose(item:Item){
    if(item.phrase && ["quick","questions","responses","help"].includes(item.category)){setMessage(item.phrase);setSelected([item]);return;}
    setSelected(s=>s.some(x=>x.id===item.id)?s.filter(x=>x.id!==item.id):[...s,item]);
  }
  async function create(){
    const fallback=generateCommunicationPhrase(selected,style); setEditing(false);
    try{const response=await fetch("/api/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({selections:selected.map(({id,label,category})=>({id,label,category})),style,language:languages.find(x=>x[0]===language)?.[1]||"English"})});if(!response.ok)throw new Error();const body=await response.json();const phrase=typeof body.phrase==="string"?body.phrase.trim():"";if(!phrase||phrase.length>280||/[{}\[\]]/.test(phrase)||/\b(id|label|category|json)\b\s*[:=]/i.test(phrase))throw new Error();setMessage(phrase);setSource("gemini");if(autoSpeak&&tts)setTimeout(()=>speak(phrase),0);}
    catch{setMessage(fallback);setSource("local");if(autoSpeak&&tts)setTimeout(()=>speak(fallback),0);}
  }
  function speak(text=message){if(!text||typeof window==="undefined"||!tts)return; window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=language;const voice=voices.find(v=>v.name===voiceName)||voices.find(v=>v.lang.toLowerCase()===language.toLowerCase())||voices.find(v=>v.lang.toLowerCase().startsWith(language.split("-")[0].toLowerCase()));if(voice)u.voice=voice;u.onstart=()=>setSpeaking(true);u.onend=()=>setSpeaking(false);window.speechSynthesis.speak(u);const now=new Date();setHistory(h=>[{time:now.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}),date:now.toISOString().slice(0,10),text,category:categories.find(c=>c[0]===category)?.[1]||"Communicate"},...h].slice(0,100));}
  function save(){if(!message)return;setPhrases(p=>p.some(x=>x.text===message)?p.filter(x=>x.text!==message):[{id:crypto.randomUUID(),text:message,favorite:true},...p]);}
  function addConversationMessage(side:"me"|"partner",text:string){const clean=text.trim();if(!clean)return;setConversation(c=>[...c,{id:crypto.randomUUID(),side,text:clean}]);}
  function sendPartner(){if(!partner.trim())return;addConversationMessage("partner",partner);setPartner("");}
  function sendMyMessage(text=message){if(!text.trim())return;addConversationMessage("me",text);setComposingConversation(false);setPage("Conversation");}
  function clear(){setSelected([]);setMessage("");}
  function addWord(e:React.FormEvent){e.preventDefault();const label=newWord.trim();if(!label)return;setCustom(x=>[...x,{id:crypto.randomUUID(),label,emoji:newEmoji.trim()||"✨",category,phrase:["quick","questions","responses","help"].includes(category)?label+(/[?.!]$/.test(label)?"":"."):undefined}]);setNewWord("");setNewEmoji("✨");setAddingWord(false)}
  function addRoutine(e:React.FormEvent){e.preventDefault();if(!routineName.trim()||!routinePhrases.length)return;setRoutines(x=>[...x,{id:crypto.randomUUID(),name:routineName.trim(),emoji:"✦",phrases:routinePhrases}]);setRoutineName("");setRoutinePhrases([]);setAddingRoutine(false)}
  function startDemo(){setDemo(true);setDemoStep(0)}
  function exitDemo(){window.speechSynthesis?.cancel();setDemo(false);setDemoStep(0);setEntered(false);setPage("Communicate")}
  async function saveProfile(e:React.FormEvent,finishOnboarding=false){
    e.preventDefault();setProfileMessage("");
    const cleanName=profileName.trim();if(!cleanName){setProfileMessage("Enter your name to continue.");return;}
    const {error}=await supabase.auth.updateUser({data:{...session?.user.user_metadata,full_name:cleanName,profile_complete:true}});
    if(error){setProfileMessage(error.message);return;}
    setProfileComplete(true);setProfileMessage(finishOnboarding?"":"Profile saved.");
  }
  useEffect(()=>{
    if(!demo)return;
    const timers=[700,1750,2800,3850,5000].map((delay,index)=>window.setTimeout(()=>setDemoStep(index+1),delay));
    const speakTimer=window.setTimeout(()=>{if("speechSynthesis" in window){window.speechSynthesis.cancel();window.speechSynthesis.speak(new SpeechSynthesisUtterance("It's too loud and I'm feeling overwhelmed. Could I take a break?"));}},5250);
    return()=>{timers.forEach(clearTimeout);clearTimeout(speakTimer)};
  },[demo]);

  if(demo) return <GuidedDemo step={demoStep} onExit={exitDemo} onReplay={()=>{setDemoStep(0);setDemo(false);setTimeout(()=>setDemo(true),30)}}/>;
  if(!authReady)return <main className="auth-page"><div className="auth-card"><Logo/><p>Loading Voxa…</p></div></main>;
  if(authOpen||(!session&&entered))return <AuthScreen recovery={recovery} onRecoveryDone={()=>{setRecovery(false);setAuthOpen(false);setEntered(true)}} onBack={()=>{setAuthOpen(false);setEntered(false)}}/>;
  if(!entered) return <Landing user={session?.user||null} onEnter={()=>session?setEntered(true):setAuthOpen(true)} onDemo={startDemo}/>;
  if(!session)return <AuthScreen recovery={false} onRecoveryDone={()=>{}} onBack={()=>setEntered(false)}/>;
  if(!profileComplete)return <ProfileSetup name={profileName} setName={setProfileName} language={language} setLanguage={setLanguage} buttonSize={buttonSize} setButtonSize={setButtonSize} tts={tts} setTts={setTts} voiceName={voiceName} setVoiceName={setVoiceName} voices={voices} message={profileMessage} onSubmit={e=>void saveProfile(e,true)}/>;
  return <main className={`app ${animations?"":"no-motion"}`}>
    <header className="topbar">
      <button className="brand" onClick={()=>setEntered(false)} aria-label="Voxa home"><Logo/> <span>Voxa</span></button>
      <nav className="desktop-nav" aria-label="Main navigation">{["Communicate","Conversation","My Phrases","Routines","History","Customize","Patterns","Profile","Settings"].map(n=><button key={n} className={page===n?"active":""} onClick={()=>setPage(n)}>{n}</button>)}</nav>
      <div className="top-actions"><span className="private"><i/> Secure sync</span><span className="account-name" aria-label="Signed-in account">{accountName}</span><button className="logout" onClick={()=>void supabase.auth.signOut()}>Log out</button></div>
    </header>
    <nav className="mobile-nav" aria-label="Mobile navigation">{["Communicate","Conversation","My Phrases","Profile","Settings"].map(n=><button key={n} className={page===n?"active":""} onClick={()=>setPage(n)}>{n.replace("My Phrases","Phrases")}</button>)}</nav>
    {page==="Communicate"&&<div className="communicate">
      <aside className="categories"><p className="eyebrow">COMMUNICATE</p><h2>What do you want to say?</h2>{categories.map(([id,label,emoji])=><button key={id} className={category===id?"selected-cat":""} onClick={()=>setCategory(id)}><span>{emoji}</span>{label}</button>)}<button className="demo-mini" onClick={startDemo}>▶ Demo Mode</button></aside>
      <section className="board">
        <div className="board-head"><div><p className="eyebrow">{categories.find(c=>c[0]===category)?.[1]}</p><h1>{category==="feelings"?"How are you feeling?":category==="quick"?"Say it quickly":"Choose what you mean"}</h1><p>{category==="feelings"?"Select a feeling, then add what you need.":"Tap a card to add it to your choices."}</p></div><span className="count">{grid.length} choices</span></div>
        <div className={`card-grid size-${buttonSize}`}>{grid.map(item=><button key={item.id} className={`comm-card ${selected.some(s=>s.id===item.id)?"chosen":""}`} onClick={()=>choose(item)} aria-pressed={selected.some(s=>s.id===item.id)}>{selected.some(s=>s.id===item.id)&&<b className="check">✓</b>}{icons&&<span className="emoji">{item.emoji}</span>}<strong>{item.label}</strong>{item.category==="help"&&<small>Quick access</small>}</button>)}<button className="comm-card add-word-card" onClick={()=>setAddingWord(true)}><span className="emoji">＋</span><strong>Add another word</strong><small>To {categories.find(c=>c[0]===category)?.[1]}</small></button></div>
        {addingWord&&<form className="inline-maker" onSubmit={addWord}><div><h3>Add to {categories.find(c=>c[0]===category)?.[1]}</h3><button type="button" aria-label="Close" onClick={()=>setAddingWord(false)}>×</button></div><label>Word or phrase<input autoFocus value={newWord} onChange={e=>setNewWord(e.target.value)} placeholder="Type your own"/></label><label>Emoji<button type="button" className="emoji-launch" onClick={()=>setEmojiScreen(true)}><b>{newEmoji}</b><span>Choose an emoji</span><i>→</i></button></label><button className="primary">Add word</button></form>}
        {grid.length===0&&<Empty title="No favorites yet." text="Favorite the things you use most to keep them close."/>}
      </section>
      <aside className="message-panel">
        <div className="choices-label"><p className="eyebrow purple">YOU CHOSE</p><span>{selected.length} selected</span></div>
        <div className="chips">{selected.length?selected.map(i=><button key={i.id} onClick={()=>setSelected(s=>s.filter(x=>x.id!==i.id))}>{i.emoji} {i.label} <b>×</b></button>):<p>Your choices will appear here.</p>}</div>
        <div className="style-row"><span>Communication style</span><select value={style} onChange={e=>setStyle(e.target.value as Style)}><option value="direct">Direct</option><option value="natural">Natural</option><option value="detailed">Detailed</option></select></div>
        <button className="primary create" disabled={!selected.length} onClick={create}>✦ Create message</button>
        <div className={`suggestion ${message?"ready":""}`}><div className="suggest-head"><p className="eyebrow mint">VOXA SUGGESTS</p><span>{source==="gemini"?"Language assistance":"Private · on-device"}</span></div>{editing?<textarea autoFocus value={message} onChange={e=>setMessage(e.target.value)}/>:<p className="suggested">{message||"Your natural-language message will appear here."}</p>}</div>
        <div className={`wave ${speaking?"playing":""}`} aria-hidden>{[1,2,3,4,5,6,7,8,9].map(n=><i key={n}/>)}</div>
        <div className="message-actions"><button className="speak" disabled={!message||!tts} onClick={()=>speaking?(window.speechSynthesis.cancel(),setSpeaking(false)):speak()}>{speaking?"■ Stop":"▶ Speak"}</button><button disabled={!message} onClick={()=>setEditing(!editing)}>✎ Edit</button><button disabled={!message} onClick={create}>↻ Another</button><button className={isSaved?"saved-heart":""} aria-pressed={isSaved} disabled={!message} onClick={save}>{isSaved?"♥ Saved":"♡ Save"}</button></div>
        {composingConversation&&<button className="primary send-conversation" disabled={!message} onClick={()=>sendMyMessage()}>Send to conversation →</button>}
        <button className="clear" onClick={clear}>Clear everything</button>
        <div className="principle"><b>🔒 You’re in control</b><p>Voxa only uses the choices you select. It never guesses what you mean.</p></div>
      </aside>
    </div>}
    {emojiScreen&&<section className="emoji-screen" role="dialog" aria-modal="true" aria-labelledby="emoji-title"><header><button onClick={()=>setEmojiScreen(false)}>← Back</button><div><p className="eyebrow">CUSTOM WORD</p><h1 id="emoji-title">Choose an emoji</h1></div><span className="emoji-current">{newEmoji}</span></header><div className="emoji-search"><span>⌕</span><input autoFocus value={emojiQuery} onChange={e=>setEmojiQuery(e.target.value)} placeholder="Search emojis — try food, happy, school…"/></div><nav aria-label="Emoji categories">{["All",...Object.keys(emojiGroups)].map(group=><button key={group} className={emojiGroup===group?"selected":""} onClick={()=>setEmojiGroup(group)}>{group}</button>)}</nav><div className="emoji-library">{Object.entries(emojiGroups).filter(([group])=>emojiGroup==="All"||emojiGroup===group).map(([group,emojis])=>{const filtered=emojis.filter(emoji=>!emojiQuery.trim()||`${emoji} ${emojiSearchNames[emoji]||group}`.toLowerCase().includes(emojiQuery.toLowerCase()));return filtered.length?<section key={group}><h2>{group}</h2><div>{filtered.map((emoji,index)=><button key={`${emoji}-${index}`} aria-label={`Select ${emoji}`} onClick={()=>{setNewEmoji(emoji);setEmojiScreen(false)}}>{emoji}</button>)}</div></section>:null})}</div></section>}
    {page==="Conversation"&&<Page title="Conversation" sub="Take turns while keeping every message visible."><div className="conversation"><div className="conversation-head"><b>{conversation.length?`${conversation.length} messages`:"Start a conversation"}</b>{conversation.length>0&&<button className="clear" onClick={()=>setConversation([])}>Clear conversation</button>}</div><div className="conversation-thread" aria-live="polite">{conversation.length?conversation.map(item=><div key={item.id} className={`bubble ${item.side}`}><b>{item.side==="me"?"Me":"Conversation Partner"}</b><p>{item.text}</p>{item.side==="me"&&<button disabled={!tts} onClick={()=>speak(item.text)}>▶ Speak</button>}</div>):<Empty title="No messages yet." text="The conversation partner can type a message below."/>}</div><form className="partner-form" onSubmit={e=>{e.preventDefault();sendPartner()}}><label>Conversation partner<textarea value={partner} onChange={e=>setPartner(e.target.value)} placeholder="Type a question or message…"/></label><button className="primary" disabled={!partner.trim()}>Send message</button></form>{conversation.at(-1)?.side==="partner"&&<div className="suggestion-buttons"><b>Suggested responses</b>{(/hungry|lunch|eat|food/i.test(conversation.at(-1)?.text||"")?["Yes","No","I don't know","Choose food"]:/how are you|feel/i.test(conversation.at(-1)?.text||"")?["I'm okay","I'm not okay","I don't know","Choose a feeling"]:["Yes","No","I don't know","Give me a moment"]).map(x=><button key={x} onClick={()=>{if(x==="Choose food"){setCategory("food");setComposingConversation(true);setMessage("");setSelected([]);setPage("Communicate")}else if(x==="Choose a feeling"){setCategory("feelings");setComposingConversation(true);setMessage("");setSelected([]);setPage("Communicate")}else{const text=x+(/[?.!]$/.test(x)?"":".");addConversationMessage("me",text);setMessage(text)}}}>{x}</button>)}</div>}<button className="primary visual-reply" onClick={()=>{setComposingConversation(true);setMessage("");setSelected([]);setPage("Communicate")}}>Open visual choices</button></div></Page>}
    {page==="My Phrases"&&<Page title="My Phrases" sub="Only messages you intentionally save appear here."><div className="phrase-list">{phrases.length?phrases.map(p=><article key={p.id}><button className="favorite saved" aria-label="Remove saved phrase" title="Remove saved phrase" onClick={()=>setPhrases(x=>x.filter(q=>q.id!==p.id))}>♥</button><p>{p.text}</p><div><button disabled={!tts} onClick={()=>speak(p.text)}>▶ Speak</button><button onClick={()=>{setMessage(p.text);setPage("Communicate")}}>Reuse</button></div></article>):<Empty title="Your phrases will appear here." text="Press Save on a created message to keep it here."/>}</div></Page>}
    {page==="Routines"&&<Page title="Routines" sub="Ready-made sequences for moments you communicate through often.">{activeRoutine===null?<><div className="section-actions"><button className="primary" onClick={()=>setAddingRoutine(!addingRoutine)}>＋ Add routine</button></div>{addingRoutine&&<form className="routine-maker" onSubmit={addRoutine}><div><h3>Create a routine from saved phrases</h3><button type="button" aria-label="Close" onClick={()=>setAddingRoutine(false)}>×</button></div><label>Routine name<input autoFocus value={routineName} onChange={e=>setRoutineName(e.target.value)} placeholder="Getting ready"/></label><fieldset><legend>Choose saved phrases</legend>{phrases.length?phrases.map(p=><label key={p.id}><input type="checkbox" checked={routinePhrases.includes(p.text)} onChange={()=>setRoutinePhrases(x=>x.includes(p.text)?x.filter(t=>t!==p.text):[...x,p.text])}/><span>{p.text}</span></label>):<p>Save some messages first, then return here to build a routine.</p>}</fieldset><button className="primary" disabled={!routineName.trim()||!routinePhrases.length}>Create routine</button></form>}<div className="routine-grid">{routines.map((r,i)=><article key={r.id}><span>{r.emoji}</span><h3>{r.name}</h3><ol>{r.phrases.map(x=><li key={x}>{x}</li>)}</ol><button onClick={()=>{setActiveRoutine(i);setRoutineStep(0)}}>Start routine →</button></article>)}</div></>:<div className="routine-player"><button className="outline" onClick={()=>setActiveRoutine(null)}>← All routines</button><span>{routines[activeRoutine].emoji}</span><p className="eyebrow">{routines[activeRoutine].name.toUpperCase()}</p><h2>{routines[activeRoutine].phrases[routineStep]}</h2><p>Step {routineStep+1} of {routines[activeRoutine].phrases.length}</p><div><button className="primary" onClick={()=>speak(routines[activeRoutine].phrases[routineStep])}>▶ Speak this step</button><button className="outline" onClick={()=>{setMessage(routines[activeRoutine].phrases[routineStep]);setPage("Communicate")}}>Use in Communicate</button></div><div className="routine-nav"><button disabled={routineStep===0} onClick={()=>setRoutineStep(s=>s-1)}>← Previous</button>{routineStep<routines[activeRoutine].phrases.length-1?<button onClick={()=>setRoutineStep(s=>s+1)}>Next →</button>:<button onClick={()=>setActiveRoutine(null)}>Finish ✓</button>}</div></div>}</Page>}
    {page==="History"&&<Page title="History" sub="Recently communicated on this device."><button className="outline danger" onClick={()=>setHistory([])}>Clear history</button><div className="history">{history.length?history.map((h,i)=><article key={i}><time>{h.time}</time><p>{h.text}</p><button onClick={()=>speak(h.text)}>▶ Speak again</button><button onClick={()=>{setMessage(h.text);setPage("Communicate")}}>Reuse</button></article>):<Empty title="Nothing here yet." text="Messages you communicate will appear here."/>}</div></Page>}
    {page==="Customize"&&<Page title="Customize Voxa" sub="Make communication feel like yours."><div className="customize"><form onSubmit={e=>{e.preventDefault();if(!customName)return;setCustom(x=>[...x,{id:crypto.randomUUID(),label:customName,emoji:"✨",category:"custom"}]);setCustomName("")}}><h3>Create a communication button</h3><label>Name<input value={customName} onChange={e=>setCustomName(e.target.value)} placeholder="Headphones"/></label><label>Icon / emoji<input defaultValue="🎧"/></label><label>Phrase<input placeholder="Can I have my headphones, please?"/></label><button className="primary">Add button</button></form><div><h3>Manage your experience</h3>{["Create a category","Reorder categories","Manage favorites","Hide a category","Create a routine"].map(x=><button className="manage" key={x}>{x}<span>→</span></button>)}</div></div></Page>}
    {page==="Patterns"&&<Page title="Communication Patterns" sub="Your actual activity on this device—not estimates or sample data."><div className="stats"><article><span>{week.reduce((sum,d)=>sum+d.count,0)}</span><p>Messages this week</p></article><article><span>{topCategory}</span><p>Most used category</p></article><article><span>{phrases.length}</span><p>Saved phrases</p></article></div><div className="patterns"><article><h3>Most used phrases</h3>{topPhrases.length?topPhrases.map(([text,count],i)=><p key={text}><b>{i+1}</b><span>{text}</span><small>{count}×</small></p>):<Empty title="No activity yet." text="Phrases you speak will appear here."/>}</article><article><h3>Communication activity</h3><div className="bars">{week.map((d,i)=>{const max=Math.max(1,...week.map(x=>x.count));return <i key={i} style={{height:Math.max(4,(d.count/max)*100)+"%"}} title={`${d.count} messages`}><b>{d.count||""}</b><span>{d.label}</span></i>})}</div></article></div><p className="notice">Voxa shows communication usage patterns only. It does not provide medical or diagnostic conclusions.</p></Page>}
    {page==="Profile"&&<Page title="Your profile" sub="Keep your identity and communication preferences together."><div className="profile-layout"><form className="profile-card" onSubmit={e=>void saveProfile(e)}><div className="profile-avatar" aria-hidden>{accountName.slice(0,1).toUpperCase()}</div><label>Name<input value={profileName} onChange={e=>setProfileName(e.target.value)} autoComplete="name" required/></label><label>Email<input value={session.user.email||""} disabled/></label><button className="primary">Save profile</button>{profileMessage&&<p className="auth-message" role="status">{profileMessage}</p>}</form><div className="profile-preferences"><h2>Communication preferences</h2><Setting title="Language" desc="Used for new messages and speech"><select value={language} onChange={e=>{setLanguage(e.target.value);setVoiceName("")}}>{languages.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></Setting><Setting title="Voice" desc={`${voices.length} voices available on this device`}><select value={voiceName} onChange={e=>setVoiceName(e.target.value)} disabled={!tts}><option value="">Automatic voice</option>{voices.filter(v=>v.lang.toLowerCase().startsWith(language.split("-")[0].toLowerCase())).map(v=><option key={`${v.name}-${v.lang}`} value={v.name}>{v.name} ({v.lang})</option>)}</select></Setting><Setting title="Text to speech" desc="Allow Voxa to read messages aloud"><Toggle value={tts} set={setTts}/></Setting><Setting title="Button size" desc="Size of communication choices"><select value={buttonSize} onChange={e=>setButtonSize(e.target.value)}><option value="standard">Standard</option><option value="large">Large</option><option value="extra-large">Extra Large</option></select></Setting></div></div></Page>}
    {page==="Settings"&&<Page title="Settings" sub="Choose how Voxa looks, feels, and speaks."><div className="settings"><Setting title="Communication style" desc="How Voxa phrases your choices"><select value={style} onChange={e=>setStyle(e.target.value as Style)}><option value="direct">Direct</option><option value="natural">Natural</option><option value="detailed">Detailed</option></select></Setting><Setting title="Language" desc="Language used for new messages and speech"><select value={language} onChange={e=>{setLanguage(e.target.value);setVoiceName("")}}>{languages.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></Setting><Setting title="Button size" desc="Adjust visual communication cards"><select value={buttonSize} onChange={e=>setButtonSize(e.target.value)}><option value="standard">Standard</option><option value="large">Large</option><option value="extra-large">Extra Large</option></select></Setting><Setting title="Text to speech" desc="Allow Voxa to read messages aloud"><Toggle value={tts} set={setTts}/></Setting><Setting title="Auto Speak" desc="Speak immediately after generation"><Toggle value={autoSpeak} set={setAutoSpeak}/></Setting><Setting title="Voice" desc={`${voices.length} voices available on this device`}><select value={voiceName} onChange={e=>setVoiceName(e.target.value)} disabled={!tts}><option value="">Automatic voice for selected language</option>{languages.map(([code,name])=>{const matches=voices.filter(v=>v.lang.toLowerCase().startsWith(code.split("-")[0].toLowerCase()));return matches.length?<optgroup key={code} label={name}>{matches.map(v=><option key={`${v.name}-${v.lang}`} value={v.name}>{v.name} ({v.lang})</option>)}</optgroup>:null})}</select></Setting><Setting title="Test selected voice" desc="Hear the currently selected language and voice"><button className="outline" disabled={!tts} onClick={()=>speak(language.startsWith("es")?"Hola, esta es mi voz.":language.startsWith("fr")?"Bonjour, voici ma voix.":language.startsWith("de")?"Hallo, das ist meine Stimme.":language.startsWith("it")?"Ciao, questa è la mia voce.":language.startsWith("pt")?"Olá, esta é a minha voz.":language.startsWith("ja")?"こんにちは、これが私の声です。":language.startsWith("ko")?"안녕하세요, 이것은 제 목소리입니다.":language.startsWith("zh")?"你好，这是我的声音。":"Hello, this is my voice.")}>▶ Test voice</button></Setting><Setting title="Show icons" desc="Display icons alongside text"><Toggle value={icons} set={setIcons}/></Setting><Setting title="Animations" desc="Use subtle interface movement"><Toggle value={animations} set={setAnimations}/></Setting></div><p className="notice">Voice availability depends on the voices installed in your browser or device. New Gemini-generated messages use your selected language. All settings are saved on this device.</p></Page>}
  </main>
}

function Logo(){return <span className="logo" aria-hidden><i/><i/><i/></span>}
function Page({title,sub,children}:{title:string;sub:string;children:React.ReactNode}){return <section className="page"><p className="eyebrow">VOXA</p><h1>{title}</h1><p className="page-sub">{sub}</p>{children}</section>}
function Empty({title,text}:{title:string;text:string}){return <div className="empty"><span>○</span><h3>{title}</h3><p>{text}</p></div>}
function Setting({title,desc,children}:{title:string;desc:string;children:React.ReactNode}){return <div className="setting"><div><b>{title}</b><p>{desc}</p></div>{children}</div>}
function Toggle({value,set}:{value:boolean;set?:(v:boolean)=>void}){return <button type="button" role="switch" aria-checked={value} className={`toggle ${value?"on":""}`} onClick={()=>set?.(!value)}><i/></button>}
function ProfileSetup({name,setName,language,setLanguage,buttonSize,setButtonSize,tts,setTts,voiceName,setVoiceName,voices,message,onSubmit}:{name:string;setName:(value:string)=>void;language:string;setLanguage:(value:string)=>void;buttonSize:string;setButtonSize:(value:string)=>void;tts:boolean;setTts:(value:boolean)=>void;voiceName:string;setVoiceName:(value:string)=>void;voices:SpeechSynthesisVoice[];message:string;onSubmit:(e:React.FormEvent)=>void}){
  const matchingVoices=voices.filter(v=>v.lang.toLowerCase().startsWith(language.split("-")[0].toLowerCase()));
  return <main className="profile-setup"><section><div className="auth-brand"><Logo/><span>Voxa</span></div><p className="eyebrow">SET UP YOUR PROFILE</p><h1>Make Voxa yours.</h1><p>Choose how Voxa should address you and speak your messages. You can change these choices later.</p><form onSubmit={onSubmit}><label>Name<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" required placeholder="Your name"/></label><div className="setup-grid"><label>Language<select value={language} onChange={e=>{setLanguage(e.target.value);setVoiceName("")}}>{languages.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label><label>Voice<select value={voiceName} onChange={e=>setVoiceName(e.target.value)} disabled={!tts}><option value="">Automatic voice</option>{matchingVoices.map(v=><option key={`${v.name}-${v.lang}`} value={v.name}>{v.name} ({v.lang})</option>)}</select></label><label>Button size<select value={buttonSize} onChange={e=>setButtonSize(e.target.value)}><option value="standard">Standard</option><option value="large">Large</option><option value="extra-large">Extra Large</option></select></label><div className="setup-toggle"><span><b>Text to speech</b><small>Read messages aloud</small></span><Toggle value={tts} set={setTts}/></div></div><button className="primary">Save and enter Voxa →</button>{message&&<p className="auth-message" role="status">{message}</p>}</form></section></main>
}
function AuthScreen({recovery,onRecoveryDone,onBack}:{recovery:boolean;onRecoveryDone:()=>void;onBack:()=>void}){
  const [mode,setMode]=useState<"login"|"signup"|"forgot">("login"); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setMessage("");
    if((mode==="signup"||recovery)&&password.length<8){setMessage("Use at least 8 characters for your password.");return;}
    if((mode==="signup"||recovery)&&password!==confirm){setMessage("Passwords do not match.");return;}
    setBusy(true);
    try{
      if(recovery){const {error}=await supabase.auth.updateUser({password});if(error)throw error;setMessage("Password updated.");onRecoveryDone();return;}
      const voxaUrl=new URL("/",window.location.origin).toString();
      if(mode==="forgot"){const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:voxaUrl});if(error)throw error;setMessage("Check your email for a secure password reset link.");return;}
      if(mode==="signup"){const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:voxaUrl,data:{full_name:name.trim()}}});if(error)throw error;if(!data.session)setMessage("Check your email to verify your account, then log in.");return;}
      const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;
    }catch(error){setMessage(error instanceof Error?error.message:"Something went wrong. Please try again.");}finally{setBusy(false)}
  }
  const title=recovery?"Choose a new password":mode==="signup"?"Create your Voxa account":mode==="forgot"?"Reset your password":"Welcome back";
  return <main className="auth-page"><button className="auth-back" onClick={onBack}>← Back to Voxa</button><section className="auth-card"><div className="auth-brand"><Logo/><span>Voxa</span></div><p className="eyebrow">SECURE ACCOUNT</p><h1>{title}</h1><p>{recovery?"Enter a new password for your account.":mode==="signup"?"Your communication data stays private to your account.":mode==="forgot"?"We'll send a reset link to your email.":"Log in to enter your communication space."}</p><form onSubmit={submit}>{mode==="signup"&&<label>Name<input type="text" autoComplete="name" required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}{!recovery&&<label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}{mode!=="forgot"&&<label>{recovery?"New password":"Password"}<input type="password" autoComplete={recovery||mode==="signup"?"new-password":"current-password"} required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label>}{(recovery||mode==="signup")&&<label>Confirm password<input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>}<button className="primary" disabled={busy}>{busy?"Please wait…":recovery?"Update password":mode==="signup"?"Create account":mode==="forgot"?"Send reset link":"Log in"}</button></form>{message&&<p className="auth-message" role="status">{message}</p>}{!recovery&&<div className="auth-links">{mode!=="login"&&<button onClick={()=>{setMode("login");setMessage("")}}>Log in</button>}{mode!=="signup"&&<button onClick={()=>{setMode("signup");setMessage("")}}>Create account</button>}{mode!=="forgot"&&<button onClick={()=>{setMode("forgot");setMessage("")}}>Forgot password?</button>}</div>}<small>Encrypted in transit. Voxa only loads data belonging to your account.</small></section></main>
}
function GuidedDemo({step,onExit,onReplay}:{step:number;onExit:()=>void;onReplay:()=>void}){
  const phrase="It's too loud and I'm feeling overwhelmed. Could I take a break?";
  return <main className="guided-demo">
    <header><span className="brand"><Logo/><span>Voxa</span></span><span className="demo-progress">Guided demo · {Math.min(step+1,6)} of 6</span><button onClick={onExit}>Exit demo <b>×</b></button></header>
    <section className="demo-stage">
      <div className="demo-intro"><p className="eyebrow">A MOMENT AT SCHOOL</p><h1>A student needs the room<br/>to feel a little quieter.</h1><p>Watch how a few intentional choices become a complete thought.</p></div>
      <div className="demo-workspace">
        <p className="eyebrow purple">THEY CHOOSE</p>
        <div className="guided-tiles">
          <div className={step>=1?"pressed":""}>😵<b>Overwhelmed</b>{step>=1&&<i>✓</i>}</div>
          <div className={step>=2?"pressed":""}>🔊<b>Too loud</b>{step>=2&&<i>✓</i>}</div>
          <div className={step>=3?"pressed":""}>☁️<b>Need a break</b>{step>=3&&<i>✓</i>}</div>
        </div>
        <button className={`demo-create ${step>=4?"pressed":""}`}>✦ Create message</button>
        <div className={`guided-message ${step>=4?"show":""}`}><p className="eyebrow mint">VOXA SUGGESTS</p><blockquote>“{phrase}”</blockquote><div className="guided-speak-row"><button className={step>=5?"speaking":""}>▶ {step>=5?"Speaking…":"Speak"}</button></div></div>
        <div className={`demo-cursor step-${step}`} aria-hidden><span/><i/></div>
      </div>
      {step>=5&&<div className="demo-finish"><b>A complete thought in a few taps.</b><button onClick={onReplay}>↻ Replay</button><button onClick={onExit}>Try Voxa →</button></div>}
    </section>
  </main>
}
function Landing({user,onEnter,onDemo}:{user:User|null;onEnter:()=>void;onDemo:()=>void}){return <main className="landing">
  <header className="landing-nav"><button className="brand"><Logo/><span>Voxa</span></button><nav><a href="#how">How it works</a><a href="#features">Features</a><a href="#about">About</a><a href="#privacy">Privacy</a></nav><button className="nav-cta" onClick={onEnter}>{user?"Open Voxa":"Log in"} →</button></header>
  <section className="hero"><div className="hero-copy"><span className="pill">● Communication, made clearer</span><h1>Find your<br/><em>words.</em></h1><p>Voxa helps people communicate through simple visual choices, personalized phrases, and intelligent language assistance.</p><div><button className="primary" onClick={onEnter}>{user?"Open Voxa":"Get started"} <span>→</span></button><button className="watch" onClick={onDemo}>▶ Watch demo</button></div><small>Private by default · Secure account required for the app</small></div>
    <div className="hero-demo"><div className="demo-top"><div><Logo/><span><b>Building a message</b><small>Tap what you mean</small></span></div><i>•••</i></div><p className="eyebrow purple">YOUR CHOICES</p><div className="demo-choices"><span>👤 <b>I</b><small>1</small></span><span>☝️ <b>want</b><small>2</small></span><span>💧 <b>water</b><small>3</small></span></div><div className="connector"><i/><b>✦</b><i/></div><div className="demo-message"><p className="eyebrow mint">VOXA SUGGESTS</p><h3>“Could I have some water, please?”</h3><button aria-label="Speak message">▶</button><small>You chose the meaning. Voxa helped with the words.</small></div></div>
  </section>
  <section className="trust"><span>A FEW TAPS.</span><b>A complete thought.</b><span>ALWAYS YOUR WORDS.</span></section>
  <section id="how" className="how"><p className="eyebrow">HOW IT WORKS</p><h2>From a thought to a message.</h2><p>Simple enough for the moment. Thoughtful enough for the person.</p><div>{[["01","Choose","Select what you want, need, feel, or want someone to know.","☝️"],["02","Voxa helps","Your selections become a clear, natural phrase—without changing your meaning.","✦"],["03","Communicate","Review it, change it, display it, or have Voxa say it aloud.","▶"]].map(x=><article key={x[0]}><small>{x[0]}</small><span>{x[3]}</span><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div><div className="flow"><span>Your choices</span><b>→</b><span className="voxa-flow"><Logo/> Voxa</span><b>→</b><span>Your message</span></div></section>
  <section id="features" className="features"><div><p className="eyebrow">BUILT AROUND YOU</p><h2>Your meaning.<br/>Your pace. <em>Your voice.</em></h2></div><div className="feature-grid">{[["♡","Meaning stays yours","Voxa translates intentional selections. It never guesses what you think or feel."],["⚡","Ready when words aren't","Quick phrases and urgent needs are always one tap away."],["◎","Made for real life","Large touch targets, clear contrast, and flexible profiles for every setting."],["⌂","Private by default","Core communication works offline and stays on your device."]].map(f=><article key={f[1]}><span>{f[0]}</span><h3>{f[1]}</h3><p>{f[2]}</p></article>)}</div></section>
  <section id="about" className="about"><Logo/><h2>Everyone deserves to be heard.</h2><p>Difficulty speaking shouldn't mean difficulty communicating. Voxa explores how visual communication and thoughtful language assistance can help turn a few intentional choices into complete thoughts—while keeping the person communicating in control.</p><button className="primary" onClick={onEnter}>Find your words →</button></section>
  <footer id="privacy"><div><span className="brand"><Logo/><span>Voxa</span></span><p>Find your words.</p></div><div><b>Privacy, plainly.</b><p>Your phrases, settings, and history are stored securely and isolated to your account. Voxa does not sell communication data.</p></div><small>Voxa is an assistive communication exploration and does not replace AAC devices, speech-language professionals, medical care, or accessibility professionals.</small></footer>
  </main>}
