"use client";

import { useEffect, useState } from "react";

type Style = "direct" | "natural" | "detailed";
type Item = { id: string; label: string; emoji: string; category: string; phrase?: string };
type SavedPhrase = { id: string; text: string; favorite: boolean };

const categories = [
  ["quick", "Quick", "⚡"], ["want", "I Want", "☝️"], ["needs", "I Need", "🤲"],
  ["feelings", "Feelings", "♡"], ["food", "Food", "🍽️"], ["drinks", "Drinks", "💧"],
  ["people", "People", "👥"], ["places", "Places", "⌂"], ["activities", "Activities", "✦"],
  ["questions", "Questions", "?"], ["responses", "Responses", "↩"], ["help", "Help", "＋"],
  ["favorites", "Favorites", "★"], ["custom", "Custom", "✎"],
];

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

const starters: SavedPhrase[] = [
  {id:"p1",text:"Can I have my headphones, please?",favorite:true},
  {id:"p2",text:"I need some time alone.",favorite:true},
  {id:"p3",text:"I'm not ready yet.",favorite:false},
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

export default function Home() {
  const [entered,setEntered]=useState(false); const [page,setPage]=useState("Communicate");
  const [category,setCategory]=useState("quick"); const [selected,setSelected]=useState<Item[]>([]);
  const [message,setMessage]=useState(""); const [editing,setEditing]=useState(false); const [speaking,setSpeaking]=useState(false);
  const [style,setStyle]=useLocal<Style>("voxa-style","natural"); const [phrases,setPhrases]=useLocal<SavedPhrase[]>("voxa-phrases",starters);
  const [history,setHistory]=useLocal<{time:string;text:string}[]>("voxa-history",[{time:"10:42 AM",text:"Could I have some water, please?"},{time:"10:38 AM",text:"It's too loud in here."}]);
  const [profile,setProfile]=useLocal("voxa-profile","Alex"); const [icons,setIcons]=useLocal("voxa-icons",true);
  const [animations,setAnimations]=useLocal("voxa-animations",true); const [buttonSize,setButtonSize]=useLocal("voxa-size","large");
  const [partner,setPartner]=useState("What would you like for lunch?"); const [customName,setCustomName]=useState("");
  const [custom,setCustom]=useLocal<Item[]>("voxa-custom",[]); const [demo,setDemo]=useState(false); const [demoStep,setDemoStep]=useState(0);
  const [source,setSource]=useState<"local"|"gemini">("local");
  const allData=[...data,...custom];
  const grid=category==="favorites"?allData.filter(i=>["water-drink","need-break","headphones"].includes(i.id)):allData.filter(i=>i.category===category);

  function choose(item:Item){
    if(item.phrase && ["quick","questions","responses","help"].includes(item.category)){setMessage(item.phrase);setSelected([item]);return;}
    setSelected(s=>s.some(x=>x.id===item.id)?s.filter(x=>x.id!==item.id):[...s,item]);
  }
  async function create(){
    const fallback=generateCommunicationPhrase(selected,style); setEditing(false);
    try{const response=await fetch("/api/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({selections:selected.map(({id,label,category})=>({id,label,category})),style})});if(!response.ok)throw new Error();const body=await response.json();const phrase=typeof body.phrase==="string"?body.phrase.trim():"";if(!phrase||phrase.length>280||/[{}\[\]]/.test(phrase)||/\b(id|label|category|json)\b\s*[:=]/i.test(phrase))throw new Error();setMessage(phrase);setSource("gemini");}
    catch{setMessage(fallback);setSource("local");}
  }
  function speak(text=message){if(!text||typeof window==="undefined")return; window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.onstart=()=>setSpeaking(true);u.onend=()=>setSpeaking(false);window.speechSynthesis.speak(u);setHistory(h=>[{time:new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}),text},...h].slice(0,30));}
  function save(){if(!message)return;setPhrases(p=>[{id:crypto.randomUUID(),text:message,favorite:false},...p]);}
  function clear(){setSelected([]);setMessage("");}
  function startDemo(){setEntered(true);setDemo(true);setDemoStep(0)}
  function exitDemo(){window.speechSynthesis?.cancel();setDemo(false);setDemoStep(0);setPage("Communicate")}
  useEffect(()=>{
    if(!demo)return;
    const timers=[700,1750,2800,3850,5000].map((delay,index)=>window.setTimeout(()=>setDemoStep(index+1),delay));
    const speakTimer=window.setTimeout(()=>{if("speechSynthesis" in window){window.speechSynthesis.cancel();window.speechSynthesis.speak(new SpeechSynthesisUtterance("It's too loud and I'm feeling overwhelmed. Could I take a break?"));}},5250);
    return()=>{timers.forEach(clearTimeout);clearTimeout(speakTimer)};
  },[demo]);

  if(!entered) return <Landing onEnter={()=>setEntered(true)} onDemo={startDemo}/>;
  if(demo) return <GuidedDemo step={demoStep} onExit={exitDemo} onReplay={()=>{setDemoStep(0);setDemo(false);setTimeout(()=>setDemo(true),30)}}/>;
  return <main className={`app ${animations?"":"no-motion"}`}>
    <header className="topbar">
      <button className="brand" onClick={()=>setEntered(false)} aria-label="Voxa home"><Logo/> <span>Voxa</span></button>
      <nav className="desktop-nav" aria-label="Main navigation">{["Communicate","Conversation","My Phrases","Routines","History","Customize","Patterns","Settings"].map(n=><button key={n} className={page===n?"active":""} onClick={()=>setPage(n)}>{n}</button>)}</nav>
      <div className="top-actions"><span className="private"><i/> Private Mode</span><select aria-label="Profile" value={profile} onChange={e=>setProfile(e.target.value)}><option>Alex</option><option>Maya</option></select></div>
    </header>
    <nav className="mobile-nav" aria-label="Mobile navigation">{["Communicate","Conversation","My Phrases","Settings"].map(n=><button key={n} className={page===n?"active":""} onClick={()=>setPage(n)}>{n.replace("My Phrases","Phrases")}</button>)}</nav>
    {page==="Communicate"&&<div className="communicate">
      <aside className="categories"><p className="eyebrow">COMMUNICATE</p><h2>What do you want to say?</h2>{categories.map(([id,label,emoji])=><button key={id} className={category===id?"selected-cat":""} onClick={()=>setCategory(id)}><span>{emoji}</span>{label}</button>)}<button className="demo-mini" onClick={startDemo}>▶ Demo Mode</button></aside>
      <section className="board">
        <div className="board-head"><div><p className="eyebrow">{categories.find(c=>c[0]===category)?.[1]}</p><h1>{category==="feelings"?"How are you feeling?":category==="quick"?"Say it quickly":"Choose what you mean"}</h1><p>{category==="feelings"?"Select a feeling, then add what you need.":"Tap a card to add it to your choices."}</p></div><span className="count">{grid.length} choices</span></div>
        <div className={`card-grid size-${buttonSize}`}>{grid.map(item=><button key={item.id} className={`comm-card ${selected.some(s=>s.id===item.id)?"chosen":""}`} onClick={()=>choose(item)} aria-pressed={selected.some(s=>s.id===item.id)}>{selected.some(s=>s.id===item.id)&&<b className="check">✓</b>}{icons&&<span className="emoji">{item.emoji}</span>}<strong>{item.label}</strong>{item.category==="help"&&<small>Quick access</small>}</button>)}</div>
        {grid.length===0&&<Empty title="No favorites yet." text="Favorite the things you use most to keep them close."/>}
      </section>
      <aside className="message-panel">
        <div className="choices-label"><p className="eyebrow purple">YOU CHOSE</p><span>{selected.length} selected</span></div>
        <div className="chips">{selected.length?selected.map(i=><button key={i.id} onClick={()=>setSelected(s=>s.filter(x=>x.id!==i.id))}>{i.emoji} {i.label} <b>×</b></button>):<p>Your choices will appear here.</p>}</div>
        <div className="style-row"><span>Communication style</span><select value={style} onChange={e=>setStyle(e.target.value as Style)}><option value="direct">Direct</option><option value="natural">Natural</option><option value="detailed">Detailed</option></select></div>
        <button className="primary create" disabled={!selected.length} onClick={create}>✦ Create message</button>
        <div className={`suggestion ${message?"ready":""}`}><div className="suggest-head"><p className="eyebrow mint">VOXA SUGGESTS</p><span>{source==="gemini"?"Language assistance":"Private · on-device"}</span></div>{editing?<textarea autoFocus value={message} onChange={e=>setMessage(e.target.value)}/>:<p className="suggested">{message||"Your natural-language message will appear here."}</p>}</div>
        <div className={`wave ${speaking?"playing":""}`} aria-hidden>{[1,2,3,4,5,6,7,8,9].map(n=><i key={n}/>)}</div>
        <div className="message-actions"><button className="speak" disabled={!message} onClick={()=>speaking?(window.speechSynthesis.cancel(),setSpeaking(false)):speak()}>{speaking?"■ Stop":"▶ Speak"}</button><button disabled={!message} onClick={()=>setEditing(!editing)}>✎ Edit</button><button disabled={!message} onClick={create}>↻ Another</button><button disabled={!message} onClick={save}>♡ Save</button></div>
        <button className="clear" onClick={clear}>Clear everything</button>
        <div className="principle"><b>🔒 You’re in control</b><p>Voxa only uses the choices you select. It never guesses what you mean.</p></div>
      </aside>
    </div>}
    {page==="Conversation"&&<Page title="Conversation" sub="Take turns while keeping every message visible."><div className="conversation"><div className="bubble partner"><b>Conversation Partner</b><p>{partner}</p></div>{message&&<div className="bubble me"><b>Me</b><p>{message}</p><button onClick={()=>speak(message)}>▶ Speak</button></div>}<label>Partner's message<textarea value={partner} onChange={e=>setPartner(e.target.value)}/></label><div className="suggestion-buttons"><b>Useful responses</b>{(/hungry|lunch|eat/i.test(partner)?["Food","Yes","No","I don't know"]:["Yes","No","I don't know","Give me a moment"]).map(x=><button key={x} onClick={()=>{setMessage(x+(/[?.!]$/.test(x)?"":"."));}}>{x}</button>)}</div><button className="primary" onClick={()=>{setPage("Communicate");setCategory("food")}}>Open visual choices</button></div></Page>}
    {page==="My Phrases"&&<Page title="My Phrases" sub="Things you say often, always close by."><div className="phrase-list">{phrases.length?phrases.map(p=><article key={p.id}><button className="favorite" aria-label="Favorite" onClick={()=>setPhrases(x=>x.map(q=>q.id===p.id?{...q,favorite:!q.favorite}:q))}>{p.favorite?"★":"☆"}</button><p>{p.text}</p><div><button onClick={()=>speak(p.text)}>▶ Speak</button><button onClick={()=>{setMessage(p.text);setPage("Communicate")}}>Reuse</button><button onClick={()=>setPhrases(x=>x.filter(q=>q.id!==p.id))}>Delete</button></div></article>):<Empty title="Your phrases will appear here." text="Save things you say often so they're always close by."/>}</div></Page>}
    {page==="Routines"&&<Page title="Routines" sub="Ready-made sequences for moments you communicate through often."><div className="routine-grid">{[["School Morning","I need breakfast.","I need my backpack.","I'm ready to leave."],["Restaurant","I would like…","Yes, please.","No, thank you.","I'm finished."],["Wind Down","I need quiet.","I want my headphones.","I'm ready to rest."]].map((r,i)=><article key={r[0]}><span>{["🎒","🍽️","☾"][i]}</span><h3>{r[0]}</h3><ol>{r.slice(1).map(x=><li key={x}>{x}</li>)}</ol><button>Start routine →</button></article>)}</div></Page>}
    {page==="History"&&<Page title="History" sub="Recently communicated on this device."><button className="outline danger" onClick={()=>setHistory([])}>Clear history</button><div className="history">{history.length?history.map((h,i)=><article key={i}><time>{h.time}</time><p>{h.text}</p><button onClick={()=>speak(h.text)}>▶ Speak again</button><button onClick={()=>{setMessage(h.text);setPage("Communicate")}}>Reuse</button></article>):<Empty title="Nothing here yet." text="Messages you communicate will appear here."/>}</div></Page>}
    {page==="Customize"&&<Page title="Customize Voxa" sub="Make communication feel like yours."><div className="customize"><form onSubmit={e=>{e.preventDefault();if(!customName)return;setCustom(x=>[...x,{id:crypto.randomUUID(),label:customName,emoji:"✨",category:"custom"}]);setCustomName("")}}><h3>Create a communication button</h3><label>Name<input value={customName} onChange={e=>setCustomName(e.target.value)} placeholder="Headphones"/></label><label>Icon / emoji<input defaultValue="🎧"/></label><label>Phrase<input placeholder="Can I have my headphones, please?"/></label><button className="primary">Add button</button></form><div><h3>Manage your experience</h3>{["Create a category","Reorder categories","Manage favorites","Hide a category","Create a routine"].map(x=><button className="manage" key={x}>{x}<span>→</span></button>)}</div></div></Page>}
    {page==="Patterns"&&<Page title="Communication Patterns" sub="Simple usage patterns—not medical or diagnostic conclusions."><div className="stats"><article><span>42</span><p>Messages this week</p></article><article><span>Quick</span><p>Most used category</p></article><article><span>8</span><p>Saved phrases</p></article></div><div className="patterns"><article><h3>Most used phrases</h3>{["I need a break","Can I have water?","It's too loud"].map((x,i)=><p key={x}><b>{i+1}</b>{x}</p>)}</article><article><h3>Communication activity</h3><div className="bars">{[35,55,42,75,62,88,50].map((h,i)=><i key={i} style={{height:h+"%"}}><span>{"MTWTFSS"[i]}</span></i>)}</div></article></div><p className="notice">Voxa shows communication usage patterns only. It does not provide medical or diagnostic conclusions.</p></Page>}
    {page==="Settings"&&<Page title="Settings" sub="Choose how Voxa looks, feels, and speaks."><div className="settings"><Setting title="Communication style" desc="How Voxa phrases your choices"><select value={style} onChange={e=>setStyle(e.target.value as Style)}><option value="direct">Direct</option><option value="natural">Natural</option><option value="detailed">Detailed</option></select></Setting><Setting title="Button size" desc="Adjust visual communication cards"><select value={buttonSize} onChange={e=>setButtonSize(e.target.value)}><option>standard</option><option>large</option><option>extra-large</option></select></Setting><Setting title="Text to speech" desc="Allow Voxa to read messages aloud"><Toggle value={true}/></Setting><Setting title="Auto Speak" desc="Speak after generation (off by default)"><Toggle value={false}/></Setting><Setting title="Show icons" desc="Display icons alongside text"><Toggle value={icons} set={setIcons}/></Setting><Setting title="Animations" desc="Use subtle interface movement"><Toggle value={animations} set={setAnimations}/></Setting></div><p className="notice">Voxa will never speak until you press Speak unless you intentionally turn on Auto Speak.</p></Page>}
  </main>
}

function Logo(){return <span className="logo" aria-hidden><i/><i/><i/></span>}
function Page({title,sub,children}:{title:string;sub:string;children:React.ReactNode}){return <section className="page"><p className="eyebrow">VOXA</p><h1>{title}</h1><p className="page-sub">{sub}</p>{children}</section>}
function Empty({title,text}:{title:string;text:string}){return <div className="empty"><span>○</span><h3>{title}</h3><p>{text}</p></div>}
function Setting({title,desc,children}:{title:string;desc:string;children:React.ReactNode}){return <div className="setting"><div><b>{title}</b><p>{desc}</p></div>{children}</div>}
function Toggle({value,set}:{value:boolean;set?:(v:boolean)=>void}){return <button role="switch" aria-checked={value} className={`toggle ${value?"on":""}`} onClick={()=>set?.(!value)}><i/></button>}
function GuidedDemo({step,onExit,onReplay}:{step:number;onExit:()=>void;onReplay:()=>void}){
  const phrase="It's too loud and I'm feeling overwhelmed. Could I take a break?";
  return <main className="guided-demo">
    <header><span className="brand"><Logo/><span>Voxa</span></span><span className="demo-progress">Guided demo · {Math.min(step+1,6)} of 6</span><button onClick={onExit}>Exit demo <b>×</b></button></header>
    <section className="demo-stage">
      <div className="demo-intro"><p className="eyebrow">A MOMENT AT SCHOOL</p><h1>Alex needs the room<br/>to feel a little quieter.</h1><p>Watch how a few intentional choices become a complete thought.</p></div>
      <div className="demo-workspace">
        <p className="eyebrow purple">ALEX CHOOSES</p>
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
function Landing({onEnter,onDemo}:{onEnter:()=>void;onDemo:()=>void}){return <main className="landing">
  <header className="landing-nav"><button className="brand"><Logo/><span>Voxa</span></button><nav><a href="#how">How it works</a><a href="#features">Features</a><a href="#about">About</a><a href="#privacy">Privacy</a></nav><button className="nav-cta" onClick={onEnter}>Try Voxa →</button></header>
  <section className="hero"><div className="hero-copy"><span className="pill">● Communication, made clearer</span><h1>Find your<br/><em>words.</em></h1><p>Voxa helps people communicate through simple visual choices, personalized phrases, and intelligent language assistance.</p><div><button className="primary" onClick={onEnter}>Try Voxa <span>→</span></button><button className="watch" onClick={onDemo}>▶ Watch demo</button></div><small>Private by default · No account required</small></div>
    <div className="hero-demo"><div className="demo-top"><div><Logo/><span><b>Building a message</b><small>Tap what you mean</small></span></div><i>•••</i></div><p className="eyebrow purple">YOUR CHOICES</p><div className="demo-choices"><span>👤 <b>I</b><small>1</small></span><span>☝️ <b>want</b><small>2</small></span><span>💧 <b>water</b><small>3</small></span></div><div className="connector"><i/><b>✦</b><i/></div><div className="demo-message"><p className="eyebrow mint">VOXA SUGGESTS</p><h3>“Could I have some water, please?”</h3><button aria-label="Speak message">▶</button><small>You chose the meaning. Voxa helped with the words.</small></div></div>
  </section>
  <section className="trust"><span>A FEW TAPS.</span><b>A complete thought.</b><span>ALWAYS YOUR WORDS.</span></section>
  <section id="how" className="how"><p className="eyebrow">HOW IT WORKS</p><h2>From a thought to a message.</h2><p>Simple enough for the moment. Thoughtful enough for the person.</p><div>{[["01","Choose","Select what you want, need, feel, or want someone to know.","☝️"],["02","Voxa helps","Your selections become a clear, natural phrase—without changing your meaning.","✦"],["03","Communicate","Review it, change it, display it, or have Voxa say it aloud.","▶"]].map(x=><article key={x[0]}><small>{x[0]}</small><span>{x[3]}</span><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div><div className="flow"><span>Your choices</span><b>→</b><span className="voxa-flow"><Logo/> Voxa</span><b>→</b><span>Your message</span></div></section>
  <section id="features" className="features"><div><p className="eyebrow">BUILT AROUND YOU</p><h2>Your meaning.<br/>Your pace. <em>Your voice.</em></h2></div><div className="feature-grid">{[["♡","Meaning stays yours","Voxa translates intentional selections. It never guesses what you think or feel."],["⚡","Ready when words aren't","Quick phrases and urgent needs are always one tap away."],["◎","Made for real life","Large touch targets, clear contrast, and flexible profiles for every setting."],["⌂","Private by default","Core communication works offline and stays on your device."]].map(f=><article key={f[1]}><span>{f[0]}</span><h3>{f[1]}</h3><p>{f[2]}</p></article>)}</div></section>
  <section id="about" className="about"><Logo/><h2>Everyone deserves to be heard.</h2><p>Difficulty speaking shouldn't mean difficulty communicating. Voxa explores how visual communication and thoughtful language assistance can help turn a few intentional choices into complete thoughts—while keeping the person communicating in control.</p><button className="primary" onClick={onEnter}>Find your words →</button></section>
  <footer id="privacy"><div><span className="brand"><Logo/><span>Voxa</span></span><p>Find your words.</p></div><div><b>Privacy, plainly.</b><p>No account required. Phrases, settings, and history stay on this device in Private Mode. Voxa does not sell communication data.</p></div><small>Voxa is an assistive communication exploration and does not replace AAC devices, speech-language professionals, medical care, or accessibility professionals.</small></footer>
  </main>}
