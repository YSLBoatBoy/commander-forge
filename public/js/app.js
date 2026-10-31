(function(){
"use strict";
// ================= reference data =================
const GAME_CHANGERS = ["Ad Nauseam","Ancient Tomb","Aura Shards","Biorhythm","Bolas's Citadel","Braids, Cabal Minion","Chrome Mox","Coalition Victory","Consecrated Sphinx","Crop Rotation","Cyclonic Rift","Demonic Tutor","Drannith Magistrate","Enlightened Tutor","Farewell","Field of the Dead","Fierce Guardianship","Force of Will","Gaea's Cradle","Gamble","Gifts Ungiven","Glacial Chasm","Grand Arbiter Augustin IV","Grim Monolith","Humility","Imperial Seal","Intuition","Jeska's Will","Lion's Eye Diamond","Mana Vault","Mishra's Workshop","Mox Diamond","Mystical Tutor","Narset, Parter of Veils","Natural Order","Necropotence","Notion Thief","Opposition Agent","Orcish Bowmasters","Panoptic Mirror","Rhystic Study","Seedborn Muse","Serra's Sanctum","Smothering Tithe","Survival of the Fittest","Teferi's Protection","Tergrid, God of Fright","Thassa's Oracle","The One Ring","The Tabernacle at Pendrell Vale","Underworld Breach","Vampiric Tutor","Worldly Tutor"];
const GC = new Set(GAME_CHANGERS.map(s=>s.toLowerCase()));
const BRACKETS = {
  1:{name:"Exhibition",gc:0,mld:false,combo:false,xturn:"none",text:"Ultra-casual and theme-first. No Game Changers, no mass land denial, no extra-turn cards, no two-card infinite combos."},
  2:{name:"Core",gc:0,mld:false,combo:false,xturn:"few",text:"Precon-level power. No Game Changers, no mass land denial, no two-card infinite combos, and extra turns only in small, non-chaining doses."},
  3:{name:"Upgraded",gc:3,mld:false,combo:"late",xturn:"few",text:"Tuned, synergistic decks. Up to 3 Game Changers. No mass land denial, no chained extra turns, and two-card infinite combos only as late-game finishers (not before turn 6)."},
  4:{name:"Optimized",gc:Infinity,mld:true,combo:true,xturn:"any",text:"High power. Anything legal goes; only the banned list applies."},
  5:{name:"cEDH",gc:Infinity,mld:true,combo:true,xturn:"any",text:"Competitive. Built for a tournament metagame, anything legal goes."}
};
const CATS = [{id:"payoff",name:"Payoffs & finishers"},{id:"engine",name:"Synergy & engine"},{id:"ramp",name:"Ramp"},{id:"draw",name:"Card advantage"},{id:"removal",name:"Removal & interaction"},{id:"wipe",name:"Board wipes"},{id:"protection",name:"Protection"},{id:"land",name:"Lands"}];
const CATNAME = Object.fromEntries(CATS.map(c=>[c.id,c.name]));
const ARCH_CAT = {payoff:"Finisher",engine:"Synergy",ramp:"Ramp",draw:"Draw",removal:"Removal",wipe:"Board Wipe",protection:"Protection",land:"Land"};
const ARCH_IN = [["finisher|win|payoff|threat|bomb","payoff"],["ramp|mana|rock","ramp"],["draw|card advantage|advantage","draw"],["wipe|sweeper|board","wipe"],["removal|interaction|counter","removal"],["protect","protection"],["land","land"]];
const BASIC = {W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"};
const BASIC_NAMES = /^(snow-covered )?(plains|island|swamp|mountain|forest|wastes)$/i;
const TARGETS = {ramp:10,draw:10,removal:8,wipe:3,protection:3};

// ================= example (Yennett) =================
function C(n,c,mv,s,usd,w,extra){ return Object.assign({n,c,mv,s,usd,w,f:[],sel:true,o:"rec"},extra||{}); }
function A(n,usd,mv,w){ return {n,usd,mv,w}; }
const EXAMPLE = {
  example:true, mode:"new", query:"Yennett, Cryptic Sovereign",
  commanders:[{name:"Yennett, Cryptic Sovereign",manaCost:"{2}{W}{U}{B}",type:"Legendary Creature — Sphinx",text:"Flying, menace. 3/5.\nWhenever Yennett attacks, reveal the top card of your library. If its mana value is odd, you may cast it without paying its mana cost. Otherwise, draw a card."}],
  colors:["W","U","B"], legal:true,
  overview:"Yennett turns every attack into a free spell or a free card. Stack odd-mana-value bombs on top of your library and swing; when you whiff on an even card, you still draw.",
  gameplans:[
    {id:"topdeck",name:"Topdeck",decks:397,pitch:"Arrange the top of your library with Top, Scroll Rack and scry, then let Yennett cast 7- and 9-drops for free.",mechanics:["top-deck control","odd mana values","big spells"],keyCards:["Sensei's Divining Top","Expropriate","Scroll Rack"]},
    {id:"control",name:"Control",decks:138,pitch:"Answer everything, then win with a hard-to-remove flier and free bombs off the top.",mechanics:["counterspells","wipes"],keyCards:["Supreme Verdict","Counterspell","Approach of the Second Sun"]},
    {id:"reanimator",name:"Reanimator",decks:42,pitch:"Fill the graveyard and cast Living Death or Rise of the Dark Realms for free.",mechanics:["graveyard","mass reanimation"],keyCards:["Living Death","Rise of the Dark Realms","Kokusho, the Evening Star"]},
    {id:"theft",name:"Theft",decks:40,pitch:"Free-cast steal effects to take over opponents' best permanents.",mechanics:["steal","clones"],keyCards:["Expropriate","Blatant Thievery","Agent of Treachery"]}
  ],
  chosen:["topdeck"], custom:"", bracket:3, budget:500, must:"", avoid:"",
  plan:{summary:"A top-deck control deck: cheap cantrips and artifacts set the top card, removal keeps Yennett swinging, and every attack casts a 7- or 9-mana bomb for free. About half the nonland cards are odd so even blind reveals pay off often.",
    steps:["Play rocks and cantrips, hold removal for anything that blocks a 3/5 flier.","Land Yennett turn 4–5, protect it with boots or Greaves, and start every turn by setting up the top card.","Free-cast Expropriate, Clone Legion or Approach off the top; Living Death resets a board you've lost."],
    mulligan:"Keep hands with 3+ lands and a rock or cantrip. Ship hands of only expensive bombs.",
    winCons:["Approach of the Second Sun cast twice","Expropriate / Blatant Thievery taking over the board","Commander damage from an evasive 3/5 with menace"],
    risks:"Yennett dies easily to targeted removal; keep a protection piece and don't overextend into wipes.",
    lands:38, weights:{W:.32,U:.36,B:.32}},
  cards:[
    C("Approach of the Second Sun","payoff",7,10,2,"The deck's cleanest win. At 7 it's odd, so Yennett can cast it free; Approach then tucks itself 7th from the top, and Brainstorm, Scroll Rack or Top bring it right back for the second, game-winning cast."),
    C("Expropriate","payoff",9,10,8,"Nine mana is a non-issue when Yennett casts it free. Opponents almost always vote to give you extra turns or their best permanents, and either outcome snowballs your next attack.",{dn:A("Clone Legion",.5,9,"Also 9 MV; copies a whole board")}),
    C("Blatant Thievery","payoff",7,9,2,"Steals the best permanent from every opponent at once. At 7 mana it's odd and a perfect free-cast target to stack with Top or Scroll Rack."),
    C("Clone Legion","payoff",9,8,.5,"An odd 9-drop that copies an opponent's entire creature board. Free off Yennett, it often turns a losing board into a lethal one."),
    C("Mind's Dilation","payoff",7,8,3,"Once it's in play, each opponent's first spell each turn gets exiled and you cast it free. A 7-drop Yennett can drop for nothing, giving you a second free-spell engine."),
    C("Rise of the Dark Realms","payoff",9,8,1,"Reanimates every creature from every graveyard under your control. Odd, so it's a free cast late game when graveyards are full of bombs."),
    C("Living Death","payoff",5,8,10,"A reset button that returns your discarded or killed odd creatures (Kokusho, Elesh Norn) while wiping the board. Cheap enough to hard-cast too."),
    C("Ad Nauseam","payoff",5,7,15,"Odd at 5. Cast free off Yennett, it refills your hand with a dozen cards. The deck's high curve hurts on life, so stop early.",{f:["gc"]}),
    C("Elesh Norn, Grand Cenobite","payoff",7,8,30,"An odd 7-drop that shrinks every opposing creature by 2/2 and pumps Yennett to 5/7. Free off the top, it often wipes tokens on arrival.",{dn:A("Archon of Emeria",.5,3,"Cheap tax effect; much weaker")}),
    C("Kokusho, the Evening Star","payoff",7,7,3,"Odd 7 flier that drains each opponent for 5 when it dies, and it's even better returned by Living Death or Rise of the Dark Realms."),
    C("Sepulchral Primordial","payoff",7,7,1,"Odd 7-drop that steals one creature from each opponent's graveyard. Huge swing for zero mana when Yennett reveals it."),
    C("Agent of Treachery","payoff",7,7,3,"Odd 7 that steals a permanent on entry. With Clone Legion or Rise of the Dark Realms it steals several."),
    C("Hullbreaker Horror","payoff",7,6,4,"Odd 7 that can't be countered and turns every spell you cast into a bounce. Protects your free casts from interaction."),
    C("Liliana, Death's Majesty","payoff",5,6,3,"Odd 5 planeswalker that makes zombies and reanimates a creature each turn, giving value even when Yennett is blocked off."),
    C("Archon of Coronation","payoff",5,6,2,"Odd 5 flier that makes you the monarch and keeps damage off your life total while you hold the crown. Draws extra cards alongside Yennett."),
    C("Sensei's Divining Top","engine",1,10,1.5,"The best Yennett enabler: on each attack you dig three deep and set an odd bomb on top before the trigger reveals it. Odd at 1 too."),
    C("Scroll Rack","engine",2,9,25,"Puts any cards from your hand on top of your library. Stash Expropriate or Approach in hand, rack it to the top, then swing.",{dn:A("Brainstone",.5,1,"Brainstorm on an artifact; one shot")}),
    C("Brainstorm","engine",1,9,1,"Draws three, then puts two back on top, letting you choose exactly what Yennett reveals. Also resets Approach after the first cast."),
    C("Ponder","engine",1,8,2,"Looks at the top three and reorders them, so you set the next Yennett reveal for one mana. Odd and cheap."),
    C("Preordain","engine",1,7,1,"Scry 2 then draw. Clears even cards off the top or keeps an odd bomb there for the attack."),
    C("Opt","engine",1,6,.2,"Instant-speed scry 1 at the end of an opponent's turn, right before your Yennett attack."),
    C("Thassa, God of the Sea","engine",3,8,2,"Scry 1 every upkeep, for free. A constant filter that keeps the top card odd. It can also make Yennett unblockable."),
    C("Search for Azcanta","engine",2,7,3,"Surveil 1 each upkeep, then flips into a land that digs for instants and sorceries. Steady top-deck control."),
    C("Faerie Seer","engine",1,6,.5,"One-mana flier that scrys 2 on entry. Sets up the first Yennett attack and chumps early."),
    C("Sol Ring","ramp",1,10,1.5,"Odd, colorless, and turn-one fast. Gets Yennett down a full turn early."),
    C("Arcane Signet","ramp",2,9,.5,"Taps for any of your three colors; the simplest fixing rock in a three-color deck."),
    C("Talisman of Dominance","ramp",2,8,1,"Untapped U/B fixing for two that ramps into Yennett on turn four."),
    C("Talisman of Hierarchy","ramp",2,8,1,"Untapped W/B fixing; covers your two non-blue colors."),
    C("Talisman of Progress","ramp",2,8,1,"Untapped W/U fixing for two."),
    C("Fellwar Stone","ramp",2,7,1,"Usually taps for at least two of your colors in multiplayer."),
    C("Mind Stone","ramp",2,6,.5,"Ramps early, then cashes in for a card when the curve tops out."),
    C("Thought Vessel","ramp",2,6,1.5,"Ramp plus no maximum hand size, useful after Ad Nauseam."),
    C("Commander's Sphere","ramp",3,6,.3,"Odd rock that taps for any color and cashes in for a card later."),
    C("Chromatic Lantern","ramp",3,7,4,"Odd rock that fixes every land for all three colors."),
    C("Smothering Tithe","ramp",4,8,15,"Opponents either pay up or hand you treasure, which funds hard-casting your bombs when Yennett is blocked off.",{f:["gc"],dn:A("Wayfarer's Bauble",.5,1,"Basic land ramp, no upside")}),
    C("Rhystic Study","draw",3,9,35,"The best card draw in Commander. Odd at 3, so it's a free reveal too, and the extra cards fuel Scroll Rack.",{f:["gc"],dn:A("Mystic Remora",6,1,"Cheaper, short-lived taxing draw")}),
    C("Esper Sentinel","draw",1,7,15,"Taxes opponents' noncreature spells early. Odd, and it chips in cards while you set up.",{dn:A("Faerie Mastermind",3,2,"Draws off opponents' extra cards")}),
    C("Phyrexian Arena","draw",3,8,3,"An extra card every turn on top of Yennett's draws. Odd at 3.",{up:A("Necropotence",30,3,"Game Changer, far more cards")}),
    C("Dark Confidant","draw",2,7,3,"Reveals and draws an extra card each upkeep. The high curve costs life, so keep an eye on it."),
    C("Read the Bones","draw",3,6,.3,"Scry 2, draw 2: card advantage that also sets up the next reveal."),
    C("Painful Truths","draw",3,6,1,"Draws three cards for three mana in a three-color deck."),
    C("Mulldrifter","draw",5,6,.3,"Odd 5 that draws two on entry, a solid free cast or an evoke for two."),
    C("Fact or Fiction","draw",4,6,1,"Instant-speed card advantage at end of turn."),
    C("Night's Whisper","draw",2,5,1,"Cheap two-card draw early in the game."),
    C("Future Sight","draw",5,7,1,"Odd 5 that lets you play the top card of your library, so even reveals become castable too.",{up:A("Bolas's Citadel",12,6,"Game Changer; cast off the top with life")}),
    C("Swords to Plowshares","removal",1,9,2,"One-mana answer to anything that can block a flier with menace."),
    C("Path to Exile","removal",1,8,3,"Another one-mana creature answer, odd and cheap."),
    C("Anguished Unmaking","removal",3,8,1,"Exiles any nonland permanent. Odd at 3."),
    C("Vindicate","removal",3,8,2,"Destroys any permanent, including lands. Odd sorcery at 3."),
    C("Mortify","removal",3,7,.5,"Instant creature or enchantment removal. Odd at 3."),
    C("Generous Gift","removal",3,7,2,"Instant answer to any permanent. Odd at 3."),
    C("Counterspell","removal",2,7,1,"Protects your bombs and Yennett from a key answer.",{up:A("Fierce Guardianship",40,3,"Game Changer; free with Yennett out")}),
    C("Arcane Denial","removal",2,6,1,"Cheap counter that rarely hurts you in multiplayer."),
    C("Despark","removal",2,6,.5,"Two-mana exile for the big threats your opponents ramp into."),
    C("Toxic Deluge","wipe",3,8,15,"Flexible wipe that can leave Yennett's 5 toughness alive. Odd at 3.",{dn:A("Crux of Fate",2,5,"Odd 5 wipe; can't spare Yennett")}),
    C("Damnation","wipe",4,7,20,"Clean four-mana wipe; cast it before Yennett lands.",{dn:A("Extinction Event",3,5,"Odd 5 exile wipe by even/odd")}),
    C("Supreme Verdict","wipe",4,7,4,"Uncounterable wipe that backstops a slow control game."),
    C("Merciless Eviction","wipe",6,6,1,"Exiles a whole permanent type, so it can hit planeswalkers or artifacts too."),
    C("Lightning Greaves","protection",2,8,2,"Haste and shroud, so Yennett attacks the turn it lands."),
    C("Swiftfoot Boots","protection",2,7,2,"Hexproof and haste protect your commander through spot removal."),
    C("Flawless Maneuver","protection",3,6,5,"Free when you control your commander. Gives everything indestructible."),
    C("Teferi's Protection","protection",3,7,25,"The strongest protection spell, but it would be a 4th Game Changer here.",{f:["gc"],sel:false}),
    C("Bolas's Citadel","draw",6,7,12,"Plays the top card with life. Alternate engine if you swap out a Game Changer.",{f:["gc"],sel:false}),
    C("Brainstone","engine",1,5,.5,"One-shot Brainstorm on an artifact.",{sel:false}),
    C("Austere Command","wipe",6,5,4,"Modal wipe; can spare artifacts and enchantments.",{sel:false}),
    C("Command Tower","land",0,9,.3,"Taps for all three colors with no drawback."),
    C("Exotic Orchard","land",0,7,.5,"Usually taps for all three of your colors in multiplayer."),
    C("Mystic Sanctuary","land",0,9,.5,"Puts an instant or sorcery from your graveyard on top of your library. Re-stacks Approach or Expropriate for Yennett."),
    C("Watery Grave","land",0,7,20,"U/B dual that enters untapped.",{dn:A("Sunken Hollow",1.5,0,"Untapped with basic; cheaper")}),
    C("Godless Shrine","land",0,7,15,"W/B dual that enters untapped.",{dn:A("Shineshadow Snarl",2,0,"Untapped if you reveal a type")}),
    C("Hallowed Fountain","land",0,7,15,"W/U dual that enters untapped.",{dn:A("Port Town",1,0,"Untapped if you reveal a type")}),
    C("Underground River","land",0,6,1,"U/B painland, always untapped."),
    C("Caves of Koilos","land",0,6,1,"W/B painland, always untapped."),
    C("Adarkar Wastes","land",0,6,1,"W/U painland, always untapped."),
    C("Drowned Catacomb","land",0,6,4,"U/B checkland."),
    C("Isolated Chapel","land",0,6,4,"W/B checkland."),
    C("Glacial Fortress","land",0,6,3,"W/U checkland."),
    C("Fetid Pools","land",0,5,1,"U/B land that cycles away late game."),
    C("Irrigated Farmland","land",0,5,1,"W/U land that cycles away late game."),
    C("Scoured Barrens","land",0,4,.2,"W/B gainland."),
    C("Silent Clearing","land",0,5,3,"W/B land that sacrifices for a card.")
  ],
  landTarget:38, basics:null, fmt:"archidekt", edh:null
};

// ================= state & utils =================
let S, sample=null, downloads=null, mcp=null, LIVE=false, running=[], saveTimer=null, uid=1;
// SERVER is true when the page is served by the self-hosted Commander Forge server (see /server).
let SERVER=false, SERVER_AI=null, BUILDS=null, SERVER_MODELS={}, LAST_AI=null;
// DIRTY: the working deck has changes that aren't in Saved builds. The working deck isn't kept between visits.
let DIRTY=false;
const $ = id => document.getElementById(id);
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = v => { v=Number(v)||0; return v>=1000? "$"+Math.round(v).toLocaleString() : "$"+(v>=100?Math.round(v):v.toFixed(2)); };
const key = n => String(n||"").toLowerCase().replace(/\s+/g," ").trim();
const slugify = n => String(n).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").split(" // ")[0].replace(/[^a-z0-9\s-]/g,"").trim().replace(/[\s-]+/g,"-");
let toastT; function toast(t,action){ const el=$("toast"); el.innerHTML=esc(t)+(action?` <button type="button" class="tbtn">${esc(action.label)}</button>`:""); if(action&&el.querySelector){ const b=el.querySelector(".tbtn"); if(b) b.onclick=()=>{ action.fn(); el.hidden=true; }; } el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>el.hidden=true,action?7000:4200); }
function fresh(mode){ return {example:false,mode:mode||"new",query:"",commanders:[],colors:[],legal:true,overview:"",gameplans:[],chosen:[],custom:"",bracket:S?S.bracket:3,budget:S?S.budget:500,must:"",avoid:"",plan:null,cards:[],landTarget:37,basics:null,fmt:S?S.fmt:"archidekt",edh:null,importText:"",refine:null}; }
function isGC(n){ const k=key(n); return GC.has(k) || GC.has(k.split(" // ")[0]); }
function normCard(c){
  c.id = c.id || "c"+(uid++);
  c.f = Array.isArray(c.f)?c.f.slice():[];
  if ((c.gcLive===true || (c.gcLive==null && isGC(c.n))) && !c.f.includes("gc")) c.f.push("gc");
  c.mv = Number(c.mv)||0; c.s = Math.max(1,Math.min(10,Number(c.s)||5)); c.usd = c.usd==null?null:Math.max(0,Number(c.usd)||0);
  if (!CATNAME[c.c]) c.c = "engine";
  if (c.sel===undefined) c.sel=false;
  c.o = c.o || "rec";
  return c;
}

// ================= live data (in-app browser) =================
const CARDDB = {};      // key(name) -> scryfall summary
let tabId=null, bchain=Promise.resolve();
function resultText(r){ if(!r) return ""; if(Array.isArray(r.content)) return r.content.filter(b=>b&&b.type==="text").map(b=>b.text).join("\n"); return typeof r.payload==="string"?r.payload:JSON.stringify(r.payload||""); }
function pageJSON(t){
  const s=t.indexOf("\n---\n"); let body=s>=0?t.slice(s+5):t;
  const e=body.lastIndexOf("\n\nTab Context"); if(e>=0) body=body.slice(0,e);
  body=body.replace(/\n?\[truncated[^\]]*\]\s*$/,"").trim();
  return JSON.parse(body);
}
function browserGet(url){ return SERVER ? serverGet(url) : browserGetClaude(url); }
async function serverGet(url){
  let r; try{ r=await fetch("api/proxy?url="+encodeURIComponent(url)); }catch(e){ throw {code:"upstream_error",message:"Couldn't reach your Commander Forge server."}; }
  const t=await r.text(); let j; try{ j=JSON.parse(t); }catch(e){ throw {code:"upstream_error",message:"Unexpected data from "+url}; }
  if(r.status>=500||(r.status===400&&j&&j.code==="bad_url")) throw {code:"upstream_error",message:(j&&j.message)||"A data source didn't answer."};
  return j;
}
function browserGetClaude(url){
  const run = async () => {
    const B="host:claude_browser";
    if(!tabId){
      const r=await mcp.callTool(B,"preview_start",{url});
      const m=resultText(r).match(/tabId[:\s]+([A-Za-z0-9_-]+)/); tabId=m?m[1]:"";
    } else {
      try{ await mcp.callTool(B,"navigate",{url,tabId}); }
      catch(e){ if(e&&e.code==="tool_error"){ tabId=null; const r=await mcp.callTool(B,"preview_start",{url}); const m=resultText(r).match(/tabId[:\s]+([A-Za-z0-9_-]+)/); tabId=m?m[1]:""; } else throw e; }
    }
    const args={max_chars:600000}; if(tabId) args.tabId=tabId;
    const r=await mcp.callTool(B,"get_page_text",args);
    return pageJSON(resultText(r));
  };
  const p=bchain.then(run,run); bchain=p.catch(()=>{}); return p;
}
function rememberCard(d){
  const prices=d.prices||{};
  const usd = prices.usd!=null?Number(prices.usd): prices.usd_foil!=null?Number(prices.usd_foil): prices.usd_etched!=null?Number(prices.usd_etched): null;
  const front = d.card_faces&&d.card_faces[0]||{};
  const rec={name:d.name,mv:Number(d.cmc)||0,usd,gc:!!d.game_changer,ci:d.color_identity||[],legal:(d.legalities||{}).commander,type:d.type_line||front.type_line||"",mana:d.mana_cost||front.mana_cost||"",text:d.oracle_text||(d.card_faces||[]).map(f=>f.name+": "+(f.oracle_text||"")).join("\n"),rank:d.edhrec_rank,uri:d.scryfall_uri,prod:d.produced_mana||[]};
  CARDDB[key(d.name)]=rec; if(d.card_faces) d.card_faces.forEach(f=>{ if(!CARDDB[key(f.name)]) CARDDB[key(f.name)]=rec; });
  return rec;
}
async function scryNames(names, onProgress){
  if(!LIVE) return;
  const todo=[...new Set(names.map(n=>String(n||"").trim()).filter(n=>n&&!CARDDB[key(n)]&&!BASIC_NAMES.test(n)))];
  for(let i=0;i<todo.length;i+=20){
    const chunk=todo.slice(i,i+20);
    const q=chunk.map(n=>'!"'+n.replace(/"/g,"")+'"').join(" or ");
    try{
      const j=await browserGet("https://api.scryfall.com/cards/search?unique=cards&q="+encodeURIComponent(q));
      (j.data||[]).forEach(rememberCard);
    }catch(e){ if(isLiveFatal(e)) throw e; }
    if(onProgress) onProgress(Math.min(todo.length,i+20),todo.length);
  }
}
function isLiveFatal(e){ return e && ["server_not_connected","not_in_manifest","not_granted","capability_disabled","blocked_by_policy","cancelled"].includes(e.code); }
async function scryCommander(q){
  let j=await browserGet("https://api.scryfall.com/cards/named?fuzzy="+encodeURIComponent(q));
  if(j.object==="error"){ const s=await browserGet("https://api.scryfall.com/cards/search?q="+encodeURIComponent(q+" is:commander")); j=s.data&&s.data[0]; }
  if(!j||j.object==="error") return null;
  return rememberCard(j);
}
function cmdrSlug(){ return S.commanders.map(c=>slugify(c.name)).sort().join("-"); }
async function edhrecPage(path){
  try{ const j=await browserGet("https://json.edhrec.com/pages/commanders/"+path+".json"); return j&&j.container?j:null; }catch(e){ if(isLiveFatal(e)) throw e; return null; }
}
function digestEdh(j){
  const jd=j.container.json_dict||{}; const seen={}; const pool=[];
  (jd.cardlists||[]).forEach(l=>(l.cardviews||[]).forEach(v=>{ const k=key(v.name); if(seen[k]) return; seen[k]=1;
    pool.push({n:v.name,syn:Math.round((v.synergy||0)*100),inc:v.potential_decks?Math.round(v.num_decks/v.potential_decks*100):null,decks:v.num_decks||0,list:l.tag}); }));
  return {numDecks:(jd.card&&jd.card.num_decks)||null, themes:(j.tag_counts||[]).slice(0,10).map(t=>({slug:t.slug,name:t.value,count:t.count})), pool, avg:{land:j.land,basic:j.basic,creature:j.creature}, brackets:j.bracket_counts||null};
}
function applyLive(c){
  const d=CARDDB[key(c.n)]; if(!d) return c;
  c.n=d.name; c.usd=d.usd; c.mv = c.c==="land"?0:d.mv; c.live=true; c.ci=d.ci; c.legal=d.legal; c.gcLive=d.gc;
  c.f=c.f.filter(x=>x!=="gc"); if(d.gc) c.f.push("gc");
  ["up","dn"].forEach(k=>{ if(c[k]){ const a=CARDDB[key(c[k].n)]; if(a){ c[k].n=a.name; c[k].usd=a.usd; c[k].mv=a.mv; c[k].live=true; c[k].ci=a.ci; c[k].legal=a.legal; } } });
  const e=S.edh&&S.edh.pool.find(p=>key(p.n)===key(c.n)); if(e){ c.inc=e.inc; c.esyn=e.syn; }
  return c;
}
function offColor(ci){ if(!ci) return false; return ci.some(x=>!S.colors.includes(x)); }
function invalidReason(c){ if(c.legal && c.legal!=="legal") return c.legal==="banned"?"Banned in Commander":"Not legal in Commander"; if(offColor(c.ci)) return "Outside color identity"; return ""; }

// ================= bracket logic =================
function blockReason(c){
  const inv=invalidReason(c); if(inv) return inv;
  const b=BRACKETS[S.bracket];
  if (c.f.includes("gc") && b.gc===0) return "Game Changer";
  if (c.f.includes("mld") && !b.mld) return "Mass land denial";
  if (c.f.includes("combo") && b.combo===false) return "2-card combo";
  if (c.f.includes("xturn") && b.xturn==="none") return "Extra turns";
  return "";
}
const gcSelected = () => S.cards.filter(c=>c.sel && c.f.includes("gc")).length;
function gcLimitHit(c){ const b=BRACKETS[S.bracket]; return !c.sel && c.f.includes("gc") && b.gc!==Infinity && b.gc>0 && gcSelected()>=b.gc; }
function enforceBracket(){
  if(S.mode==="import") return 0;
  let removed=0; const b=BRACKETS[S.bracket];
  S.cards.forEach(c=>{ if(c.sel && blockReason(c)){c.sel=false;removed++;} });
  if (b.gc!==Infinity){ let n=0; S.cards.filter(c=>c.sel&&c.f.includes("gc")).sort((a,z)=>z.s-a.s).forEach(c=>{ n++; if(n>b.gc){c.sel=false;removed++;} }); }
  return removed;
}

// ================= deck math =================
function mainSize(){ return 100 - Math.max(1,S.commanders.length||1); }
function nonbasicSel(){ return S.cards.filter(c=>c.sel && c.c==="land").length; }
function basicsList(){
  if(S.basics) return Object.entries(S.basics).filter(([,k])=>k>0);
  if(!S.cards.length) return [];   // an empty deck has no basics yet
  const n=Math.max(0, S.landTarget - nonbasicSel()), cols=S.colors;
  if (!cols.length) return n?[["Wastes",n]]:[];
  const w=(S.plan&&S.plan.weights)||{}; let tot=0; const ws=cols.map(c=>{const v=Number(w[c])||1; tot+=v; return v;});
  const raw=ws.map(v=>v/tot*n); const out=raw.map(Math.floor); let left=n-out.reduce((a,b)=>a+b,0);
  raw.map((v,i)=>[v-Math.floor(v),i]).sort((a,b)=>b[0]-a[0]).forEach(([,i])=>{ if(left>0){out[i]++;left--;} });
  return cols.map((c,i)=>[BASIC[c],out[i]]).filter(x=>x[1]>0);
}
const basicsCount = () => basicsList().reduce((a,[,k])=>a+k,0);
const deckCount = () => S.cards.filter(c=>c.sel).length + basicsCount();
const ownFree = () => S.ownedFree!==false && COLL.size>0;
const cost = c => (ownFree() && owned(c.n)) ? 0 : (Number(c.usd)||0);
const altCost = a => !a ? 0 : (ownFree() && owned(a.n)) ? 0 : (Number(a.usd)||0);
const spentAll = () => S.cards.filter(c=>c.sel).reduce((a,c)=>a+(c.usd||0),0);
const spentNew = () => S.cards.filter(c=>c.sel && c.o!=="deck").reduce((a,c)=>a+cost(c),0);
const spentCost = () => S.cards.filter(c=>c.sel).reduce((a,c)=>a+cost(c),0);
const spent = () => S.mode==="import" ? spentNew() : spentCost();

function autofill(){
  S.cards.forEach(c=>c.sel=false);
  const ok = c => !blockReason(c) && !gcLimitHit(c);
  const pick = (list,n) => { let k=0; for(const c of list.sort((a,z)=>z.s-a.s)){ if(k>=n) break; if(ok(c)){c.sel=true;k++;} } };
  const must=new Set(S.must.split(/\n|,/).map(key).filter(Boolean));
  S.cards.forEach(c=>{ if(must.has(key(c.n)) && ok(c)) c.sel=true; });
  for (const [cat,n] of Object.entries(TARGETS)) pick(S.cards.filter(c=>c.c===cat&&!c.sel), n - S.cards.filter(c=>c.c===cat&&c.sel).length);
  const maxNon=Math.max(0,S.landTarget - Math.max(8, S.colors.length*3));
  for (const c of S.cards.filter(c=>c.c==="land"&&!c.sel).sort((a,z)=>z.s-a.s)){ if(nonbasicSel()>=maxNon) break; if(c.s>=5 && ok(c)) c.sel=true; }
  fillOpen();
}
function fillOpen(){
  const order = S.cards.filter(c=>!c.sel && c.c!=="land" && !c.swapOut).sort((a,z)=>{ const pa=(a.c==="payoff"||a.c==="engine")?1:0, pz=(z.c==="payoff"||z.c==="engine")?1:0; return (pz-pa)||(z.s-a.s); });
  for (const c of order){ if(deckCount()>=mainSize()) break; if(!blockReason(c)&&!gcLimitHit(c)) c.sel=true; }
}
function swapAlt(c,dir){
  const alt=c[dir]; if(!alt) return;
  const other = dir==="up"?"dn":"up";
  const back = {n:c.n,usd:c.usd,mv:c.mv,ci:c.ci,legal:c.legal,live:c.live,w:dir==="up"?"Original pick, cheaper":"Original pick, stronger"};
  const wasSel=c.sel;
  c.prevWhy = c.prevWhy || c.w;
  c.n=alt.n; c.usd=alt.usd==null?null:Number(alt.usd); c.mv=Number(alt.mv)||c.mv; c.ci=alt.ci; c.legal=alt.legal; c.live=alt.live;
  c.w = (alt.w? alt.w+". ":"") + "Same role as " + back.n + ": " + c.prevWhy;
  c[other]=back; c[dir]=null; c.inc=null; c.esyn=null;
  const d=CARDDB[key(c.n)]; c.gcLive = d?d.gc:null; c.f=c.f.filter(x=>x!=="gc"); if(c.gcLive===true||(c.gcLive==null&&isGC(c.n))) c.f.push("gc");
  const e=S.edh&&S.edh.pool.find(p=>key(p.n)===key(c.n)); if(e){ c.inc=e.inc; c.esyn=e.syn; }
  const lim=BRACKETS[S.bracket].gc;
  c.sel = wasSel && !blockReason(c) && !(c.f.includes("gc") && lim!==Infinity && gcSelected()>lim);
}
function fitBudget(quiet){
  if(!S.budget){ if(!quiet) toast("No budget set."); return 0; }
  let n=0;
  const gain=c=>cost(c)-altCost(c.dn);
  const cands=S.cards.filter(c=>c.sel&&c.dn&&gain(c)>0&&!invalidReason(c.dn)).sort((a,z)=>gain(z)-gain(a));
  for(const c of cands){ if(spent()<=S.budget) break; swapAlt(c,"dn"); n++; }
  if(!quiet){
    if (spent()>S.budget) toast(n?`Swapped ${n} cards to cheaper versions. Still ${money(spent()-S.budget)} over; uncheck a few pricey cards.`:"No cheaper alternatives left to swap.");
    else toast(n?`Swapped ${n} cards to cheaper versions. Now under budget.`:"Already under budget.");
    render(); save();
  }
  return n;
}
function upgradeBudget(){
  const lim=S.budget||Infinity; let n=0;
  for(const c of S.cards.filter(c=>c.sel&&c.up).sort((a,z)=>z.s-a.s)){
    const d=altCost(c.up)-cost(c); if(spent()+d>lim) continue;
    const probe=Object.assign({},c,{n:c.up.n,ci:c.up.ci,legal:c.up.legal,f:isGC(c.up.n)||(CARDDB[key(c.up.n)]||{}).gc?["gc"]:[]});
    if(blockReason(probe)) continue;
    if(probe.f.includes("gc") && BRACKETS[S.bracket].gc!==Infinity && gcSelected()>=BRACKETS[S.bracket].gc) continue;
    swapAlt(c,"up"); n++;
  }
  toast(n?`Upgraded ${n} cards within budget.`:"No upgrades fit the remaining budget or bracket."); render(); save();
}

// ================= rendering =================
// ---------- mana symbols (drawn here, so they work offline and inside Claude) ----------
const GLYPH={
  W:'<circle cx="12" cy="12" r="4.3"/><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.4 5.4l1.9 1.9M16.7 16.7l1.9 1.9M5.4 18.6l1.9-1.9M16.7 7.3l1.9-1.9"/>',
  U:'<path d="M12 2.4S5.4 10 5.4 14.6a6.6 6.6 0 0 0 13.2 0C18.6 10 12 2.4 12 2.4z"/>',
  B:'<path fill-rule="evenodd" d="M12 2.8a7.6 7.6 0 0 0-7.6 7.6c0 2.6 1.3 4.5 3.2 5.6V20h2.3v-2h1.1v2h2v-2h1.1v2h2.3v-4c1.9-1.1 3.2-3 3.2-5.6A7.6 7.6 0 0 0 12 2.8zM9 9.1a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2zm6 0a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z"/>',
  R:'<path d="M12.6 2.3c.7 3.4 5.6 5.7 5.6 11.2a6.2 6.2 0 0 1-12.4 0c0-3.1 1.8-5 3-6.2.1 2 1 3.2 2.3 3.7-.3-3.5.4-6.3 1.5-8.7z"/>',
  G:'<path d="M12 2.4l5.3 6.3h-2.7l3.7 5.1h-3.1l3.4 4.7H5.4l3.4-4.7H5.7l3.7-5.1H6.7z"/><rect x="10.8" y="18" width="2.4" height="3.6" rx=".6"/>',
  C:'<path fill-rule="evenodd" d="M12 2.8l7.2 9.2-7.2 9.2L4.8 12zm0 4.4L8.3 12l3.7 4.8 3.7-4.8z"/>',
  S:'<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
  P:'<g fill="none" stroke="currentColor" stroke-width="2.1"><circle cx="12" cy="12" r="5.4"/><path d="M12 3.2v17.6"/></g>',
  L:'<path d="M1.8 19.5l6.4-9.6 3.7 5.3 2.6-3.6 7.7 7.9z"/><circle cx="17.5" cy="6.5" r="2.2"/>',
};
const SYM_NAME={W:"White",U:"Blue",B:"Black",R:"Red",G:"Green",C:"Colorless",S:"Snow",X:"X",M:"Multicolor",L:"Land",Q:"Unknown"};
function manaSym(t){
  t=String(t).toUpperCase().trim();
  const nm=SYM_NAME[t]||t;
  if(t==="M") return `<span class="ms ms-M" role="img" aria-label="Multicolor" title="Multicolor"></span>`;
  if(t==="Q") return `<span class="ms ms-N" role="img" aria-label="Color not known yet" title="Color not known yet"><i>?</i></span>`;
  if(GLYPH[t]) return `<span class="ms ms-${t}" role="img" aria-label="${nm}" title="${nm}"><svg viewBox="0 0 24 24" aria-hidden="true">${GLYPH[t]}</svg></span>`;
  const hy=t.match(/^([WUBRGC2])\/([WUBRGP])$/);
  if(hy){ const a=hy[1], b=hy[2];
    if(b==="P") return `<span class="ms ms-${a} ms-phy" role="img" aria-label="Phyrexian ${SYM_NAME[a]||a}" title="Phyrexian ${SYM_NAME[a]||a}"><svg viewBox="0 0 24 24" aria-hidden="true">${GLYPH.P}</svg></span>`;
    return `<span class="ms ms-hy" style="--a:var(--s${a==="2"?"C":a});--b:var(--s${b})" role="img" aria-label="${a==="2"?"2":SYM_NAME[a]} or ${SYM_NAME[b]}" title="${a==="2"?"2":SYM_NAME[a]} or ${SYM_NAME[b]}">${a==="2"?"<i>2</i>":""}</span>`; }
  return `<span class="ms ms-N" role="img" aria-label="${esc(t)} generic mana" title="${esc(t)}"><i>${esc(t)}</i></span>`;
}

function pips(cost){
  return String(cost||"").split(/\s*\/\/\s*/).map(face=>(face.match(/\{[^}]+\}/g)||[]).map(t=>manaSym(t.slice(1,-1))).join("")).filter(Boolean).join('<span class="ms-sep">/</span>');
}
function colorPips(cols){ return `<span class="mss">${(cols&&cols.length?cols:["C"]).map(c=>manaSym(c)).join("")}</span>`; }
function renderMode(){
  document.querySelectorAll(".mode").forEach(b=>b.setAttribute("aria-pressed",String(S.mode===b.dataset.mode)));
  const imp=S.mode==="import", spin=S.mode==="spin";
  $("importSec").hidden=!imp; $("cmdSec").hidden=imp||(spin&&!S.commanders.length);
  $("cmdForm").hidden=spin;
  $("importText").value=S.importText||"";
  $("buildBtn").textContent = imp ? "Suggest upgrades" : "Build card pool";
  $("autofillBtn").hidden=imp; $("fillOpenBtn").hidden=imp;
  $("h4").textContent = imp ? "Your deck and upgrades" : "Card pool";
  $("planHint").textContent = imp ? "Optional: pick a direction to push the deck toward. Deck counts come from EDHREC." : "Pick one or two. Deck counts come from EDHREC when live data is on.";
  $("refineSec").hidden = !S.cards.length;
  $("comboSec").hidden = !S.cards.length; $("testSec").hidden = !S.cards.length;
}
function renderCommander(){
  $("cmdInput").value = S.query||"";
  $("exampleBanner").hidden = !S.example;
  const target = S.mode==="import" ? $("importCmdr") : $("cmdView");
  (S.mode==="import"?$("cmdView"):$("importCmdr")).innerHTML="";
  if(!S.commanders.length){ target.innerHTML=""; return; }
  const e=S.edh;
  target.innerHTML = S.commanders.map(c=>`<div class="cmdr"><div class="row" style="gap:10px"><h3>${esc(c.name)}</h3><span>${pips(c.manaCost)}</span></div><div class="type">${esc(c.type)}</div><div class="oracle">${esc(c.text)}</div></div>`).join("")
    + `<div class="stats"><span>Color identity ${colorPips(S.colors)}</span>${e&&e.numDecks?`<span><b>${e.numDecks.toLocaleString()}</b> decks on EDHREC</span>`:""}${e&&e.avg&&e.avg.land?`<span>Typical lands <b>${e.avg.land}</b></span>`:""}${e&&e.brackets?`<span>Most built at bracket <b>${Object.entries(e.brackets).sort((a,b)=>b[1]-a[1])[0][0]}</b></span>`:""}</div>`
    + (S.overview?`<p style="margin:0;max-width:72ch">${esc(S.overview)}</p>`:"")
    + (!S.legal&&S.note?`<div class="err">${esc(S.note)}</div>`:"")
    + (S.mode==="new"?preconsFor(S.commanders.map(c=>c.name)).map(i=>`<div class="banner row" style="justify-content:space-between">${esc("Official precon: "+PRE.d[i][0]+" ("+PRE.d[i][1]+", "+PRE.d[i][2]+")")}<button type="button" class="btn small" data-precon="${i}">Load it and suggest upgrades</button></div>`).join(""):"")
    + (S.mode==="import"&&S.cmdrChoices&&S.cmdrChoices.length>1?`<label class="f">Commander isn't marked in your list. Which card is it?<select id="cmdrPick">${S.cmdrChoices.map(n=>`<option ${S.commanders[0]&&S.commanders[0].name===n?"selected":""}>${esc(n)}</option>`).join("")}</select></label>`:"");
}
function renderPlans(){
  const el=$("plans");
  if(!S.gameplans.length){ el.innerHTML=`<div class="empty">${S.mode==="import"?"Import a deck to see the popular directions for its commander.":"Analyze a commander to see the ways people build it."}</div>`; $("custom").value=S.custom||""; return; }
  el.innerHTML = S.gameplans.map(p=>`<button type="button" class="plan" data-id="${esc(p.id)}" aria-pressed="${S.chosen.includes(p.id)}"><b>${esc(p.name)}</b>${p.decks?`<span class="decks">${p.decks.toLocaleString()} decks on EDHREC</span>`:""}${p.fit?`<span class="chips"><span class="chip fit ${esc(p.fit)}">${p.fit==="strong"?"Your deck already does this":p.fit==="some"?"Your deck partly does this":"Would mean bigger changes"}</span></span>${p.fitNote?`<span class="keys">${esc(p.fitNote)}</span>`:""}`:""}${!p.pitch&&!p.fit&&S.mode==="import"&&!sample?'<span class="keys">Descriptions need Claude.</span>':""}<span class="small">${p.pitch?esc(p.pitch):(running.length||$("importBtn").disabled?'<span class="muted">Writing a description…</span>':"")}</span>${p.mechanics&&p.mechanics.length?`<span class="chips">${p.mechanics.map(m=>`<span class="chip">${esc(m)}</span>`).join("")}</span>`:""}${p.keyCards&&p.keyCards.length?`<span class="keys">Key cards: ${p.keyCards.map(esc).join(", ")}</span>`:""}</button>`).join("");
  $("custom").value=S.custom||"";
  if(S.gameplans.length && !S.gameplans.some(g=>g.pitch) && sample && !running.length){
    el.insertAdjacentHTML("beforeend",`<div class="row" style="grid-column:1/-1"><button type="button" class="btn small" id="redesc">Write descriptions</button><span class="note">${S.plansFailed?"The last attempt didn't come back with descriptions.":"Get a short description of each gameplan."}</span></div>`);
  }
}
function renderBracket(){
  $("brackets").innerHTML = [1,2,3,4,5].map(n=>`<button type="button" class="bk" data-b="${n}" aria-pressed="${S.bracket===n}"><span class="n">${n}</span><span class="l">${BRACKETS[n].name}</span></button>`).join("");
  $("bracketRules").innerHTML = `<b>Bracket ${S.bracket}, ${BRACKETS[S.bracket].name}.</b> ${esc(BRACKETS[S.bracket].text)}`;
  $("budget").value = S.budget||"";
  const imp=S.mode==="import";
  const presets = imp? [[25,"$25"],[50,"$50"],[100,"$100"],[250,"$250"],[0,"No limit"]] : [[100,"$100"],[250,"$250"],[500,"$500"],[1000,"$1,000"],[0,"No limit"]];
  $("presets").innerHTML = presets.map(([v,l])=>`<button type="button" data-v="${v}" aria-pressed="${(S.budget||0)===v}">${l}</button>`).join("");
  $("budgetLabel").textContent = imp ? "Upgrade budget (what you'll spend on new cards)" : "Deck budget (excluding basics)";
  $("budgetNote").textContent = imp ? "Suggestions stay within this spend. Each comes with a cheaper and a pricier option where one exists." : "Recommendations aim to land near this total. Every card also gets an upgrade and a budget alternative you can swap to in one click.";
  $("must").value=S.must||""; $("avoid").value=S.avoid||"";
}
function renderInsight(){
  const p=S.plan; if(!p){ $("insight").innerHTML=""; return; }
  const labels=["Early game","Mid game","Late game"];
  $("insight").innerHTML = `<div class="insight"><span class="eyebrow">How this deck plays</span><div class="sum">${esc(p.summary)}</div>
   <div class="phase">${(p.steps||[]).map((s,i)=>`<div><span class="eyebrow">${labels[i]||"Then"}</span>${esc(String(s).replace(/^(early|mid|late)(\s*game)?:\s*/i,""))}</div>`).join("")}</div>
   <div class="two small">${p.winCons&&p.winCons.length?`<div><span class="eyebrow">Ways to win</span><ul style="margin:4px 0 0;padding-left:18px">${p.winCons.map(w=>`<li>${esc(w)}</li>`).join("")}</ul></div>`:""}
   <div>${p.mulligan?`<span class="eyebrow">Mulligan</span><p style="margin:4px 0 8px">${esc(p.mulligan)}</p>`:""}${p.risks?`<span class="eyebrow">Watch out for</span><p style="margin:4px 0 0">${esc(p.risks)}</p>`:""}</div></div></div>`;
}
function synBar(s){ let h='<span class="syn" title="Synergy '+s+'/10" aria-label="Synergy '+s+' of 10">'; for(let i=1;i<=10;i++) h+=`<i class="${i<=s?"on":""}"></i>`; return h+"</span>"; }
const sfUrl = n => "https://scryfall.com/search?q="+encodeURIComponent('!"'+n+'"');
const priceTxt = (usd,live) => usd==null ? (live?"no price":"…") : (live?money(usd):"~"+money(usd)+" est.");
function cardHTML(c){
  const br=blockReason(c), lim=gcLimitHit(c);
  const tags=[];
  const ow=owned(c.n); if(ow){ const wh=ownedWhere(ow); tags.push(`<span class="tag own" title="${esc(ow.locs.map(l=>l.q+" in "+(l.loc||"general collection")).join(", "))}">Owned${ow.q>1?" ×"+ow.q:""}${wh?" · "+esc(wh):""}</span>`); }
  if(c.swapOut) tags.push('<span class="tag new">Upgrade</span>');
  else if(c.o==="added") tags.push('<span class="tag new">Added</span>');
  if(c.f.includes("gc")) tags.push('<span class="tag gc">Game Changer</span>');
  if(c.f.includes("combo")) tags.push(`<span class="tag ${br==="2-card combo"?"bad":"info"}">Combo${c.x?" w/ "+esc(c.x):""}</span>`);
  if(c.f.includes("xturn")) tags.push('<span class="tag info">Extra turn</span>');
  if(c.f.includes("mld")) tags.push('<span class="tag bad">Land denial</span>');
  if(c.f.includes("tutor")) tags.push('<span class="tag info">Tutor</span>');
  if(br) tags.push(`<span class="tag bad">${esc(invalidReason(c)||("Not allowed in bracket "+S.bracket))}</span>`);
  else if(lim) tags.push('<span class="tag bad">Game Changer limit reached</span>');
  const alt=(d,a)=>a?`<button type="button" class="alt ${d}" data-swap="${d}" data-id="${c.id}"><span class="dir">${d==="up"?"Upgrade":"Budget"}</span><b>${esc(a.n)}</b><span class="aw">${a.usd!=null?priceTxt(a.usd,a.live):""}${a.w?" · "+esc(a.w):""}${owned(a.n)?" · you own it":""}</span></button>`:"";
  const lockImp = S.mode==="import" && c.o==="deck" ? "" : "";
  const edh = (c.inc!=null||c.esyn!=null) ? `<div class="edh">EDHREC: in ${c.inc!=null?c.inc+"%":"?"} of decks${c.esyn!=null?` · ${c.esyn>=0?"+":""}${c.esyn}% synergy`:""}</div>` : "";
  const out = c.swapOut ? S.cards.find(x=>key(x.n)===key(c.swapOut)) : null;
  return `<div class="card ${c.sel?"":"off"} ${br||lim?"blocked":""}" ${(!c.sel&&!$("showOff").checked&&!c.swapOut)||($("ownedOnly").checked&&!ow)||(poolQ()&&!fold(c.n).includes(poolQ()))?"hidden":""}>
    <input type="checkbox" data-id="${c.id}" ${c.sel?"checked":""} ${(br||lim)&&!c.sel?"disabled":""} aria-label="${c.swapOut?"Apply upgrade ":"Include "}${esc(c.n)}">${lockImp}
    <div style="min-width:0"><div class="nmrow"><span class="nm"><a href="${sfUrl(c.n)}" target="_blank" rel="noopener">${esc(c.n)}</a></span>${tags.join("")}</div>${c.w?`<div class="why">${esc(c.w)}</div>`:""}${edh}${oracleHTML(c.n)}</div>
    <div class="meta"><span class="mv" title="Mana value">${c.c==="land"?"land":"MV "+c.mv}</span>${synBar(c.s)}<span class="px">${priceTxt(c.usd,c.live)}</span></div>
    ${c.swapOut?`<div class="cutline"><b>Cuts ${esc(c.swapOut)}</b>${out&&out.usd!=null?" ("+priceTxt(out.usd,out.live)+")":""}${c.wo?" · "+esc(c.wo):""}</div>`:""}
    ${c.up||c.dn?`<div class="alts">${alt("up",c.up)}${alt("dn",c.dn)}</div>`:""}
  </div>`;
}
function renderPool(){
  if(!S.cards.length){ $("pool").innerHTML=`<div class="empty">${S.mode==="import"?"Import a deck to see it here, sorted by role.":"Your recommendations will appear here, grouped by role."}${S.mode==="new"&&!S.commanders.length?' <button type="button" class="btn small ghost" id="loadExample">See an example deck</button>':""}</div>`; return; }
  let html="";
  const swaps=S.cards.filter(c=>c.swapOut);
  if(swaps.length){
    const on=swaps.filter(c=>c.sel), cost=on.reduce((a,c)=>a+(c.usd||0),0);
    html += `<div class="cat"><div class="cat-h"><h3>Suggested upgrades</h3><span class="cnt">${on.length} of ${swaps.length} applied · ${money(cost)}${S.budget?" of "+money(S.budget):""}</span><span class="sp"></span><button type="button" class="btn small" id="applyAll">Apply all</button></div>${swaps.sort((a,z)=>z.s-a.s).map(cardHTML).join("")}</div>`;
  }
  html += CATS.map(cat=>{
    const list=S.cards.filter(c=>c.c===cat.id && !c.swapOut).sort((a,z)=>(z.sel-a.sel)||(z.s-a.s));
    if(!list.length) return "";
    const sel=list.filter(c=>c.sel).length, t=cat.id==="land"?null:TARGETS[cat.id];
    const bc=basicsCount();
    const cnt = cat.id==="land" ? `${sel} nonbasic + ${bc} basic = ${sel+bc}${S.basics?"":" / "+S.landTarget}` : (t?`${sel} / ${t} suggested`:`${sel} picked`);
    const met = cat.id==="land" ? (S.basics?true:sel+bc===S.landTarget) : (t?sel>=t:true);
    return `<div class="cat"><div class="cat-h"><h3>${cat.name}</h3><span class="cnt ${met?"met":""}">${cnt}</span><span class="sp"></span><button type="button" class="btn small ghost" data-more="${cat.id}" ${sample&&S.commanders.length&&!running.length?"":"disabled"}>Suggest more</button></div>${list.map(cardHTML).join("")}</div>`;
  }).join("");
  html += staplesHTML();
  $("pool").innerHTML=html;
}
function renderRefine(){
  $("refineSec").hidden = !S.cards.length;
  const tight = S.budget && spent() >= S.budget*0.9;
  $("splurgeChip").style.borderColor = tight?"var(--accent)":""; $("splurgeChip").style.color = tight?"var(--accent)":"";
  const r=S.refine; const el=$("refineOut");
  if(!r){ el.innerHTML=""; return; }
  const items=[...(r.add||[]).map((a,i)=>({k:"a"+i,what:"add",...a})),...(r.cut||[]).map((a,i)=>({k:"c"+i,what:"cut",...a}))];
  el.innerHTML = `<div class="reply">${esc(r.reply||"")}</div>` + (items.length&&!r.applied? `<div>${items.map(it=>{
      const d=CARDDB[key(it.n)]; const cur=S.cards.find(c=>key(c.n)===key(it.n));
      const px = it.what==="add" ? (d?priceTxt(d.usd,true):it.usd!=null?priceTxt(it.usd,false):"") : (cur&&cur.usd!=null?priceTxt(cur.usd,cur.live):"");
      const bad = it.what==="add" && d && (d.legal!=="legal"||d.ci.some(x=>!S.colors.includes(x)));
      return `<label class="prop"><input type="checkbox" data-prop="${it.k}" ${it.on===false||bad?"":"checked"} ${bad?"disabled":""}><span style="min-width:0"><span class="what ${it.what}">${it.what==="add"?"Add":"Cut"}${it.what==="add"&&it.c?" · "+esc(CATNAME[it.c]||it.c):""}</span> <b class="nm" style="font-size:1rem">${esc(it.n)}</b>${bad?' <span class="tag bad">Not legal here</span>':""}${it.what==="add"&&owned(it.n)?' <span class="tag own">Owned</span>':""}<br><span class="small">${esc(it.w||it.why||"")}</span></span><span class="meta"><span class="px">${px}</span></span></label>`; }).join("")}</div>
      <div class="note" id="refineNet" style="margin:8px 0"></div>
      <div class="row"><button type="button" class="btn primary small" id="applyRefine">Apply selected changes</button><button type="button" class="btn small ghost" id="dismissRefine">Dismiss</button></div>` : (r.applied?'<span class="note">Changes applied.</span>':""));
  if(items.length&&!r.applied) updateRefineNet();
}
function renderDeck(){
  const n=deckCount(), m=mainSize();
  $("count").innerHTML = `${n}<small> / ${m}</small>`;
  $("mbCount").textContent = `${n} / ${m} cards · ${money(spentAll())}`;
  $("countNote").textContent = !S.cards.length? "" : n===m ? "Full deck. Ready to export." : n<m ? `${m-n} open slots.${S.mode==="new"?' Use "Fill open slots" or pick more cards.':" Add cards or basics to reach "+m+"."}` : `${n-m} over. Uncheck cards to trim.`;
  const rows=CATS.map(c=>{ let v=S.cards.filter(x=>x.sel&&x.c===c.id).length; if(c.id==="land") v+=basicsCount(); return [c.name,v]; });
  $("ledger").innerHTML = rows.map(([a,b])=>`<span>${a}</span><span>${b}</span>`).join("") + `<span class="muted">Basics</span><span class="muted">${basicsList().map(([b,k])=>k+" "+b).join(", ")||"0"}</span>`;
  const nl=S.cards.filter(c=>c.sel&&c.c!=="land"); const bk=[0,0,0,0,0,0,0,0]; nl.forEach(c=>bk[Math.min(7,Math.max(0,Math.round(c.mv)))]++);
  const mx=Math.max(1,...bk);
  $("curve").innerHTML = bk.map(v=>`<div class="b" style="height:${(v/mx)*100}%"><span>${v||""}</span></div>`).join("");
  $("avgMv").textContent = nl.length? `Average mana value ${(nl.reduce((a,c)=>a+c.mv,0)/nl.length).toFixed(2)} across ${nl.length} nonland cards.`:"";
  const imp=S.mode==="import", sp=spent();
  $("budgetBoxH").textContent = imp? "Upgrade spend" : "Budget";
  $("spent").textContent=money(sp);
  $("budgetOf").textContent = S.budget? `of ${money(S.budget)}` : "no limit set";
  const pct = S.budget? Math.min(100, sp/S.budget*100) : 0;
  $("meter").className = "meter"+(S.budget&&sp>S.budget?" over":""); $("meter").firstElementChild.style.width = (S.budget?pct:0)+"%";
  const unpriced=S.cards.filter(c=>c.sel&&c.usd==null).length;
  $("deckValue").textContent = (imp?`Whole deck value ${money(spentAll())}. `:"") + (unpriced?`${unpriced} cards have no price yet.`:"");
  $("budgetBtns").hidden = imp;
  const allLive=S.cards.filter(c=>c.sel).every(c=>c.live);
  $("priceNote").textContent = allLive&&S.cards.length ? "Live Scryfall market prices (TCGplayer, nonfoil)." : LIVE ? 'Some prices are estimates. "Refresh live prices" pulls current Scryfall prices.' : "Prices are Claude's estimates. Open in the Claude desktop app for live Scryfall prices.";
  // bracket audit
  const b=BRACKETS[S.bracket], sel=S.cards.filter(c=>c.sel);
  const gc=sel.filter(c=>c.f.includes("gc")).length, combo=sel.filter(c=>c.f.includes("combo")).length, xt=sel.filter(c=>c.f.includes("xturn")).length, mld=sel.filter(c=>c.f.includes("mld")).length, tut=sel.filter(c=>c.f.includes("tutor")).length, inv=sel.filter(c=>invalidReason(c)).length;
  const line=(label,val,st)=>`<div><span>${label}</span><span class="st ${st}">${val}</span></div>`;
  let bad=false, warn=false;
  const gcSt = b.gc===Infinity?"ok":(gc>b.gc?(bad=true,"bad"):"ok");
  const comboSt = combo? (b.combo===false?(bad=true,"bad"):b.combo==="late"?(warn=true,"warn"):"ok"):"ok";
  const xtSt = xt? (b.xturn==="none"?(bad=true,"bad"):b.xturn==="few"&&xt>1?(warn=true,"warn"):"ok"):"ok";
  const mldSt = mld? (b.mld?"ok":(bad=true,"bad")):"ok";
  if(inv) bad=true;
  $("audit").innerHTML = line("Game Changers", b.gc===Infinity? gc+" (no limit)" : gc+" / "+b.gc, gcSt)
    + line("2-card combo pieces", combo? combo+(b.combo==="late"?" · keep late":""):"none", comboSt)
    + line("Extra-turn cards", xt||"none", xtSt) + line("Mass land denial", mld||"none", mldSt) + line("Tutors", tut||"none","ok")
    + (inv?line("Illegal or off-color", inv, "bad"):"");
  const v=$("verdict");
  let fits=5; for(let k=1;k<=5;k++){ const bb=BRACKETS[k]; if(gc<=bb.gc && (!mld||bb.mld) && (!combo||bb.combo!==false) && (!xt||bb.xturn!=="none")){ fits=k; break; } }
  if(!S.cards.length){ v.className="verdict ok"; v.textContent="No cards yet."; }
  else if(bad){ v.className="verdict bad"; v.textContent=`Breaks bracket ${S.bracket}. Fix the red items.`; }
  else if(warn){ v.className="verdict warn"; v.textContent=`Fits bracket ${S.bracket}, with notes below.`; }
  else { v.className="verdict ok"; v.textContent = fits<S.bracket? `Fits bracket ${S.bracket}. By the rules alone it also qualifies for bracket ${fits}; power level decides.` : `Fits bracket ${S.bracket}.`; }
  renderExport(); renderSaved(); renderShop(); renderOwnedToggles(); renderMana(); renderOdds(); renderOwnCheck();
}
function exportText(){
  const ar=S.fmt!=="moxfield", L=[];
  if(!ar && S.commanders.length){ S.commanders.forEach(c=>L.push(`1 ${c.name}`)); L.push(""); }
  else S.commanders.forEach(c=>L.push(`1x ${c.name} [Commander{top}]`));
  CATS.forEach(cat=>S.cards.filter(c=>c.sel&&c.c===cat.id).sort((a,z)=>a.n.localeCompare(z.n)).forEach(c=>L.push(ar?`1x ${c.n} [${ARCH_CAT[c.c]}]`:`1 ${c.n}`)));
  basicsList().forEach(([b,k])=>L.push(ar?`${k}x ${b} [Land]`:`${k} ${b}`));
  return L.join("\n");
}
function renderExport(){
  document.querySelectorAll("[data-fmt]").forEach(b=>b.setAttribute("aria-pressed",String((S.fmt||"archidekt")===b.dataset.fmt)));
  $("exportText").value = exportText();
  const ar=S.fmt!=="moxfield";
  $("openSite").href = ar?"https://archidekt.com/":"https://moxfield.com/"; $("openSite").textContent = ar?"Open Archidekt":"Open Moxfield";
  $("exportNote").textContent = ar ? "In Archidekt: create a deck, choose Import, paste. Categories and the commander slot come through." : "In Moxfield: create a deck, choose Import, paste. The commander is the first line; set it as commander if Moxfield doesn't do it automatically.";
}
function buildsAll(){ if(SERVER&&BUILDS) return BUILDS; try{ return JSON.parse(localStorage.getItem("cforge.builds")||"{}"); }catch(e){ return {}; } }
function buildsPut(k,v){
  if(SERVER){ BUILDS=BUILDS||{}; BUILDS[k]=v; fetch("api/builds/"+encodeURIComponent(k),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({state:v.state,count:v.count})}).catch(()=>{}); return; }
  const all=buildsAll(); all[k]=v; try{ localStorage.setItem("cforge.builds",JSON.stringify(all)); }catch(e){}
}
function buildsDel(k){
  if(SERVER){ if(BUILDS) delete BUILDS[k]; fetch("api/builds/"+encodeURIComponent(k),{method:"DELETE"}).catch(()=>{}); return; }
  const all=buildsAll(); delete all[k]; try{ localStorage.setItem("cforge.builds",JSON.stringify(all)); }catch(e){}
}
async function buildState(k){ const all=buildsAll(); if(all[k]&&all[k].state) return all[k].state; if(SERVER){ try{ const j=await fetch("api/builds/"+encodeURIComponent(k)).then(r=>r.json()); return j.state||null; }catch(e){} } return null; }
function renderSaved(){
  const all=buildsAll();
  const ks=Object.keys(all).sort((a,b)=>(all[b].t||0)-(all[a].t||0));
  $("saved").innerHTML = ks.length? ks.map(k=>`<div><button type="button" class="ld" data-load="${esc(k)}">${esc(k)}</button><span class="muted small">${esc(all[k].count||"")}</span><button type="button" class="btn small ghost" data-del="${esc(k)}">Delete</button></div>`).join("") : '<span class="muted small">Nothing saved yet.</span>';
}
function renderLive(){
  const chip=$("liveChip");
  chip.className = "live "+(LIVE?"on":"off");
  chip.lastElementChild.textContent = LIVE ? "Live: Scryfall + EDHREC" : "Estimates only";
  $("liveNote").hidden = LIVE || mcp===undefined;
  $("refreshBtn").hidden = !LIVE;
}
function render(){ renderMode(); renderSpin(); renderCommander(); renderPlans(); renderBracket(); renderInsight(); renderPool(); renderRefine(); renderDeck(); renderLive(); renderSaveBar(); renderOwnCheck(); }
function save(){
  if(S.example){ S.example=false; $("exampleBanner").hidden=true; }   // once you change the example, it's your deck
  if(S.commanders.length || S.cards.length) DIRTY=true;
  renderSaveBar();
}
function defaultDeckName(){ return S.savedName || (S.commanders.length ? S.commanders.map(c=>c.name.split(",")[0]).join(" + ")+(S.mode==="import"?" (imported)":"") : ""); }
function renderSaveBar(){
  const has = !S.example && (S.commanders.length || S.cards.length);
  if($("saveSec")) $("saveSec").hidden = !has;
  if($("dirtyNote")) $("dirtyNote").hidden = !(has && DIRTY);
  if(!has || !$("deckName")) return;
  const inp=$("deckName");
  if(document.activeElement!==inp && (!inp.value || inp.dataset.auto===inp.value)){ inp.value=defaultDeckName(); inp.dataset.auto=inp.value; }
  const name=$("deckName").value.trim(); const exists=!!buildsAll()[name];
  $("saveDeck").textContent = exists ? (name===S.savedName?"Update saved deck":"Replace saved deck") : "Save deck";
  $("saveHint").textContent = DIRTY ? (S.savedName?`Changes since you last saved “${S.savedName}” are lost when you leave unless you save them.`:"This deck clears when you leave the site unless you save it.") : (S.savedName?`Saved as “${S.savedName}”. No unsaved changes.`:"This deck clears when you leave the site unless you save it.");
}
function saveDeck(){
  const name=($("deckName").value||"").trim()||defaultDeckName()||"Untitled deck";
  const b=$("saveDeck");
  if(buildsAll()[name] && name!==S.savedName && b.dataset.confirm!=="1"){ b.dataset.confirm="1"; b.textContent=`Click again to replace “${name}”`; setTimeout(()=>{ if(b.isConnected){ b.dataset.confirm=""; renderSaveBar(); } },4000); return; }
  b.dataset.confirm="";
  S.savedName=name; $("deckName").value=name;
  buildsPut(name,{t:Date.now(),count:deckCount()+"/"+mainSize(),state:JSON.parse(JSON.stringify(S))});
  DIRTY=false; renderSaved(); renderSaveBar();
  $("saveNote").textContent=`Saved. Open it any time from Saved builds${SERVER?" on any device":""}.`;
  toast(`Saved “${name}”.`);
}
function newDeck(){
  const keep={bracket:S.bracket,budget:S.mode==="import"?500:S.budget,fmt:S.fmt};
  S=fresh("new"); Object.assign(S,keep);
  COMBOS=null; PT=null; HAND=null; DIRTY=false;
  $("deckName").value=""; $("saveNote").textContent=""; $("cmdStatus").innerHTML=""; $("buildStatus").innerHTML=""; $("importStatus").innerHTML="";
  render(); renderCombos(); renderPlaytest(); renderHand(); renderSaveBar();
}
function discardDeck(){
  const b=$("discardDeck");
  if(DIRTY && b.dataset.confirm!=="1"){ b.dataset.confirm="1"; b.textContent="Click again to discard your changes"; setTimeout(()=>{ if(b.isConnected){ b.dataset.confirm=""; b.textContent="Discard and start over"; } },4000); return; }
  b.dataset.confirm=""; b.textContent="Discard and start over";
  newDeck(); window.scrollTo&&window.scrollTo({top:0,behavior:"smooth"}); toast("Started a new deck.");
}
function loadExample(){ S=JSON.parse(JSON.stringify(EXAMPLE)); S.cards.forEach(normCard); COMBOS=null; PT=null; HAND=null; DIRTY=false; if($("deckName")) $("deckName").value=""; render(); renderSaveBar(); }

// ================= Claude prompts =================
const ERR = {not_granted:"Claude access wasn't allowed for this page. Reload and choose Allow to get recommendations.",sampling_disabled:"Claude isn't available on this account.",rate_limited:"Too many requests right now. Wait a minute and try again.",session_expired:"Your session expired. Sign in again, then retry.",invalid_json:"Claude's answer couldn't be read. Try again.",refused:"Claude declined this request. Try rewording it.",upstream_error:"The connection dropped. Try again.",prompt_too_large:"Too much text in the request. Shorten your notes."};
Object.assign(ERR,{gemini_key:"Google rejected your Gemini API key. Check it under AI engine.",gemini_model:"Google doesn't recognize that Gemini model name. Check the models under AI engine.",gemini_blocked:"Couldn't reach Google Gemini. Inside Claude, outside connections are blocked; Gemini works in your self-hosted version."});
const errMsg = e => { if(SERVER&&e&&e.code!=="cancelled"&&e.message&&String(e.message).length<200) return e.message; if(e&&e.code==="rate_limited"&&sample===geminiSample) return "Gemini's rate limit was hit. The free tier allows only a few requests per minute, so wait a minute and try again."; if(e&&sample===geminiSample&&e.code==="invalid_json") return "Gemini's answer couldn't be read. Try again."; return ERR[e&&e.code] || (e&&e.message&&String(e.message).length<160 ? e.message : ("Something went wrong ("+(e&&e.code||"unknown")+"). Try again.")); };

// ================= AI engine (Claude or Google Gemini) =================
let claudeSample=null;
const GEM_DEFAULT={model:"gemini-3.8-flash",fast:"gemini-3.5-flash-lite"};
const inClaude = () => !!(window.claude && window.claude.use);
function aiCfg(){ let c={}; try{ c=JSON.parse(localStorage.getItem("cforge.ai")||"{}"); }catch(e){} return Object.assign({provider:inClaude()?"claude":"gemini",key:"",model:GEM_DEFAULT.model,fast:GEM_DEFAULT.fast},c); }
function saveAiCfg(c){ try{ localStorage.setItem("cforge.ai",JSON.stringify(c)); }catch(e){} }
async function gemCall(input, opts, asJson){
  opts=opts||{}; const cfg=aiCfg();
  if(!cfg.key) throw {code:"gemini_key",message:"Add your Gemini API key under AI engine."};
  const model=String((opts.modelTier==="quick"?cfg.fast:cfg.model)||GEM_DEFAULT.model).trim();
  const text = typeof input==="string" ? input : input.map(m=>(m.role==="assistant"?"Earlier answer:\n":"")+m.content).join("\n\n");
  const body={contents:[{role:"user",parts:[{text}]}],generationConfig:{temperature:0.7,maxOutputTokens:16384}};
  if(asJson) body.generationConfig.responseMimeType="application/json";
  let res;
  try{ res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":cfg.key},body:JSON.stringify(body),signal:opts.signal}); }
  catch(e){ if(opts.signal&&opts.signal.aborted) throw {code:"cancelled"}; throw {code:"gemini_blocked",message:""}; }
  if(!res.ok){ let msg=""; try{ const j=await res.json(); msg=(j.error&&j.error.message)||""; }catch(e){}
    throw {code: res.status===429?"rate_limited" : (/api key|API_KEY|permission/i.test(msg)||res.status===401||res.status===403)?"gemini_key" : res.status===404?"gemini_model" : "upstream_error", message:msg}; }
  const reader=res.body.getReader(), dec=new TextDecoder(); let buf="", full="", finish="";
  try{
    for(;;){ const {done,value}=await reader.read(); if(done) break; buf+=dec.decode(value,{stream:true});
      let i; while((i=buf.indexOf("\n"))>=0){ const line=buf.slice(0,i).trim(); buf=buf.slice(i+1); if(!line.startsWith("data:")) continue;
        let ev; try{ ev=JSON.parse(line.slice(5)); }catch(e){ continue; }
        if(ev.promptFeedback&&ev.promptFeedback.blockReason) throw {code:"refused",message:"Gemini blocked this request ("+ev.promptFeedback.blockReason+")."};
        const cand=ev.candidates&&ev.candidates[0]; if(cand&&cand.finishReason) finish=cand.finishReason;
        const delta=((cand&&cand.content&&cand.content.parts)||[]).filter(p=>!p.thought).map(p=>p.text||"").join("");
        if(delta){ full+=delta; if(opts.onText) try{ opts.onText({text:full,delta}); }catch(e){} } } }
  }catch(e){ if(opts.signal&&opts.signal.aborted) throw {code:"cancelled",text:full}; if(e&&e.code) throw Object.assign(e,{text:full}); throw {code:"upstream_error",text:full}; }
  if(!full.trim()) throw {code:"empty_completion",message:"Gemini returned an empty answer"+(finish?" ("+finish+")":"")+"."};
  return {text:full,truncated:finish==="MAX_TOKENS"};
}
function parseLoose(t){
  try{ return JSON.parse(t); }catch(e){}
  const f=t.match(/```(?:json)?\s*([\s\S]*?)```/); if(f){ try{ return JSON.parse(f[1]); }catch(e){} }
  const ia=t.indexOf("{"), ib=t.indexOf("["); const a=[ia,ib].filter(x=>x>=0).sort((x,y)=>x-y)[0]; const b=Math.max(t.lastIndexOf("}"),t.lastIndexOf("]"));
  if(a!=null&&b>a){ try{ return JSON.parse(t.slice(a,b+1)); }catch(e){} }
  throw {code:"invalid_json",text:t};
}
function geminiSample(input,opts){ return gemCall(input,opts,false); }
geminiSample.json = async (input,opts)=>{ const r=await gemCall(input,opts,true); if(r.truncated) throw {code:"invalid_json",text:r.text}; return parseLoose(r.text); };
async function serverCall(input,opts,asJson){
  opts=opts||{};
  const prompt = typeof input==="string" ? input : input.map(m=>(m.role==="assistant"?"Earlier answer:\n":"")+m.content).join("\n\n");
  let res;
  try{ res=await fetch("api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,tier:opts.modelTier||"default",json:!!asJson}),signal:opts.signal}); }
  catch(e){ if(opts.signal&&opts.signal.aborted) throw {code:"cancelled"}; throw {code:"upstream_error",message:"Couldn't reach your Commander Forge server."}; }
  if(!res.ok){ let j={}; try{ j=await res.json(); }catch(e){} throw {code:j.code||"upstream_error",message:j.message||""}; }
  noteModelUsed(res.headers.get("X-AI-Model"), res.headers.get("X-AI-Skipped"), opts.modelTier);
  const reader=res.body.getReader(), dec=new TextDecoder(); let raw="", shown=0;
  const MARK="\u0000ERR";
  try{
    for(;;){ const {done,value}=await reader.read(); if(done) break; raw+=dec.decode(value,{stream:true});
      const vis=raw.split(MARK)[0]; if(vis.length>shown){ const delta=vis.slice(shown); shown=vis.length; if(opts.onText) try{ opts.onText({text:vis,delta}); }catch(e){} } }
  }catch(e){ const vis=raw.split(MARK)[0]; if(opts.signal&&opts.signal.aborted) throw {code:"cancelled",text:vis}; throw {code:"upstream_error",text:vis}; }
  const parts=raw.split(MARK); const text=parts[0];
  if(parts.length>1){ let err={}; try{ err=JSON.parse(parts[1]); }catch(e){} if(err.code==="truncated") return {text,truncated:true}; throw {code:err.code||"upstream_error",message:err.message||"",text}; }
  if(!text.trim()) throw {code:"empty_completion"};
  return {text,truncated:false};
}
let fbToastAt=0;
function noteModelUsed(model, skipped, tier){
  if(!model) return;
  const sk=(skipped||"").split(",").filter(Boolean).map(x=>x.split(":")[0]);
  LAST_AI={model,skipped:sk,tier,at:Date.now()};
  if(sk.length && Date.now()-fbToastAt>15000){ fbToastAt=Date.now(); toast(`${sk.join(" and ")} ${sk.length>1?"were":"was"} busy, so this used ${model}.`); }
  if(SERVER && !$("gemNote").dataset.keep) renderAiBox();
}
function serverSample(input,opts){ return serverCall(input,opts,false); }
serverSample.json = async (input,opts)=>{ const r=await serverCall(input,opts,true); if(r.truncated) throw {code:"invalid_json",text:r.text}; return parseLoose(r.text); };
const serverProvider = () => (SERVER_AI&&SERVER_AI.provider==="anthropic")?"anthropic":"gemini";
function serverAiReady(){ return !!(SERVER_AI && SERVER_AI[serverProvider()] && SERVER_AI[serverProvider()].hasKey); }
async function refreshServerAi(){ try{ SERVER_AI=await fetch("api/settings/ai").then(r=>r.json()); }catch(e){} await loadServerModels(); }
async function loadServerModels(){ const prov=serverProvider(); try{ SERVER_MODELS[prov]=await fetch("api/ai/models?provider="+prov).then(r=>r.json()); }catch(e){} }
function fillModelSelect(sel, list, value){
  const ids=list.map(m=>m.id); const opts=list.slice(); if(value&&!ids.includes(value)) opts.unshift({id:value,label:value+" (current)"});
  sel.innerHTML=opts.map(m=>`<option value="${esc(m.id)}">${esc(m.label&&m.label!==m.id?m.label+" · "+m.id:m.id)}</option>`).join("");
  if(value) sel.value=value;
}
async function putServerAi(body){ const r=await fetch("api/settings/ai",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); if(!r.ok) throw {code:"upstream_error",message:"Couldn't save settings on your server."}; SERVER_AI=await r.json(); if(body.provider||body.geminiKey||body.anthropicKey) await loadServerModels(); }
function applyProvider(){
  if(SERVER){
    sample = serverAiReady() ? serverSample : null;
    const nc=$("noClaude"); nc.textContent="Card recommendations need an AI engine. Open AI engine (right-hand column) and add a Google Gemini key (free from Google AI Studio) or an Anthropic API key.";
    nc.hidden=!!sample; renderAiBox(); renderPool(); return;
  }
  const c=aiCfg(); const gemOk=!inClaude()&&!!c.key;
  if(c.provider==="gemini"&&gemOk) sample=geminiSample;
  else if(claudeSample) sample=claudeSample;
  else if(gemOk) sample=geminiSample;
  else sample=null;
  const nc=$("noClaude");
  nc.textContent = inClaude() ? "Card recommendations need Claude, which isn't available in this view. Open this page in Claude while signed in, and allow it to use Claude when asked." : "Card recommendations need an AI engine. Add a Google Gemini API key under AI engine (it's free from Google AI Studio).";
  nc.hidden = !!sample || (inClaude() && claudeSample===undefined);
  renderAiBox(); renderPool();
}
function renderAiBox(){
  if(SERVER){
    const prov=serverProvider(); const ui = prov==="anthropic"?"claude":"gemini"; const c=(SERVER_AI&&SERVER_AI[prov])||{};
    document.querySelectorAll("[data-ai]").forEach(b=>{ b.setAttribute("aria-pressed",String(b.dataset.ai===ui)); if(b.dataset.ai==="claude") b.textContent="Claude (API key)"; });
    $("aiGem").hidden=false; $("aiClaudeNote").hidden=true; $("gemInClaude").hidden=true;
    ["gemKey","gemModel","gemFast","gemTest"].forEach(id=>$(id).disabled=false);
    $("gemKey").parentNode.firstChild.textContent = prov==="anthropic"?"Anthropic API key":"Gemini API key";
    $("gemKey").placeholder = c.hasKey ? `Saved (${c.keyHint||"hidden"}). Paste a new key to replace it.` : (prov==="anthropic"?"Paste your key from console.anthropic.com":"Paste your key from Google AI Studio");
    if(c.keyFromEnv) $("gemKey").placeholder="Set by the container's environment variable.";
    $("gemModelInputs").hidden=true; $("srvModels").hidden=false; $("autoFbRow").hidden=false;
    const ml=((SERVER_MODELS[prov]||{}).models)||[];
    if(document.activeElement!==$("gemModelSel")) fillModelSelect($("gemModelSel"), ml, c.model);
    if(document.activeElement!==$("gemFastSel")) fillModelSelect($("gemFastSel"), ml, c.fast);
    $("autoFb").checked = !SERVER_AI || SERVER_AI.autoFallback!==false;
    const link=$("gemTest").nextElementSibling; if(link){ link.href = prov==="anthropic"?"https://console.anthropic.com/settings/keys":"https://aistudio.google.com/apikey"; link.textContent = prov==="anthropic"?"Get an API key":"Get a free key"; }
    if(!$("gemNote").dataset.keep){
      const last = LAST_AI && LAST_AI.skipped.length ? ` Last answer came from ${LAST_AI.model} because ${LAST_AI.skipped.join(", ")} ${LAST_AI.skipped.length>1?"were":"was"} busy.` : "";
      $("gemNote").textContent = (c.hasKey?`Using ${prov==="anthropic"?"Claude":"Gemini"}: ${c.model} (fast: ${c.fast}).${last} `:"")+"Keys are stored on your server only; this page never sees them again after you save.";
    }
    return;
  }
  const c=aiCfg(); const shown = inClaude() ? (c.provider==="gemini"?"gemini":"claude") : (c.provider==="claude"&&claudeSample?"claude":"gemini");
  document.querySelectorAll("[data-ai]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.ai===shown)));
  $("aiGem").hidden = shown!=="gemini";
  $("aiClaudeNote").hidden = shown!=="claude";
  $("aiClaudeNote").textContent = inClaude() ? "Built in when this page runs in Claude. Uses your Claude plan; no key needed." : "Claude isn't built into the self-hosted version. Use Gemini, or ask to add an Anthropic API key option.";
  $("gemInClaude").hidden = !inClaude();
  ["gemKey","gemModel","gemFast","gemTest"].forEach(id=>$(id).disabled=inClaude());
  if(document.activeElement!==$("gemKey")) $("gemKey").value=c.key||"";
  if(document.activeElement!==$("gemModel")) $("gemModel").value=c.model||GEM_DEFAULT.model;
  if(document.activeElement!==$("gemFast")) $("gemFast").value=c.fast||GEM_DEFAULT.fast;
  const chip=$("liveChip");
}
async function testServerAi(){
  const prov=serverProvider(); const note=$("gemNote"); note.dataset.keep="1";
  const body={provider:prov}; const key=$("gemKey").value.trim();
  if(key) body[prov==="anthropic"?"anthropicKey":"geminiKey"]=key;
  const m=($("gemModelSel").value||"").trim(), f=($("gemFastSel").value||"").trim(); body.autoFallback=$("autoFb").checked;
  if(m) body[prov==="anthropic"?"anthropicModel":"geminiModel"]=m;
  if(f) body[prov==="anthropic"?"anthropicFast":"geminiFast"]=f;
  note.innerHTML='<span class="dot"></span> Saving and testing…';
  try{
    await putServerAi(body); $("gemKey").value="";
    if(!serverAiReady()){ note.textContent="Saved. Paste an API key to turn on recommendations."; delete note.dataset.keep; applyProvider(); return; }
    LAST_AI=null; const a=await serverCall('Reply with only this JSON: {"ok":true}',{},true); const mainUsed=LAST_AI; const b=await serverCall('Reply with only this JSON: {"ok":true}',{modelTier:"quick"},true); LAST_AI=mainUsed||LAST_AI;
    if(!/ok/.test(a.text)||!/ok/.test(b.text)) throw {code:"upstream_error",message:"The AI answered, but not as expected. Try again."};
    const used=LAST_AI&&LAST_AI.model, want=SERVER_AI[prov].fast;
    note.textContent = LAST_AI&&LAST_AI.skipped.length ? `Connected, but ${LAST_AI.skipped.join(" and ")} ${LAST_AI.skipped.length>1?"are":"is"} busy right now, so it answered with ${used}. Recommendations will use your main model when it's free and fall back automatically when it isn't.` : `Connected. Recommendations use ${SERVER_AI[prov].model} (and ${want} for quick tasks).`;
  }catch(e){ note.textContent=errMsg(e); }
  applyProvider(); setTimeout(()=>{ delete note.dataset.keep; },100);
}
async function testGemini(){
  if(SERVER) return testServerAi();
  const c=aiCfg(); c.key=$("gemKey").value.trim(); c.model=$("gemModel").value.trim()||GEM_DEFAULT.model; c.fast=$("gemFast").value.trim()||GEM_DEFAULT.fast; c.provider="gemini"; saveAiCfg(c);
  const note=$("gemNote");
  if(!c.key){ note.textContent="Paste your key first."; return; }
  note.innerHTML='<span class="dot"></span> Testing both models…';
  try{
    const a=await gemCall('Reply with only this JSON: {"ok":true}',{},true); const b=await gemCall('Reply with only this JSON: {"ok":true}',{modelTier:"quick"},true);
    if(!/ok/.test(a.text)||!/ok/.test(b.text)) throw {code:"upstream_error"};
    note.textContent="Gemini is connected. Recommendations now use "+c.model+" (and "+c.fast+" for quick tasks).";
  }catch(e){ note.textContent=errMsg(e); }
  applyProvider();
}
const LIVE_ERR = {server_not_connected:"Live data needs this page open in the Claude desktop app.",not_in_manifest:"Browser access wasn't allowed for this page, so live data is off. Reload to be asked again.",cancelled:"Browser access was declined, so live data is off for now.",blocked_by_policy:"Your organization blocks browser access for this page."};

function poolLines(limit, exclude){
  if(!S.edh||!S.edh.pool.length) return "";
  const ex=new Set((exclude||[]).map(key));
  const rows=S.edh.pool.filter(p=>!ex.has(key(p.n))).slice().sort((a,z)=>((z.inc||0)+z.syn*1.2)-((a.inc||0)+a.syn*1.2)).slice(0,limit);
  return rows.map(p=>{ const d=CARDDB[key(p.n)]; return `${p.n} | ${d?("MV "+d.mv+" | "+(d.usd!=null?"$"+d.usd.toFixed(2):"no price")+" | "+d.type+(d.gc?" | GAME CHANGER":"")):"?"} | in ${p.inc!=null?p.inc+"%":"?"} of decks | synergy ${p.syn>=0?"+":""}${p.syn}%${owned(p.n)?" | OWNED":""}`; }).join("\n");
}
function ctx(){
  const plans=S.gameplans.filter(p=>S.chosen.includes(p.id));
  const b=BRACKETS[S.bracket];
  return `COMMANDER: ${S.commanders.map(c=>c.name).join(" + ")}
Color identity: ${S.colors.length?S.colors.join(""):"colorless"}
Commander text: ${S.commanders.map(c=>c.name+": "+c.text).join(" | ")}
GAMEPLAN: ${plans.length?plans.map(p=>p.name+(p.pitch?" ("+p.pitch+")":"")).join(" + hybrid with "):"the most popular, strongest plan for this commander"}
${S.custom?"Player's own direction: "+S.custom:""}
BRACKET ${S.bracket} (${b.name}): ${b.text}
Official Game Changers list: ${GAME_CHANGERS.join("; ")}.
${b.gc===0?"Do not recommend ANY Game Changer.":b.gc===3?"At most 3 Game Changers across the whole deck.":""}
${S.must?"Must include: "+S.must.replace(/\n/g,"; "):""}
${S.avoid?"Avoid: "+S.avoid.replace(/\n/g,"; "):""}
${ownedHint()}
HARD RULES: real cards only, exact English Oracle names; Commander-legal (not banned); strictly inside the color identity; singleton; no basic lands; never the commander itself.`;
}
const LINE_FMT = `OUTPUT FORMAT: one JSON object per line (JSON Lines), no code fences, no other text.
Card line: {"t":"card","n":"Exact Card Name","c":"<category>","mv":<mana value>,"s":<synergy 1-10 for THIS deck>,"usd":<approx USD price>,"w":"<synergy write-up: 2-3 sentences, 30-55 words, explaining specifically why this card is great in THIS deck: how it interacts with the commander's abilities and the gameplan, naming other recommended cards it works with>","f":[any of "combo","xturn","mld","tutor"],"x":"<other piece if part of a 2-card infinite combo, else omit>","up":{"n":"stronger, pricier card in the same role","usd":<n>,"mv":<n>,"w":"<max 10 words>"} or null,"dn":{"n":"cheaper similar card","usd":<n>,"mv":<n>,"w":"<max 10 words trade-off>"} or null}
Give "up" and "dn" whenever a sensible one exists (both must obey the color identity; "up" may be a Game Changer only if the bracket permits). Order lines best-first within each category. When the LIVE DATA list gives a card's price, use that price.`;

function streamCall(prompt, onObj, ctl){
  let pending="";
  const parseLine = l => { l=l.trim().replace(/,$/,""); if(!l||l.startsWith("```")) return; const i=l.indexOf("{"); if(i<0) return; try{ onObj(JSON.parse(l.slice(i))); }catch(e){} };
  const eat = ({delta}) => { const lines=(pending+delta).split("\n"); pending=lines.pop(); lines.forEach(parseLine); };
  return sample(prompt,{onText:eat,signal:ctl.signal,modelTier:"default",cache:false}).then(r=>{ if(pending.trim()) parseLine(pending); return r; });
}
function addCard(o, extra){
  if(!o||!o.n) return null;
  const k=key(o.n); if(S.commanders.some(c=>key(c.name)===k)) return null;
  if(BASIC_NAMES.test(o.n)) return null;
  if(S.cards.some(c=>key(c.n)===k)) return null;
  const c=normCard(Object.assign({n:o.n,c:o.c,mv:o.mv,s:o.s,usd:o.usd,w:o.w||"",f:o.f,x:o.x,up:o.up&&o.up.n?o.up:null,dn:o.dn&&o.dn.n?o.dn:null,sel:false},extra||{}));
  applyLive(c);
  S.cards.push(c);
  return c;
}
function setBusy(b){
  ["analyzeBtn","buildBtn","importBtn","refineBtn"].forEach(id=>$(id).disabled=b);
  $("stopBtn").hidden=!b;
  document.querySelectorAll("[data-more]").forEach(x=>x.disabled=b||!sample||!S.commanders.length);
}
function needClaude(){ if(!sample){ applyProvider(); $("noClaude").hidden=false; $("noClaude").scrollIntoView({block:"center"}); return true; } return false; }
async function liveTry(fn, statusEl){
  if(!LIVE) return null;
  try{ return await fn(); }
  catch(e){ if(isLiveFatal(e)){ LIVE=false; renderLive(); if(statusEl) statusEl.insertAdjacentHTML("beforeend",`<div class="warnbox" style="flex-basis:100%">${esc(LIVE_ERR[e.code]||"Live data stopped working, so prices are estimates.")}</div>`); } return null; }
}
function statusLine(el, txt){ el.innerHTML = `<span class="dot"></span> ${esc(txt)}`; }

// ---------- New deck: analyze ----------
async function loadEdhForCommander(statusEl){
  const j=await liveTry(()=>edhrecPage(cmdrSlug()), statusEl);
  if(j){ S.edh=digestEdh(j); S.edh.slug=cmdrSlug(); S.edh.base=true; } else S.edh=null;
}
async function describePlans(signal, st){
  if(!sample||!S.commanders.length) return;
  if(st) statusLine(st,"Writing a quick read on each gameplan…");
  const imp = S.mode==="import" && S.cards.some(c=>c.o==="deck");
  const deck = imp ? S.cards.filter(c=>c.sel).map(c=>c.n).join("; ") : "";
  const r=await sample.json(`You are an expert Magic: The Gathering Commander deckbuilder. Commander: ${S.commanders.map(c=>c.name+" — "+c.text).join(" | ")}. Color identity ${S.colors.join("")||"colorless"}.
${S.gameplans.length?`These are the most popular EDHREC themes for it, with deck counts: ${S.gameplans.map(g=>g.name+" ("+g.decks+")").join(", ")}.`:"No EDHREC data was available."}
${imp?`THE PLAYER'S CURRENT DECK: ${deck}\n`:""}Reply with only one JSON object: {"overview":"2 sentences on what makes this commander tick${imp?", and how this particular deck currently tries to win":""}","plans":[{"id":"<theme slug from the list, or a new short-kebab id>","name":"<theme name>","pitch":"1-2 sentences on how this version plays and wins","mechanics":["3 short tags"],"keyCards":["3 signature cards"]${imp?`,"fit":"strong|some|little","fitNote":"max 14 words: how much the current deck already does this"`:""}}]}
${S.gameplans.length?`Cover these slugs, in this order: ${S.gameplans.map(g=>g.id).join(", ")}. Merge any that are not real strategies (like tribal flavor tags) into a pitch that still makes sense.`:`Give 4-5 genuinely different gameplans real players build${imp?", starting with the one this deck already follows":", most popular first"}.`}
${imp?`"fit" is "strong" if the deck already mostly plays this way, "some" if partly, "little" if it would need many changes. For keyCards, prefer cards NOT already in the deck.`:""}`,{signal,modelTier:"quick"});
  const {overview, plans:extra} = readPlansAnswer(r);
  if(overview) S.overview=overview;
  const take=(g,m)=>{ const pitch=m.pitch||m.description||m.summary||m.how||m.text||""; g.pitch=String(pitch); const tags=m.mechanics||m.tags||m.keywords||[]; g.mechanics=(Array.isArray(tags)?tags:String(tags).split(/,\s*/)).map(String).slice(0,4); const kc=m.keyCards||m.key_cards||m.cards||[]; g.keyCards=(Array.isArray(kc)?kc:String(kc).split(/;\s*|,\s*(?=[A-Z])/)).map(x=>String(x&&x.name||x)).slice(0,3); if(m.fit) { g.fit=String(m.fit).toLowerCase(); g.fitNote=String(m.fitNote||m.fit_note||""); } };
  if(S.gameplans.length){
    const norm=x=>slugify(String(x||"")).replace(/[^a-z0-9]/g,"");
    const used=new Set();
    S.gameplans.forEach((g,i)=>{
      let m=extra.find(p=>!used.has(p)&&(norm(p.id)===norm(g.id)||norm(p.name)===norm(g.name)||norm(p.slug)===norm(g.id)||norm(p.theme)===norm(g.name)))
        || extra.find(p=>!used.has(p)&&(norm(p.name).includes(norm(g.name))||norm(g.name).includes(norm(p.name))&&norm(p.name).length>3));
      if(!m && extra.length===S.gameplans.length && !used.has(extra[i])) m=extra[i];
      if(m){ used.add(m); take(g,m); }
    });
  }
  else { S.gameplans=extra.map((p,i)=>{ const g={id:String(p.id||slugify(p.name||"")||"plan"+i),name:String(p.name||p.theme||"Plan "+(i+1))}; take(g,p); return g; }); if(!imp) S.chosen=S.gameplans.length?[S.gameplans[0].id]:[]; }
  S.plansFailed = !S.gameplans.some(g=>g.pitch);
  if(S.plansFailed){ try{ console.warn("Gameplan descriptions: unexpected answer", r); }catch(e){} throw {code:"no_plans",message:"The AI's answer didn't include gameplan descriptions. Click “Write descriptions” on the Gameplan step to try again."}; }
}
// Accepts the shapes models actually return: {overview, plans}, {gameplans}, {themes}, a bare list, or a list wrapping the object.
function readPlansAnswer(r){
  let o=r;
  if(Array.isArray(o)) o = (o.length===1&&o[0]&&typeof o[0]==="object"&&!Array.isArray(o[0])&&(o[0].plans||o[0].gameplans||o[0].themes)) ? o[0] : {plans:o};
  if(!o||typeof o!=="object") return {overview:"",plans:[]};
  let plans=o.plans||o.gameplans||o.game_plans||o.themes||o.strategies||o.archetypes||[];
  if(plans&&!Array.isArray(plans)&&typeof plans==="object") plans=Object.entries(plans).map(([k,v])=>Object.assign({id:k,name:k},typeof v==="object"?v:{pitch:String(v)}));
  return {overview:String(o.overview||o.summary||o.commanderOverview||""), plans:(Array.isArray(plans)?plans:[]).filter(p=>p&&typeof p==="object")};
}
async function analyze(q){
  if(needClaude()) return;
  const ctl=new AbortController(); running=[ctl]; setBusy(true);
  const st=$("cmdStatus");
  try{
    const keep={bracket:S.bracket,budget:S.example?500:S.budget,fmt:S.fmt};
    let names=q.split(/\s*(?:\+|&|\/\/(?=.*\+)| and )\s*/i).filter(Boolean).slice(0,2);
    let live=[];
    if(LIVE){
      statusLine(st,"Looking up the commander on Scryfall…");
      for(const n of names){ const r=await liveTry(()=>scryCommander(n), st); if(r) live.push(r); }
    }
    S=fresh("new"); Object.assign(S,keep); S.query=q;
    if(live.length===names.length && live.length){
      S.commanders=live.map(d=>({name:d.name,manaCost:d.mana,type:d.type,text:d.text}));
      S.colors=["W","U","B","R","G"].filter(c=>live.some(d=>d.ci.includes(c)));
      S.legal=live.every(d=>d.legal==="legal") && live.every(d=>/legendary/i.test(d.type)||/can be your commander/i.test(d.text));
      if(!S.legal) S.note="Scryfall says this card can't normally be a commander, or isn't legal in Commander.";
      statusLine(st,"Pulling EDHREC themes and card data…"); render();
      await loadEdhForCommander(st);
      if(S.edh){ S.gameplans=S.edh.themes.slice(0,8).map(t=>({id:t.slug,name:t.name,decks:t.count})); S.chosen=S.gameplans.length?[S.gameplans[0].id]:[]; }
      render();
      try{ await describePlans(ctl.signal, st); }catch(e){ if(e&&e.code==="cancelled") throw e; S.plansFailed=true; }
    } else {
      statusLine(st,"Reading the commander and its common builds…");
      const r = await sample.json(`You are an expert Magic: The Gathering Commander (EDH) deckbuilder. The player wants to build around: "${q}".
Identify the commander(s); fix spelling. If they named two legal partners / a commander plus background, include both. Reply with only one JSON object:
{"commanders":[{"name":"exact Oracle name","manaCost":"{2}{W}{U}{B}","type":"Legendary Creature — Sphinx","text":"accurate Oracle text, with P/T for creatures"}],"colors":["W","U","B"],"legal":true,"note":"","overview":"2 sentences on what makes this commander tick","gameplans":[{"id":"short-kebab-id","name":"3-5 word name","pitch":"1-2 sentences","mechanics":["3 tags"],"keyCards":["3 signature cards"]}]}
Give 4-5 genuinely different gameplans real players build, most popular first.`,{signal:ctl.signal,modelTier:"default"});
      if(!r||!Array.isArray(r.commanders)||!r.commanders.length) throw {code:"invalid_json"};
      S.commanders=r.commanders.slice(0,2).map(c=>({name:String(c.name||""),manaCost:String(c.manaCost||""),type:String(c.type||""),text:String(c.text||"")}));
      S.colors=(Array.isArray(r.colors)?r.colors:[]).map(x=>String(x).toUpperCase()).filter(x=>"WUBRG".includes(x)&&x.length===1);
      S.legal=r.legal!==false; S.note=r.note||""; S.overview=r.overview||"";
      S.gameplans=(Array.isArray(r.gameplans)?r.gameplans:[]).map((p,i)=>({id:String(p.id||"plan"+i),name:String(p.name||"Plan "+(i+1)),pitch:String(p.pitch||""),mechanics:(p.mechanics||[]).map(String),keyCards:(p.keyCards||[]).map(String)}));
      S.chosen=S.gameplans.length?[S.gameplans[0].id]:[];
    }
    st.innerHTML=""; render(); save();
    $("h2").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){ st.innerHTML = e&&e.code==="cancelled" ? "" : `<div class="err">${esc(errMsg(e))}</div>`; render(); }
  finally{ running=[]; setBusy(false); }
}

// ---------- New deck: build ----------
async function loadThemePool(statusEl){
  if(!LIVE||!S.commanders.length) return;
  const slug=cmdrSlug();
  if(!S.edh) await loadEdhForCommander(statusEl);
  if(!LIVE) return;
  const tier = !S.budget||S.budget>=1000 ? "/expensive" : S.budget<=150 ? "/budget" : "";
  const themes=S.chosen.filter(id=>S.edh&&S.edh.themes.some(t=>t.slug===id));
  const pages = themes.length ? themes.map(t=>slug+"/"+t+tier) : (tier?[slug+tier]:[]);
  let merged=null;
  for(const p of pages){
    statusLine(statusEl,"Pulling EDHREC data for "+p.split("/").slice(1).join(" · ")+"…");
    let j=await liveTry(()=>edhrecPage(p), statusEl);
    if(!j && tier) j=await liveTry(()=>edhrecPage(p.replace(tier,"")), statusEl);
    if(j){ const d=digestEdh(j); if(!merged) merged=d; else { const seen=new Set(merged.pool.map(x=>key(x.n))); d.pool.forEach(x=>{ if(!seen.has(key(x.n))) merged.pool.push(x); }); } }
  }
  if(merged){ merged.themes=S.edh?S.edh.themes:merged.themes; merged.numDecks=S.edh?S.edh.numDecks:merged.numDecks; merged.slug=slug; S.edh=merged; }
  if(S.edh){
    const top=S.edh.pool.slice().sort((a,z)=>((z.inc||0)+z.syn)-((a.inc||0)+a.syn)).slice(0,160).map(p=>p.n);
    await liveTry(()=>scryNames(top,(d,t)=>statusLine(statusEl,`Pulling live Scryfall prices… ${d} / ${t}`)), statusEl);
  }
}
async function build(){
  if(S.mode==="import") return upgrade();
  if(needClaude()) return;
  if(!S.commanders.length){ toast("Analyze a commander first."); $("cmdInput").focus(); return; }
  S.example=false; S.cards=[]; S.plan=null; S.refine=null; S.basics=null; COMBOS=null; HAND=null; PT=null; renderCombos(); renderHand(); renderPlaytest(); render();
  const st=$("buildStatus"); setBusy(true);
  running=[new AbortController()];
  await loadThemePool(st);
  if(running[0]&&running[0].signal.aborted){ running=[]; setBusy(false); st.innerHTML=""; return; }
  const base=ctx() + `\nBUDGET: ${S.budget?"about $"+S.budget+" total for the 99 (excluding basics). Pick primary cards so the full deck lands near this; with a high budget prefer the best version regardless of price, with a low budget prefer efficient cheap cards.":"no limit; pick the strongest cards."}`
    + (S.edh&&S.edh.pool.length? `\n\nLIVE DATA from EDHREC (${S.edh.numDecks||"many"} decks) with Scryfall prices — strongly prefer cards from this list, but add better or more synergistic cards from outside it when they fit:\n${poolLines(170)}` : "");
  const jobs=[
    {label:"Game plan and finishers", prompt:`${base}\n\nTASK: First output ONE plan line: {"t":"plan","summary":"3 sentences on how the deck plays and wins","steps":["Early game: ...","Mid game: ...","Late game: ..."],"mulligan":"1-2 sentences","winCons":["2-4 concrete win routes"],"risks":"main weaknesses and how to play around them","lands":<recommended total land count>,"weights":{"<color>":<share of colored pips 0-1 for each identity color>}}\nThen output card lines: 16 cards with "c":"payoff" (finishers, bombs and the cards that make the gameplan win) and 6 cards with "c":"protection".\n\n${LINE_FMT}`},
    {label:"Synergy engine", prompt:`${base}\n\nTASK: Output 22 card lines with "c":"engine": the enablers, engines and synergy pieces that make this commander and gameplan work. Prefer cards that are much better here than in a generic deck.\n\n${LINE_FMT}`},
    {label:"Ramp and card advantage", prompt:`${base}\n\nTASK: Output 14 card lines with "c":"ramp" (rocks, land ramp, cost reducers that fit this commander's curve and colors), then 14 with "c":"draw".\n\n${LINE_FMT}`},
    {label:"Interaction and lands", prompt:`${base}\n\nTASK: Output 12 card lines with "c":"removal" (spot removal, counterspells, interaction), 5 with "c":"wipe", then 18 with "c":"land" (nonbasic lands for these colors at this budget and bracket; mv 0; their "w" can be one sentence).\n\n${LINE_FMT}`}
  ];
  const status=jobs.map(()=> "waiting");
  const paint=()=>{ st.innerHTML = jobs.map((j,i)=>`<span>${status[i]==="run"?'<span class="dot"></span> ':status[i]==="done"?"✓ ":status[i]==="err"?"✕ ":"· "}${j.label}</span>`).join(" ") + ` <span class="muted">${S.cards.length} cards so far</span>`; };
  paint();
  let rt=0; const redraw=()=>{ if(rt) return; rt=requestAnimationFrame(()=>{ rt=0; renderInsight(); renderPool(); renderDeck(); paint(); }); };
  const errs=[];
  running = jobs.map(()=>new AbortController());
  await Promise.all(jobs.map((j,i)=>{ status[i]="run"; return streamCall(j.prompt, o=>{
      if(o.t==="plan"){ S.plan={summary:String(o.summary||""),steps:Array.isArray(o.steps)?o.steps.map(String):[],mulligan:String(o.mulligan||""),winCons:Array.isArray(o.winCons)?o.winCons.map(String):[],risks:String(o.risks||""),lands:Number(o.lands)||37,weights:o.weights||{}}; S.landTarget=Math.max(30,Math.min(42,S.plan.lands)); }
      else if(o.t==="card") addCard(o);
      redraw(); }, running[i])
    .then(()=>{status[i]="done";}).catch(e=>{ status[i]="err"; if(e&&e.code!=="cancelled") errs.push(e); }).finally(paint); }));
  running=[];
  if(LIVE && S.cards.length){
    const names=[]; S.cards.forEach(c=>{ names.push(c.n); if(c.up) names.push(c.up.n); if(c.dn) names.push(c.dn.n); });
    await liveTry(()=>scryNames(names,(d,t)=>statusLine(st,`Checking live prices and legality… ${d} / ${t}`)), st);
    S.cards.forEach(applyLive);
    const dropped=S.cards.filter(c=>invalidReason(c)); S.cards=S.cards.filter(c=>!invalidReason(c));
    if(dropped.length) errs.push({code:"_dropped",message:`Removed ${dropped.length} suggestion${dropped.length>1?"s":""} that Scryfall says are off-color or not legal: ${dropped.map(c=>c.n).join(", ")}.`});
  }
  setBusy(false);
  enforceBracket(); autofill();
  const swapped = S.budget && spent()>S.budget ? fitBudget(true) : 0;
  render(); save(); paint();
  const notes=errs.map(e=>e.code==="_dropped"?e.message:errMsg(e)+" The cards that arrived are kept; build again to retry.");
  if(swapped) notes.push(`To stay near your budget, ${swapped} card${swapped>1?"s were":" was"} swapped to cheaper versions. "Spend leftover on upgrades" reverses that if you have room.`);
  if(notes.length) st.insertAdjacentHTML("beforeend",`<div class="${errs.some(e=>e.code!=="_dropped")?"err":"warnbox"}" style="flex-basis:100%">${notes.map(esc).join("<br>")}</div>`);
  else if(S.cards.length) toast(`Picked a ${deckCount()}-card main deck from ${S.cards.length} suggestions.`);
}

async function more(cat){
  if(needClaude()||running.length) return;
  const ctl=new AbortController(); running=[ctl]; setBusy(true);
  const st=$("buildStatus"); statusLine(st,`Finding more ${CATNAME[cat].toLowerCase()}…`);
  const before=S.cards.length, added=[];
  try{
    await streamCall(`${ctx()}\nBUDGET: ${S.budget?"$"+S.budget+(S.mode==="import"?" upgrade spend":" deck total"):"no limit"}.\n${S.edh?"LIVE DATA (EDHREC + Scryfall prices), prefer these:\n"+poolLines(80,S.cards.map(c=>c.n)):""}\n\nTASK: Output 8 MORE card lines with "c":"${cat}" (${CATNAME[cat]}). Do NOT repeat any of these: ${S.cards.map(c=>c.n).join("; ")}.\n\n${LINE_FMT}`, o=>{ if(o.t&&o.t!=="card") return; o.c=cat; const c=addCard(o); if(c) added.push(c); renderPool(); }, ctl);
    if(LIVE&&added.length){ await liveTry(()=>scryNames(added.flatMap(c=>[c.n,c.up&&c.up.n,c.dn&&c.dn.n].filter(Boolean))), st); added.forEach(applyLive); S.cards=S.cards.filter(c=>!(added.includes(c)&&invalidReason(c))); }
    st.innerHTML=`<span>Added ${S.cards.length-before} new ${CATNAME[cat].toLowerCase()} options. Check the ones you want.</span>`;
  }catch(e){ st.innerHTML = e&&e.code==="cancelled"?"":`<div class="err">${esc(errMsg(e))}</div>`; }
  finally{ running=[]; setBusy(false); render(); save(); }
}

// ---------- Import ----------
function parseList(text){
  const out=[]; let section="";
  for(const raw of String(text).split(/\r?\n/)){
    let l=raw.trim(); if(!l) continue;
    const hdr=l.replace(/^(\/\/|#)\s*/,"").replace(/[:\s]*(\(\d+\))?\s*$/,"").toLowerCase();
    if(/^(\/\/|#)/.test(l) || /^(commanders?|deck|mainboard|main|sideboard|maybeboard|maybe|companion|considering|tokens|lands|creatures|instants|sorceries|artifacts|enchantments|planeswalkers|battles|other)$/.test(hdr)){ section=hdr; continue; }
    const m=l.match(/^(\d+)\s*x?\s+(.+)$/i); if(!m) continue;
    let rest=m[2], cats=[];
    rest=rest.replace(/\[([^\]]*)\]/g,(_,c)=>{ cats.push(...c.split(",").map(s=>s.replace(/\{[^}]*\}/g,"").trim()).filter(Boolean)); return " "; });
    rest=rest.replace(/\^[^^]*\^/g," ").replace(/\*[A-Za-z]+\*/g," ").replace(/\s+\([A-Za-z0-9]{2,8}\)(\s+[\w\-★†]+)?/g," ").replace(/\s+/g," ").trim();
    if(!rest) continue;
    out.push({q:Number(m[1])||1,n:rest,cats,sec:section});
  }
  return out;
}
function catFromTags(tags){
  const t=tags.join(" ").toLowerCase(); for(const [re,c] of ARCH_IN){ if(new RegExp(re).test(t)) return c; } return null;
}
function catGuess(d){
  if(!d) return "engine"; const t=(d.type||"").toLowerCase(), x=(d.text||"").toLowerCase();
  if(/\bland\b/.test(t)&&!/creature/.test(t)) return "land";
  if(/add \{|search your library for (a|up to \w+) (basic )?land/.test(x)) return "ramp";
  if(/destroy all|exile all|each creature gets -|return all/.test(x)) return "wipe";
  if(/counter target|destroy target|exile target|return target .* to its owner's hand/.test(x)) return "removal";
  if(/draw (a|two|three|\w+) cards?/.test(x)) return "draw";
  if(/hexproof|indestructible|shroud|protection from/.test(x)&&!/creature/.test(t)) return "protection";
  return "engine";
}
async function importDeck(){
  const text=$("importText").value; const st=$("importStatus");
  const rows=parseList(text);
  if(!rows.length){ st.innerHTML='<div class="err">No cards found. Each line should start with a count, like "1 Sol Ring".</div>'; return; }
  const keep={bracket:S.bracket,budget:S.example||S.mode!=="import"?100:S.budget,fmt:S.fmt};
  S=fresh("import"); Object.assign(S,keep); S.importText=text; COMBOS=null; HAND=null; PT=null; renderCombos(); renderHand(); renderPlaytest();
  const main=rows.filter(r=>!/side|maybe|consider|token/.test(r.sec));
  let cmdRows=main.filter(r=>r.cats.some(c=>/^commander/i.test(c))||/commander/.test(r.sec));
  setBusy(true);
  try{
    if(LIVE){ await liveTry(()=>scryNames(main.map(r=>r.n),(d,t)=>statusLine(st,`Looking up your cards on Scryfall… ${d} / ${t}`)), st); }
    if(!cmdRows.length){
      const side=rows.filter(r=>/side|commander/.test(r.sec));
      const legends=(side.length?side:main).filter(r=>{ const d=CARDDB[key(r.n)]; return d && /legendary/i.test(d.type) && /(creature|planeswalker)/i.test(d.type); });
      S.cmdrChoices=legends.map(r=>(CARDDB[key(r.n)]||{}).name||r.n);
      if(legends.length) cmdRows=[legends[side.length?0:legends.length-1]];
      else if(!LIVE && main.length) { S.cmdrChoices=main.map(r=>r.n); cmdRows=[main[0]]; }
    }
    S.commanders=cmdRows.slice(0,2).map(r=>{ const d=CARDDB[key(r.n)]; return d?{name:d.name,manaCost:d.mana,type:d.type,text:d.text}:{name:r.n,manaCost:"",type:"",text:""}; });
    const ci=new Set(); cmdRows.forEach(r=>{ const d=CARDDB[key(r.n)]; if(d) d.ci.forEach(x=>ci.add(x)); });
    if(!ci.size) S.commanders.forEach(c=>{ const m=cmdInfo(c.name); if(m) m.ci.split("").forEach(x=>ci.add(x)); });   // offline: built-in commander list
    S.colors=["W","U","B","R","G"].filter(c=>ci.has(c));
    S.basics={};
    const cmdKeys=new Set(S.commanders.map(c=>key(c.name)));
    main.forEach(r=>{
      const d=CARDDB[key(r.n)]; const name=d?d.name:r.n;
      if(cmdKeys.has(key(name))) return;
      if(BASIC_NAMES.test(name)){ S.basics[name]=(S.basics[name]||0)+r.q; return; }
      if(S.cards.some(c=>key(c.n)===key(name))) return;
      const c=normCard({n:name,c:catFromTags(r.cats)||catGuess(d),mv:d?d.mv:0,s:5,usd:null,w:"",f:[],sel:true,o:"deck",tagged:!!catFromTags(r.cats)});
      applyLive(c); S.cards.push(c);
    });
    if(LIVE && S.commanders.length){ statusLine(st,"Pulling EDHREC data for your commander…"); await loadEdhForCommander(st); if(S.edh){ S.cards.forEach(applyLive); S.gameplans=S.edh.themes.slice(0,8).map(t=>({id:t.slug,name:t.name,decks:t.count})); } }
    if(!S.colors.length && !LIVE) S.colors=["W","U","B","R","G"];
    let planErr=""; if(S.commanders.length && sample){ render(); try{ await describePlans(undefined, st); }catch(e){ planErr=errMsg(e); } }
    st.innerHTML = `<span>Imported ${S.cards.length+Object.values(S.basics).reduce((a,b)=>a+b,0)} cards${S.commanders.length?" with "+esc(S.commanders.map(c=>c.name).join(" + "))+" as commander":""}. Set your bracket and upgrade budget, then choose "Suggest upgrades".</span>`+(planErr?`<div class="warnbox" style="flex-basis:100%">${esc(planErr)}</div>`:"");
    render(); save();
  }catch(e){ st.innerHTML=`<div class="err">${esc(errMsg(e))}</div>`; }
  finally{ setBusy(false); }
}
function deckLines(){
  return S.cards.filter(c=>c.sel).map(c=>`${c.n} | ${c.c} | MV ${c.mv} | ${c.usd!=null?"$"+Number(c.usd).toFixed(2):"?"}${c.inc!=null?" | in "+c.inc+"% of decks":""}`).join("\n")
    + "\nBasics: " + basicsList().map(([b,k])=>k+" "+b).join(", ");
}
async function upgrade(){
  if(needClaude()) return;
  if(!S.cards.length){ toast("Import a deck first."); $("importText").focus(); return; }
  const st=$("buildStatus"); setBusy(true);
  S.cards=S.cards.filter(c=>!c.swapOut); S.cards.forEach(c=>{ if(c.o==="deck") c.sel=true; });
  running=[new AbortController()];
  if(LIVE && S.chosen.length) await loadThemePool(st);
  const deckNames=S.cards.map(c=>c.n);
  const base=ctx()+`\nTHE PLAYER'S CURRENT DECK (name | role guess | MV | live price | EDHREC inclusion):\n${deckLines()}`
    + (S.edh&&S.edh.pool.length?`\n\nLIVE DATA: popular and high-synergy cards for this commander NOT in the deck (EDHREC + Scryfall price):\n${poolLines(150,deckNames)}`:"");
  const jobs=[
    {label:"Reading your deck", prompt:`${base}\n\nTASK: First output ONE plan line: {"t":"plan","summary":"3 sentences on how THIS deck currently plays and wins, and its biggest gaps","steps":["Early game: ...","Mid game: ...","Late game: ..."],"mulligan":"1-2 sentences","winCons":["the deck's actual win routes"],"risks":"main weaknesses","lands":<ideal land count>,"weights":{}}\nThen output ONE line per non-basic card in the current deck, in the order given: {"t":"role","n":"exact name as given","c":"<payoff|engine|ramp|draw|removal|wipe|protection|land>","s":<how well it fits this deck 1-10>,"w":"<one sentence, max 22 words, on what it does for this deck>","f":[any of "combo","xturn","mld","tutor"],"x":"<combo partner or omit>"}\nNo other text.`},
    {label:"Finding upgrades", prompt:`${base}\n\nUPGRADE BUDGET: ${S.budget?"$"+S.budget+" total to spend on new cards (sum of the 'in' cards' prices must stay at or under this; cheap high-impact swaps first)":"no limit; suggest the strongest upgrades"}.\nTASK: Suggest 12-18 one-for-one swaps that most improve the deck for its gameplan and bracket. Cut the weakest, least synergistic or most redundant cards; keep the land count sensible. Each "in" card must NOT already be in the deck and must not repeat.\nOutput one JSON object per line, best swap first, no other text:\n{"t":"swap","out":"exact name of a card in the current deck","n":"card to add","c":"<category of the new card>","mv":<n>,"usd":<approx USD>,"s":<synergy 1-10>,"w":"<synergy write-up: 2-3 sentences, 30-55 words, on why the new card is great in THIS deck and with this commander, naming cards it works with>","wo":"<max 14 words: why cut the old card>","f":[flags],"x":"<combo partner or omit>","up":{"n":"pricier stronger option","usd":<n>,"mv":<n>,"w":"<max 10 words>"} or null,"dn":{"n":"cheaper similar option","usd":<n>,"mv":<n>,"w":"<max 10 words>"} or null}\nUse live prices from LIVE DATA when listed.`}
  ];
  const status=jobs.map(()=> "waiting");
  const paint=()=>{ st.innerHTML = jobs.map((j,i)=>`<span>${status[i]==="run"?'<span class="dot"></span> ':status[i]==="done"?"✓ ":status[i]==="err"?"✕ ":"· "}${j.label}</span>`).join(" "); };
  paint();
  let rt=0; const redraw=()=>{ if(rt) return; rt=requestAnimationFrame(()=>{ rt=0; renderInsight(); renderPool(); renderDeck(); paint(); }); };
  const errs=[]; const swaps=[];
  running=jobs.map(()=>new AbortController());
  await Promise.all(jobs.map((j,i)=>{ status[i]="run"; return streamCall(j.prompt, o=>{
      if(o.t==="plan"){ S.plan={summary:String(o.summary||""),steps:(o.steps||[]).map(String),mulligan:String(o.mulligan||""),winCons:(o.winCons||[]).map(String),risks:String(o.risks||""),lands:Number(o.lands)||37,weights:o.weights||{}}; }
      else if(o.t==="role"){ const c=S.cards.find(x=>key(x.n)===key(o.n)); if(c){ if(!c.tagged&&CATNAME[o.c]) c.c=o.c; c.s=Math.max(1,Math.min(10,Number(o.s)||5)); c.w=String(o.w||""); if(Array.isArray(o.f)) c.f=[...new Set([...c.f.filter(x=>x==="gc"),...o.f])]; if(o.x) c.x=o.x; } }
      else if(o.t==="swap"){ const outC=S.cards.find(x=>key(x.n)===key(o.out)&&x.o==="deck"); if(!outC) return; const c=addCard(o,{swapOut:outC.n,wo:o.wo||"",o:"rec"}); if(c) swaps.push(c); }
      redraw(); }, running[i]).then(()=>{status[i]="done";}).catch(e=>{ status[i]="err"; if(e&&e.code!=="cancelled") errs.push(e); }).finally(paint); }));
  running=[];
  if(LIVE&&swaps.length){
    await liveTry(()=>scryNames(swaps.flatMap(c=>[c.n,c.up&&c.up.n,c.dn&&c.dn.n].filter(Boolean)),(d,t)=>statusLine(st,`Checking live prices and legality… ${d} / ${t}`)), st);
    swaps.forEach(applyLive);
    S.cards=S.cards.filter(c=>!(c.swapOut&&invalidReason(c)));
  }
  setBusy(false); render(); save(); paint();
  const n=S.cards.filter(c=>c.swapOut).length;
  if(errs.length) st.insertAdjacentHTML("beforeend",`<div class="err" style="flex-basis:100%">${esc(errMsg(errs[0]))}</div>`);
  else if(n){ toast(`${n} upgrade suggestions ready. Check the ones you want.`); $("poolSec").scrollIntoView({behavior:"smooth",block:"start"}); }
}
function toggleSwap(c,on){
  c.sel=on; const out=S.cards.find(x=>key(x.n)===key(c.swapOut)); if(out) out.sel=!on;
}

// ---------- Refine ----------
async function refine(){
  if(needClaude()) return;
  const req=$("refineText").value.trim(); if(!req){ $("refineText").focus(); return; }
  const st=$("refineStatus"); setBusy(true); statusLine(st,"Thinking about your request…");
  const ctl=new AbortController(); running=[ctl];
  try{
    const open=mainSize()-deckCount();
    const r=await sample.json(`${ctx()}\nBUDGET: ${S.budget?"$"+S.budget+(S.mode==="import"?" for upgrades":" for the deck"):"no limit"}; current ${S.mode==="import"?"upgrade spend":"deck total"} ${money(spent())}.\nCURRENT DECK (${deckCount()} of ${mainSize()} cards; ${open>0?open+" open slots":open<0?(-open)+" over":"full"}):\n${deckLines()}\n${S.edh?"\nLIVE DATA: other popular/high-synergy cards (EDHREC + Scryfall price):\n"+poolLines(100,S.cards.filter(c=>c.sel).map(c=>c.n)):""}\n\nTHE PLAYER ASKS: "${req}"\n\nThe player's words take priority over the budget. If they ask for expensive, premium or splurge cards, or say they have more money, suggest the highest-impact premium cards for THIS deck (usually $15+ each, Game Changers only if the bracket allows), each paired with the weakest or most replaceable card to cut. Say in the reply roughly what the changes cost in total. Otherwise stay within the budget.\nPropose concrete changes. Keep the deck at exactly ${mainSize()} cards: number of adds minus cuts must equal ${open}. Basic lands count as cards; to cut a basic, name it like "Island". Reply with only one JSON object:\n{"reply":"2-4 sentences explaining your approach in plain words","add":[{"n":"exact card name","c":"<payoff|engine|ramp|draw|removal|wipe|protection|land>","mv":<n>,"usd":<approx>,"w":"<2-3 sentence synergy write-up for this deck>"}],"cut":[{"n":"exact name of a card currently in the deck","why":"<max 14 words>"}]}`,{signal:ctl.signal,modelTier:"default",cache:false});
    S.refine={req,reply:String(r&&r.reply||""),add:(r&&Array.isArray(r.add)?r.add:[]).filter(a=>a&&a.n).slice(0,20),cut:(r&&Array.isArray(r.cut)?r.cut:[]).filter(a=>a&&a.n).slice(0,20),applied:false};
    if(LIVE&&S.refine.add.length){ statusLine(st,"Checking live prices…"); await liveTry(()=>scryNames(S.refine.add.map(a=>a.n)), st); }
    st.innerHTML=""; renderRefine(); save();
  }catch(e){ st.innerHTML = e&&e.code==="cancelled"?"":`<div class="err">${esc(errMsg(e))}</div>`; }
  finally{ running=[]; setBusy(false); }
}
function refineCosts(){
  const r=S.refine; if(!r) return null;
  const on=k=>{ const el=document.querySelector(`[data-prop="${k}"]`); return el?el.checked:false; };
  let add=0, cut=0, nAdd=0, nCut=0, unpriced=0;
  (r.add||[]).forEach((it,i)=>{ if(!on("a"+i)) return; nAdd++; const d=CARDDB[key(it.n)]; const p=(ownFree()&&owned(it.n))?0:d&&d.usd!=null?d.usd:(it.usd!=null?Number(it.usd):null); if(p==null) unpriced++; else add+=p; });
  (r.cut||[]).forEach((it,i)=>{ if(!on("c"+i)) return; nCut++; if(BASIC_NAMES.test(it.n)) return; const c=S.cards.find(x=>key(x.n)===key(it.n)&&x.sel); if(c && (S.mode!=="import"||c.o!=="deck")) cut+=cost(c); });
  const after=spent()+add-cut;
  return {add,cut,nAdd,nCut,unpriced,after,net:add-cut};
}
function updateRefineNet(){
  const el=$("refineNet"); if(!el) return; const c=refineCosts(); if(!c) return;
  const over = S.budget && c.after>S.budget;
  const label = S.mode==="import"?"upgrade spend":"deck";
  el.innerHTML = `${c.nAdd} add${c.nAdd===1?"":"s"}, ${c.nCut} cut${c.nCut===1?"":"s"} · <b>${c.net>=0?"+":"−"}${money(Math.abs(c.net))}</b> · ${label} becomes <b>${money(c.after)}</b>${S.budget?" of "+money(S.budget):""}${c.unpriced?` · ${c.unpriced} without a price`:""}`
    + (over?`<label class="toggle" style="margin-top:6px;color:var(--fg)"><input type="checkbox" id="raiseBudget" checked> Raise my budget to ${money(Math.ceil(c.after/25)*25)} when I apply these</label>`:"");
}
function applyRefine(){
  const r=S.refine; if(!r) return;
  const costs=refineCosts(); const raise=$("raiseBudget")&&$("raiseBudget").checked;
  const on=k=>{ const el=document.querySelector(`[data-prop="${k}"]`); return el?el.checked:false; };
  let a=0,c=0;
  r.add.forEach((it,i)=>{ if(!on("a"+i)) return; const ex=S.cards.find(x=>key(x.n)===key(it.n)); if(ex){ if(!ex.sel){ex.sel=true;a++;} return; } const card=addCard({n:it.n,c:it.c,mv:it.mv,s:8,usd:it.usd,w:it.w},{o:"added"}); if(card){ card.sel=!invalidReason(card); if(card.sel) a++; } });
  r.cut.forEach((it,i)=>{ if(!on("c"+i)) return;
    if(BASIC_NAMES.test(it.n)){ if(!S.basics){ S.basics=Object.fromEntries(basicsList()); } const k=Object.keys(S.basics).find(b=>key(b)===key(it.n)); if(k&&S.basics[k]>0){ S.basics[k]--; c++; } return; }
    const x=S.cards.find(x=>key(x.n)===key(it.n)&&x.sel); if(x){ x.sel=false; c++; } });
  r.applied=true;
  if(raise && costs && S.budget && spent()>S.budget) S.budget=Math.ceil(spent()/25)*25;
  toast(`Added ${a} and cut ${c} card${c===1?"":"s"}.${raise&&costs&&costs.after>0?" Budget is now "+money(S.budget)+".":""}`); render(); save();
}
async function refreshPrices(){
  if(!LIVE) return;
  const st=$("buildStatus"); setBusy(true);
  const names=[]; S.cards.forEach(c=>{ names.push(c.n); if(c.up) names.push(c.up.n); if(c.dn) names.push(c.dn.n); });
  names.forEach(n=>{ delete CARDDB[key(n)]; });
  await liveTry(()=>scryNames(names,(d,t)=>statusLine(st,`Refreshing live prices… ${d} / ${t}`)), st);
  S.cards.forEach(applyLive); S.example=false;
  setBusy(false); st.innerHTML=""; render(); save(); toast("Prices updated from Scryfall.");
}

// ================= collection =================
// Each entry is one card in one place: your general collection (loc "") or a named deck.
const COLL=new Map();           // ckey(name, loc) -> {n, q, t, loc}
let BYNAME=new Map();           // key(name) and front face -> {n, q (every place), locs:[{loc,q}]}
const LOCSEP="\u241f";
function ckey(n,loc){ return (loc?fold(loc).trim()+LOCSEP:"")+key(n); }
let cdb=null, cuid=null, collSync="loading", collErr="", flushing=false, flushT=null;
const dirty=new Set();
let collLimit=150, pendingUpload=null;
function reindexColl(){
  BYNAME=new Map();
  const add=(k,v)=>{ let e=BYNAME.get(k); if(!e){ e={n:v.n,q:0,locs:[]}; BYNAME.set(k,e); } e.q+=v.q; e.locs.push({loc:v.loc||"",q:v.q}); };
  for(const v of COLL.values()){ const k=key(v.n); add(k,v); const f=k.split(" // ")[0]; if(f!==k) add(f,v); }
}
function owned(name){ if(!COLL.size||!name) return null; const k=key(name); return BYNAME.get(k)||BYNAME.get(k.split(" // ")[0])||null; }
// "in Vivi Storm" / "also in Vivi Storm" when some copies sit in a deck.
function ownedWhere(o){ if(!o) return ""; const decks=[...new Set(o.locs.filter(l=>l.loc).map(l=>l.loc))]; if(!decks.length) return ""; return (o.locs.some(l=>!l.loc)?"also in ":"in ")+decks.join(", "); }
function decksList(){ const m=new Map(); for(const v of COLL.values()) if(v.loc){ const e=m.get(v.loc)||{name:v.loc,cards:0,copies:0}; e.cards++; e.copies+=v.q; m.set(v.loc,e); } return [...m.values()].sort((a,b)=>a.name.localeCompare(b.name)); }
function uniqueCards(){ return new Set([...COLL.values()].map(v=>key(v.n))).size; }
const locLabel = loc => loc ? `deck “${loc}”` : "your general collection";
function bucket(k){ const ch=fold(k).charAt(0); return /[a-z]/.test(ch)?ch:"_"; }
function cleanName(n){
  return String(n||"").replace(/\s+\([A-Za-z0-9]{2,8}\)(\s+[\w\-★†]+)?\s*$/,"").replace(/\s\*[A-Za-z]+\*$/,"").replace(/\s+/g," ").replace(/^["']|["']$/g,"").trim();
}
function collMutate(fn, undoLabel){
  const before = undoLabel ? new Map([...COLL].map(([k,v])=>[k,Object.assign({},v)])) : null;
  const touched=fn();
  if(Array.isArray(touched)) touched.forEach(k=>dirty.add(bucket(k)));
  if(touched==="all"){ "abcdefghijklmnopqrstuvwxyz_".split("").forEach(b=>dirty.add(b)); }
  reindexColl(); saveCollLocal(); scheduleFlush(); collLimit=Math.max(collLimit,150);
  renderCollection(); renderPool(); renderDeck(); renderOwnedToggles();
  if(before) return ()=>{ collMutate(()=>{ COLL.clear(); before.forEach((v,k)=>COLL.set(k,v)); return "all"; }); };
}
function collAddMany(list, mode, loc){ // list: [{n,q}]; mode: add | replace (replace only empties that place)
  loc=String(loc||"").trim();
  return collMutate(()=>{
    const t=Date.now(); const touched=[];
    if(mode==="replace"){ for(const [k,v] of [...COLL]) if((v.loc||"")===loc) COLL.delete(k); }
    list.forEach(({n,q})=>{ const k=ckey(n,loc); if(!key(n)) return; const cur=COLL.get(k); if(cur){ cur.q+=q; cur.t=t; } else COLL.set(k,{n,q,t,loc}); touched.push(k); });
    return mode==="replace"?"all":touched;
  }, true);
}
function collSet(name,q,loc){
  loc=String(loc||"").trim();
  return collMutate(()=>{ const k=ckey(name,loc); const cur=COLL.get(k); if(q<=0){ COLL.delete(k); } else if(cur){ cur.q=q; } else COLL.set(k,{n:name,q,t:Date.now(),loc}); return [k]; }, q<=0);
}
function deleteLocation(loc){ return collMutate(()=>{ for(const [k,v] of [...COLL]) if((v.loc||"")===loc) COLL.delete(k); return "all"; },true); }
function moveLocation(from,to){ return collMutate(()=>{ const t=Date.now(); for(const [k,v] of [...COLL]) if((v.loc||"")===from){ COLL.delete(k); const nk=ckey(v.n,to); const cur=COLL.get(nk); if(cur) cur.q+=v.q; else COLL.set(nk,{n:v.n,q:v.q,t,loc:to}); } return "all"; },true); }
// "100 cards (82 different)" when copies and unique names differ, else "82 cards".
function cardCount(list){ const copies=list.reduce((a,c)=>a+(Number(c.q)||1),0), uniq=list.length; return copies===uniq ? `${uniq.toLocaleString()} card${uniq===1?"":"s"}` : `${copies.toLocaleString()} cards (${uniq.toLocaleString()} different)`; }
function clearCollection(){ return collMutate(()=>{ COLL.clear(); return "all"; },true); }
const collTuple = v => [v.n,v.q,v.t||0,v.loc||""];
function collLoadTuples(list){ (list||[]).forEach(([n,q,t,loc])=>{ if(!n) return; loc=String(loc||""); COLL.set(ckey(n,loc),{n,q:Number(q)||1,t:Number(t)||0,loc}); }); }
function saveCollLocal(){ try{ localStorage.setItem("cforge.collection", JSON.stringify([...COLL.values()].map(collTuple))); }catch(e){} }
function loadCollLocal(){ try{ collLoadTuples(JSON.parse(localStorage.getItem("cforge.collection")||"[]")); }catch(e){} reindexColl(); }
function setSync(st,err){ collSync=st; collErr=err||""; renderSyncChip(); }
function scheduleFlush(){ clearTimeout(flushT); flushT=setTimeout(flushColl,900); }
async function flushColl(){
  if(SERVER){
    if(flushing||!dirty.size) return; flushing=true; setSync("saving"); dirty.clear();
    try{ const r=await fetch("api/collection",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:[...COLL.values()].map(collTuple)})}); if(!r.ok) throw 0; setSync("cloud"); }
    catch(e){ setSync("error","Couldn't reach your server."); "_".split("").forEach(b=>dirty.add(b)); }
    flushing=false; if(dirty.size) scheduleFlush(); return;
  }
  if(!cdb||!cuid||flushing||!dirty.size) return;
  flushing=true; setSync("saving");
  try{
    while(dirty.size){
      const b=[...dirty][0]; dirty.delete(b);
      const items=[]; for(const [k,v] of COLL) if(bucket(k)===b) items.push(collTuple(v));
      const ref=cdb.doc(`data/users/${cuid}/coll-${b}`);
      if(items.length) await ref.set({items}); else await ref.delete();
    }
    setSync("cloud");
  }catch(e){ setSync("error", e&&e.code==="quota_exceeded"?"Your account's storage for this page is full.":e&&e.code==="invalid_argument"?"One letter of your collection is too large to save in one piece.":"Couldn't reach your account just now."); }
  flushing=false;
  if(dirty.size) scheduleFlush();
}
async function initCollectionStore(){
  if(SERVER){
    try{
      const j=await fetch("api/collection").then(r=>r.json());
      // The server's list always wins, so cards deleted on one device don't come back from another browser's copy.
      COLL.clear(); collLoadTuples(j.items); reindexColl(); saveCollLocal(); setSync("cloud");
    }catch(e){ setSync("error","Couldn't reach your server."); }
    await loadMetaRemote();
    renderCollection(); renderPool(); renderDeck(); renderOwnedToggles(); return;
  }
  try{
    const db=await window.claude.use("db"); const user=await window.claude.use("user");
    if(!db||!user){ setSync("local"); return; }
    const id=await user.id(); if(!id){ setSync("local"); return; }
    cdb=db; cuid=id;
    const snap=await db.collection("data/users/"+id).get();
    const docs=snap.docs.filter(d=>d.exists&&/^coll-/.test(d.id));
    if(docs.length){
      COLL.clear();
      docs.forEach(d=>{ const body=d.data()||{}; collLoadTuples(body.items); });
      reindexColl(); saveCollLocal(); setSync("cloud");
    } else if(COLL.size){
      "abcdefghijklmnopqrstuvwxyz_".split("").forEach(b=>dirty.add(b)); setSync("saving"); await flushColl();
    } else setSync("cloud");
  }catch(e){ setSync("local"); }
  await loadMetaRemote();
  renderCollection(); renderPool(); renderDeck(); renderOwnedToggles();
}
function renderSyncChip(){
  const el=$("collSync"); if(!el) return;
  const t={loading:"Loading…",cloud:SERVER?"Saved on your server":"Saved to your Claude account",saving:"Saving…",local:"Saved in this browser only",error:collErr+" Saved in this browser for now."}[collSync]||"";
  el.className="sync "+collSync; el.lastElementChild.textContent=t;
}
function ownedHint(){
  if(!COLL.size || S.preferOwned===false) return "";
  let names=[];
  if(S.edh&&S.edh.pool.length) names=S.edh.pool.filter(p=>owned(p.n)).map(p=>owned(p.n).n);
  else names=[...COLL.values()].filter(v=>{ const d=CARDDB[key(v.n)]; return d && d.legal==="legal" && !d.ci.some(x=>!S.colors.includes(x)) && !/basic land/i.test(d.type); }).map(v=>v.n);
  names=[...new Set(names)].slice(0,220);
  if(!names.length) return "";
  return `THE PLAYER ALREADY OWNS these cards that fit this commander. They cost the player nothing, so pick them whenever they are comparable to a paid option, and mention in the write-up when a pick is one they own: ${names.join("; ")}.`;
}
function ownedFitCount(){ if(!COLL.size) return 0; if(S.edh&&S.edh.pool.length) return S.edh.pool.filter(p=>owned(p.n)).length; return 0; }
function renderOwnedToggles(){
  const has=COLL.size>0;
  $("preferOwnedRow").hidden=!has; $("ownedOnlyRow").hidden=!has; $("ownedFreeRow").hidden=!has;
  $("preferOwned").checked=S.preferOwned!==false; $("ownedFree").checked=S.ownedFree!==false;
  $("ownedHintCount").textContent=ownedFitCount()||"some";
  $("importOwnRow").hidden=!(S.mode==="import"&&S.cards.some(c=>c.o==="deck"));
  $("collCount").textContent = COLL.size? " "+uniqueCards().toLocaleString() : "";
}
function shopList(){ return S.cards.filter(c=>c.sel && !owned(c.n) && !(S.mode==="import"&&c.o==="deck")); }
function renderShop(){
  const box=$("shopBox"); if(!box) return;
  const list=shopList();
  box.hidden = !S.cards.length || !COLL.size;
  if(box.hidden) return;
  const sel=S.cards.filter(c=>c.sel); const own=sel.filter(c=>owned(c.n));
  const ownVal=own.reduce((a,c)=>a+(c.usd||0),0), buy=list.reduce((a,c)=>a+(c.usd||0),0);
  $("shopSum").innerHTML = `<div class="ledger"><span>You own</span><span>${own.length} cards · ${money(ownVal)}</span><span>To buy</span><span>${list.length} cards · ${money(buy)}</span></div>`;
  $("shopCopy").disabled=!list.length; $("shopBought").disabled=!list.length;
  const mass=list.map(c=>"1 "+c.n).join("||");
  $("shopTcg").href="https://www.tcgplayer.com/massentry?productline=Magic&c="+encodeURIComponent(mass);
  $("shopTcg").hidden=!list.length;
}
function renderCollection(){
  if(!$("collectionView")) return;
  renderSyncChip(); renderOwnedToggles();
  let copies=0; COLL.forEach(v=>copies+=v.q);
  const sel=S.cards.filter(c=>c.sel); const ownDeck=sel.filter(c=>owned(c.n)).length;
  const decks=decksList();
  renderDest(); renderLocFilter(decks); renderDecks();
  $("collStats").innerHTML = `<div><b>${uniqueCards().toLocaleString()}</b><span>different cards</span></div><div><b>${copies.toLocaleString()}</b><span>total copies</span></div><div><b>${decks.length}</b><span>deck${decks.length===1?"":"s"}</span></div>`
    + (sel.length&&S.commanders.length?`<div><b>${ownDeck} / ${sel.length}</b><span>non-basic cards in your ${esc(S.commanders[0].name.split(",")[0])} build that you own</span></div>`:"");
  const q=fold($("collSearch").value.trim()), sort=$("collSort").value, where=$("collLoc").value||"*", place=where==="__gen"?"":where;
  let rows=[...COLL.values()]; if(where!=="*") rows=rows.filter(v=>(v.loc||"")===place); if(q) rows=rows.filter(v=>fold(v.n).includes(q));
  const cg=sort==="color";
  const allRows=rows;
  if(COLLCF.size) rows=rows.filter(v=>COLLCF.has(colorGroup(v.n)));
  rows.sort(cg?(a,b)=>colorGroup(a.n)-colorGroup(b.n)||ciKey(a.n).localeCompare(ciKey(b.n))||a.n.localeCompare(b.n):sort==="qty"?(a,b)=>b.q-a.q||a.n.localeCompare(b.n):sort==="recent"?(a,b)=>(b.t||0)-(a.t||0)||a.n.localeCompare(b.n):(a,b)=>a.n.localeCompare(b.n));
  loadCollColors(cg||COLLCF.size ? allRows : rows.slice(0,collLimit));
  renderColorBar(allRows);
  const inDeck=new Set(sel.map(c=>key(c.n)));
  if(!COLL.size){ $("collTable").innerHTML='<div class="empty">No cards yet. Upload a spreadsheet or add cards above, and the deck builder will start marking what you own.</div>'; return; }
  if(!rows.length){ $("collTable").innerHTML=`<div class="empty">${q?"No cards match that search here.":COLLCF.size?"No cards of those colors here.":"Nothing here yet."}</div>`; return; }
  const row=v=>{ const d=CARDDB[key(v.n)];
    return `<div class="crow"><span class="cn"><span class="cnl"><a href="${sfUrl(v.n)}" target="_blank" rel="noopener">${esc(v.n)}</a>${where==="*"&&v.loc?` <span class="tag deckloc">${esc(v.loc)}</span>`:""}${inDeck.has(key(v.n))?' <span class="tag info">In current build</span>':""}</span>${d&&d.type?`<span class="ctype">${esc(d.type)}</span>`:""}</span><span class="ccost">${d&&d.mana?pips(d.mana):""}</span><span class="step-q"><button type="button" data-cq="${esc(ckey(v.n,v.loc))}" data-d="-1" aria-label="One fewer ${esc(v.n)}">−</button><span>${v.q}</span><button type="button" data-cq="${esc(ckey(v.n,v.loc))}" data-d="1" aria-label="One more ${esc(v.n)}">+</button></span><button type="button" class="btn small ghost" data-crm="${esc(ckey(v.n,v.loc))}">Remove</button></div>`; };
  const vis=rows.slice(0,collLimit);
  let html="";
  if(cg){
    const tot={}; rows.forEach(v=>{ const g=colorGroup(v.n); const t=tot[g]||(tot[g]={cards:0,copies:0}); t.cards++; t.copies+=v.q; });
    let cur=-1, open=false;
    vis.forEach(v=>{ const g=colorGroup(v.n);
      if(g!==cur){ if(open) html+="</div></section>"; cur=g; open=true;
        html+=`<section class="cgsec g${g}"><header class="cghead">${groupSym(g)}<h3>${COLOR_GROUPS[g]}</h3><span class="cnt">${tot[g].cards.toLocaleString()} card${tot[g].cards===1?"":"s"} · ${tot[g].copies.toLocaleString()} cop${tot[g].copies===1?"y":"ies"}</span></header><div class="cgbody">`; }
      html+=row(v); });
    if(open) html+="</div></section>";
  } else html=`<div class="cglist">${vis.map(row).join("")}</div>`;
  $("collTable").innerHTML = html
    + (rows.length>collLimit?`<div class="row" style="padding:10px 0"><button type="button" class="btn small" id="collMore">Show ${Math.min(150,rows.length-collLimit)} more</button><span class="note">Showing ${collLimit} of ${rows.length.toLocaleString()}</span></div>`:"");
}
// ---------- sort by color ----------
const COLLCF=new Set();   // color groups the card list is filtered to (empty = all)
function groupSym(g){ return g<=4?manaSym("WUBRG"[g]):g===5?manaSym("M"):g===6?manaSym("C"):g===7?manaSym("L"):manaSym("Q"); }
function renderColorBar(rows){
  const el=$("collColors"); if(!el) return;
  const cnt={}; rows.forEach(v=>{ const g=colorGroup(v.n); cnt[g]=(cnt[g]||0)+v.q; });
  const groups=[0,1,2,3,4,5,6,7].concat(cnt[8]?[8]:[]);
  el.innerHTML=groups.map(g=>`<button type="button" class="cbtn" data-cg="${g}" aria-pressed="${COLLCF.has(g)}" title="${COLOR_GROUPS[g]}">${groupSym(g)}<span>${(cnt[g]||0).toLocaleString()}</span></button>`).join("")
    + (COLLCF.size?`<button type="button" class="btn small ghost" data-cg="all">Show all colors</button>`:"");
}
const COLOR_GROUPS=["White","Blue","Black","Red","Green","Multicolor","Colorless","Lands","Color not known yet"];
function cardCi(n){ const d=CARDDB[key(n)]; if(d) return d.ci; const c=cmdInfo(n); return c?c.ci.split("").filter(Boolean):null; }
function colorGroup(n){ if(BASIC_NAMES.test(n)) return 7; const d=CARDDB[key(n)]; if(d&&isLandCard(n,d)) return 7; const ci=cardCi(n); if(!ci) return 8; return ci.length>1?5:ci.length?"WUBRG".indexOf(ci[0]):6; }
function ciKey(n){ const ci=cardCi(n)||[]; return ["W","U","B","R","G"].filter(c=>ci.includes(c)).join(""); }
let colorsLoading=false;
async function loadCollColors(rows){
  if(colorsLoading||!LIVE) { if(!LIVE&&($("collSort").value==="color"||COLLCF.size)&&rows.some(v=>colorGroup(v.n)===8)) $("collNote").textContent="Colors and mana costs need live card data, so some cards show as “not known yet”."; return; }
  const need=[...new Set(rows.filter(v=>!CARDDB[key(v.n)]&&!BASIC_NAMES.test(v.n)).map(v=>v.n))]; if(!need.length){ $("collNote").textContent=""; return; }
  colorsLoading=true;
  await liveTry(()=>scryNames(need.slice(0,3000),(d,t)=>{ if(t>40) $("collNote").textContent=`Looking up card colors and costs… ${d} / ${t}`; }));
  colorsLoading=false; $("collNote").textContent=""; renderCollection();
}
function collRows(){ const w=$("collLoc").value||"*", place=w==="__gen"?"":w; return [...COLL.values()].filter(v=>w==="*"||(v.loc||"")===place).sort((a,b)=>(a.loc||"").localeCompare(b.loc||"")||a.n.localeCompare(b.n)); }
function collCSV(){ const q=s=>'"'+String(s).replace(/"/g,'""')+'"'; return "Quantity,Name,Location\n"+collRows().map(v=>v.q+","+q(v.n)+","+q(v.loc||"General collection")).join("\n"); }
function collText(){ return collRows().map(v=>v.q+" "+v.n).join("\n"); }
// Where new cards go: general collection, an existing deck, or a new deck you name.
function renderDest(){
  const sel=$("collDest"); if(!sel) return; const cur=sel.value; const decks=decksList();
  sel.innerHTML=`<option value="">General collection</option>${decks.length?`<optgroup label="Decks">${decks.map(d=>`<option value="${esc(d.name)}">${esc(d.name)} (${d.copies})</option>`).join("")}</optgroup>`:""}<option value="__new">New deck…</option>`;
  sel.value = Array.from(sel.options||[]).some(o=>o.value===cur) ? cur : (cur==="__new" ? "__new" : "");
  $("collDestName").hidden = sel.value!=="__new";
}
function currentDest(){ const v=$("collDest").value; if(v!=="__new") return {ok:true,loc:v}; const n=($("collDestName").value||"").trim().slice(0,80); return n?{ok:true,loc:n}:{ok:false}; }
function needDest(){ const d=currentDest(); if(!d.ok){ $("collDestName").focus(); toast("Name the deck first, in “Where are these cards?”."); } return d; }
function afterDest(loc){ if($("collDest").value==="__new"){ $("collDestName").value=""; renderDest(); $("collDest").value=loc; renderDest(); } }
function renderLocFilter(decks){
  const sel=$("collLoc"); if(!sel) return; const cur=sel.value||"*";
  const gen=[...COLL.values()].filter(v=>!v.loc).reduce((a,v)=>a+v.q,0);
  sel.innerHTML=`<option value="*">Everything</option><option value="__gen">General collection (${gen})</option>${decks.map(d=>`<option value="${esc(d.name)}">${esc(d.name)} (${d.copies})</option>`).join("")}`;
  sel.value=Array.from(sel.options||[]).some(o=>o.value===cur)?cur:"*";
  const isDeck=sel.value!=="*"&&sel.value!=="__gen"&&sel.value!=="";
  if($("locActions")) $("locActions").hidden=!isDeck;
}

// ================= deck shelf (decks kept in My collection) =================
// Per-deck extras live in DECKMETA[deckName]: {commanders:[], desc:{...}, descSig, descAt, sugg:{...}, suggSig, suggAt}.
let DECKMETA={}, OPENDECK=null, metaT=null;
const DECKBUSY={}, DECKERR={};
const deckEntries = loc => [...COLL.values()].filter(v=>v.loc===loc);
const deckCopies = loc => deckEntries(loc).reduce((a,v)=>a+v.q,0);
function hashStr(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36); }
// Changes whenever the deck's cards or commander change, so saved write-ups can say they're out of date.
function deckSig(loc){ return hashStr(deckEntries(loc).map(v=>v.q+" "+key(v.n)).sort().join("|")+"#"+deckCommanders(loc).map(key).join("+")); }
let CMDSET=null;
function isCommanderName(n){ if(!CMDSET&&CMDS.length) CMDSET=new Set(CMDS.flatMap(c=>{ const k=key(c.n); return [k,k.split(" // ")[0]]; })); const k=key(n); return !!CMDSET&&(CMDSET.has(k)||CMDSET.has(k.split(" // ")[0])); }
function cmdInfo(n){ const k=key(n).split(" // ")[0]; return CMDS.find(c=>key(c.n)===key(n)||key(c.n).split(" // ")[0]===k)||null; }
function commanderCandidates(loc){
  return deckEntries(loc).filter(v=>{ const d=CARDDB[key(v.n)]; return isCommanderName(v.n)||(d&&/legendary/i.test(d.type)&&/creature|planeswalker/i.test(d.type)); }).map(v=>v.n).sort((a,b)=>a.localeCompare(b));
}
function deckCommanders(loc){
  const m=DECKMETA[loc]||{}, here=new Set(deckEntries(loc).map(v=>key(v.n)));
  if(m.commanders&&m.commanders.length) return m.commanders.filter(n=>here.has(key(n)));
  const c=commanderCandidates(loc); return c.length===1?c:[];
}
function deckColors(loc){
  const ci=new Set();
  deckCommanders(loc).forEach(n=>{ const d=CARDDB[key(n)]; const c=cmdInfo(n); ((d&&d.ci)||(c?c.ci.split(""):[])).forEach(x=>ci.add(x)); });
  return ["W","U","B","R","G"].filter(x=>ci.has(x));
}
function deckStats(loc){
  const e=deckEntries(loc); let value=0, priced=0, lands=0, mvSum=0, mvN=0, gc=0;
  e.forEach(v=>{ const d=CARDDB[key(v.n)]; if(d&&d.usd!=null){ value+=d.usd*v.q; priced++; } const isLand=BASIC_NAMES.test(v.n)||(d&&/\bLand\b/.test(d.type)&&!/Creature/.test(d.type)); if(isLand) lands+=v.q; else if(d){ mvSum+=d.mv*v.q; mvN+=v.q; } if(isGC(v.n)||(d&&d.gc)) gc++; });
  return {copies:deckCopies(loc), value, priced, known:e.filter(v=>CARDDB[key(v.n)]).length, total:e.length, lands, avgMv:mvN?mvSum/mvN:null, gc};
}
function setMeta(loc,patch){ DECKMETA[loc]=Object.assign({},DECKMETA[loc]||{},patch); persistMeta(); }
function persistMeta(){ try{ localStorage.setItem("cforge.deckmeta",JSON.stringify(DECKMETA)); }catch(e){} clearTimeout(metaT); metaT=setTimeout(pushMeta,600); }
async function pushMeta(){ try{ if(SERVER) await fetch("api/decks",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({decks:DECKMETA})}); else if(cdb&&cuid) await cdb.doc(`data/users/${cuid}/meta-decks`).set({decks:DECKMETA}); }catch(e){} }
function loadMetaLocal(){ try{ DECKMETA=JSON.parse(localStorage.getItem("cforge.deckmeta")||"{}")||{}; }catch(e){ DECKMETA={}; } }
async function loadMetaRemote(){
  try{
    if(SERVER){ const j=await fetch("api/decks").then(r=>r.json()); if(j&&j.decks&&typeof j.decks==="object") DECKMETA=j.decks; }
    else if(cdb&&cuid){ const d=await cdb.doc(`data/users/${cuid}/meta-decks`).get(); if(d.exists) DECKMETA=(d.data()||{}).decks||{}; }
    try{ localStorage.setItem("cforge.deckmeta",JSON.stringify(DECKMETA)); }catch(e){}
  }catch(e){}
  renderDecks();
}
function renameDeck(from,to){
  to=String(to||"").trim().slice(0,80); if(!to||to===from) return false;
  const undo=moveLocation(from,to);
  if(DECKMETA[from]){ DECKMETA[to]=Object.assign({},DECKMETA[to]||{},DECKMETA[from]); delete DECKMETA[from]; persistMeta(); }
  if(OPENDECK===from) OPENDECK=to;
  if($("collLoc").value===from){ renderCollection(); $("collLoc").value=to; }
  return undo;
}
function deckListText(loc){
  return deckEntries(loc).sort((a,b)=>a.n.localeCompare(b.n)).map(v=>{ const d=CARDDB[key(v.n)]; return `${v.q} ${v.n}${d?` | ${d.type}${d.mana?" "+d.mana:""}`:""}`; }).join("\n");
}
function deckCmdText(loc){ const c=deckCommanders(loc); return c.length ? c.map(n=>{ const d=CARDDB[key(n)]; return n+(d&&d.text?" — "+d.text.replace(/\n/g," "):""); }).join(" | ") : "not set; infer the most likely commander from the list"; }
const firstObj = r => Array.isArray(r) ? (r.find(x=>x&&typeof x==="object"&&!Array.isArray(x))||{}) : (r&&typeof r==="object"?r:{});
const arr = (x,n) => (Array.isArray(x)?x:x?[x]:[]).map(v=>typeof v==="object"&&v?(v.text||v.name||v.n||JSON.stringify(v)):String(v)).filter(Boolean).slice(0,n||8);
async function loadDeckData(loc){ if(LIVE){ await liveTry(()=>scryNames(deckEntries(loc).map(v=>v.n))); } renderDecks(); }
async function describeDeck(loc){
  if(needClaude()) return;
  DECKBUSY[loc]="desc"; delete DECKERR[loc]; renderDecks();
  try{
    await loadDeckData(loc);
    const r=firstObj(await sample.json(`You are an expert Magic: The Gathering Commander player. Explain how this player's deck works, based only on the cards in it.
COMMANDER: ${deckCmdText(loc)}
DECK (${deckCopies(loc)} cards, "count name | type cost"):
${deckListText(loc)}

Reply with only one JSON object:
{"style":"3-6 word archetype, e.g. Izzet spellslinger storm","summary":"3-4 sentences on how the deck plays and wins, naming key cards","phases":["Early game: ...","Mid game: ...","Late game: ..."],"winCons":["2-4 concrete ways it wins, naming the cards"],"engines":["2-4 key synergies or engines, naming the cards"],"strengths":["2-3 short points"],"weaknesses":["2-3 short points"],"bracket":<estimated Commander bracket 1-5>,"bracketWhy":"one sentence"}`,{modelTier:"default"}));
    const desc={style:String(r.style||r.archetype||""),summary:String(r.summary||r.description||r.overview||""),phases:arr(r.phases||r.plan,4),winCons:arr(r.winCons||r.wincons||r.win_conditions,5),engines:arr(r.engines||r.synergies,5),strengths:arr(r.strengths,4),weaknesses:arr(r.weaknesses,4),bracket:Number(r.bracket)||null,bracketWhy:String(r.bracketWhy||r.bracket_why||"")};
    if(!desc.summary) throw {code:"no_desc",message:"The AI's answer didn't include a description. Try Regenerate."};
    setMeta(loc,{desc,descSig:deckSig(loc),descAt:Date.now(),descModel:(LAST_AI&&LAST_AI.model)||""});
  }catch(e){ if(!(e&&e.code==="cancelled")) DECKERR[loc]={part:"desc",msg:errMsg(e)}; }
  delete DECKBUSY[loc]; renderDecks();
}
async function suggestDeck(loc){
  if(needClaude()) return;
  DECKBUSY[loc]="sugg"; delete DECKERR[loc]; renderDecks();
  try{
    await loadDeckData(loc);
    const here=new Set(deckEntries(loc).map(v=>key(v.n)));
    const spare=[...COLL.values()].filter(v=>!v.loc&&!here.has(key(v.n))&&!BASIC_NAMES.test(v.n)).map(v=>v.n).slice(0,250);
    const desc=(DECKMETA[loc]||{}).desc;
    const r=firstObj(await sample.json(`You are an expert Magic: The Gathering Commander coach. Help the player pilot and improve this deck.
COMMANDER: ${deckCmdText(loc)}
DECK (${deckCopies(loc)} cards, "count name | type cost"):
${deckListText(loc)}
${desc&&desc.summary?`HOW IT WORKS (earlier analysis): ${desc.summary}\n`:""}${spare.length?`CARDS THE PLAYER OWNS BUT ISN'T USING (prefer these for adds when they fit; they cost nothing): ${spare.join("; ")}\n`:""}
Suggest 5-8 swaps. Every add must be Commander-legal and inside the commander's color identity, and must not already be in the deck. Pair each add with the card it replaces.
Reply with only one JSON object:
{"howToPlay":["4-6 short, specific piloting tips for this list"],"mulligan":"1-2 sentences on what to keep","swaps":[{"add":"card name","cut":"card in the deck","why":"one sentence"}],"styleShift":"1-2 sentences on one different direction this deck could go"}`,{modelTier:"default"}));
    const sw=(Array.isArray(r.swaps)?r.swaps:[]).concat((Array.isArray(r.adds)?r.adds:[]).map(a=>({add:a.n||a.name||a.add,cut:a.replaces||a.cut,why:a.why}))).filter(x=>x&&(x.add||x.cut)).slice(0,10).map(x=>({add:String(x.add||x.in||""),cut:String(x.cut||x.out||""),why:String(x.why||x.reason||"")}));
    const sugg={howToPlay:arr(r.howToPlay||r.tips||r.play,8),mulligan:String(r.mulligan||""),swaps:sw,styleShift:String(r.styleShift||r.style_shift||"")};
    if(!sugg.howToPlay.length&&!sugg.swaps.length) throw {code:"no_sugg",message:"The AI's answer didn't include suggestions. Try again."};
    setMeta(loc,{sugg,suggSig:deckSig(loc),suggAt:Date.now()});
    if(LIVE&&sw.length) await liveTry(()=>scryNames(sw.map(x=>x.add).filter(Boolean)));
  }catch(e){ if(!(e&&e.code==="cancelled")) DECKERR[loc]={part:"sugg",msg:errMsg(e)}; }
  delete DECKBUSY[loc]; renderDecks();
}
async function openDeckInBuilder(loc, playtest){
  const cmds=deckCommanders(loc), ck=new Set(cmds.map(key));
  const text=cmds.map(n=>`1x ${n} [Commander{top}]`).concat(deckEntries(loc).filter(v=>!ck.has(key(v.n))).map(v=>`${v.q} ${v.n}`)).join("\n");
  if(DIRTY && !confirmLeaveBuild()) return;
  S.mode="import"; S.importText=text; showView("builder"); render(); $("importText").value=text;
  await importDeck();
  S.savedName=loc; $("deckName").value=loc; DIRTY=false; renderSaveBar();
  if(playtest){ $("testSec").hidden=false; $("testSec").scrollIntoView({behavior:"smooth",block:"start"}); setTimeout(runPlaytest,60); }
  else window.scrollTo&&window.scrollTo({top:0,behavior:"smooth"});
}
let leaveAskedAt=0;
function confirmLeaveBuild(){ if(Date.now()-leaveAskedAt<6000){ leaveAskedAt=0; return true; } leaveAskedAt=Date.now(); toast("Your current build has unsaved changes. Click again to replace it, or save it first."); return false; }
const ago = t => { if(!t) return ""; const m=Math.round((Date.now()-t)/60000); return m<1?"just now":m<60?m+" min ago":m<1440?Math.round(m/60)+" h ago":new Date(t).toLocaleDateString(); };
function bandStyle(cols){ const v=(cols.length?cols:["C"]).map(c=>`var(--m${c})`); return `background:${v.length===1?v[0]:`linear-gradient(90deg,${v.join(",")})`}`; }
function renderDecks(){
  const grid=$("deckGrid"); if(!grid) return;
  const decks=decksList();
  if(OPENDECK && !decks.some(d=>d.name===OPENDECK)) OPENDECK=null;
  if(!decks.length){ grid.innerHTML=`<div class="empty" style="grid-column:1/-1">No decks yet. Choose <b>New deck…</b> under “Where are these cards?”, name it, then upload or paste its list.</div>`; $("deckDetail").innerHTML=""; return; }
  grid.innerHTML=decks.map(d=>{ const m=DECKMETA[d.name]||{}, cmds=deckCommanders(d.name), cols=deckColors(d.name), st=deckStats(d.name);
    const line=m.desc&&(m.desc.style||m.desc.summary.split(/(?<=\.)\s/)[0]);
    return `<button type="button" class="decktile ${OPENDECK===d.name?"on":""}" data-deck="${esc(d.name)}" aria-pressed="${OPENDECK===d.name}">
      <span class="dt-band" style="${bandStyle(cols)}"></span>
      <span class="dt-name">${esc(d.name)}</span>
      <span class="dt-cmd">${cmds.length?esc(cmds.join(" + ")):'<span class="muted">Commander not set</span>'}</span>
      <span class="dt-row">${cols.length?colorPips(cols):""}<span class="dt-meta">${st.copies} card${st.copies===1?"":"s"}${st.copies===100?" · full deck":""}${st.priced?" · "+money(st.value):""}</span></span>
      <span class="dt-sum">${line?esc(line):'<span class="muted">No write-up yet</span>'}</span>
    </button>`; }).join("");
  renderDeckDetail();
}
function renderDeckDetail(){
  const el=$("deckDetail"); if(!el) return;
  const loc=OPENDECK; if(!loc){ el.innerHTML=""; return; }
  const m=DECKMETA[loc]||{}, cmds=deckCommanders(loc), cand=commanderCandidates(loc), cols=deckColors(loc), st=deckStats(loc), sig=deckSig(loc), busy=DECKBUSY[loc], err=DECKERR[loc];
  const opts=(sel)=>cand.map(n=>`<option value="${esc(n)}" ${sel&&key(sel)===key(n)?"selected":""}>${esc(n)}</option>`).join("");
  const cmdUi = cand.length ? `<label class="f">Commander<select data-dcmd="0"><option value="">Pick the commander…</option>${opts(cmds[0])}</select></label>
      <label class="f">Partner (optional)<select data-dcmd="1"><option value="">No partner</option>${cand.filter(n=>!cmds[0]||key(n)!==key(cmds[0])).map(n=>`<option value="${esc(n)}" ${cmds[1]&&key(cmds[1])===key(n)?"selected":""}>${esc(n)}</option>`).join("")}</select></label>`
    : `<div class="note">None of this deck's cards is a legal commander. Add your commander with “Where are these cards?” set to this deck.</div>`;
  const d=m.desc, stale=d&&m.descSig!==sig, sg=m.sugg, sstale=sg&&m.suggSig!==sig;
  const list=(t,a)=>a&&a.length?`<div><span class="eyebrow">${t}</span><ul>${a.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:"";
  const descHtml = busy==="desc" ? '<div class="progress"><span class="dot"></span> Reading the deck and writing how it works…</div>'
    : d ? `${stale?'<div class="warnbox small">The cards or commander changed since this was written. Regenerate to update it.</div>':""}
      ${d.style?`<div class="dd-style">${esc(d.style)}</div>`:""}<p class="dd-sum">${esc(d.summary)}</p>
      ${d.phases.length?`<div class="phase">${d.phases.map((p,i)=>`<div><span class="eyebrow">${["Early game","Mid game","Late game"][i]||"Then"}</span>${esc(String(p).replace(/^(early|mid|late)(\s*game)?:\s*/i,""))}</div>`).join("")}</div>`:""}
      <div class="dd-cols">${list("Ways it wins",d.winCons)}${list("Key engines",d.engines)}${list("Strengths",d.strengths)}${list("Weak spots",d.weaknesses)}</div>
      ${d.bracket?`<div class="small"><b>Estimated bracket ${d.bracket}.</b> ${esc(d.bracketWhy)}</div>`:""}
      <div class="note">Written ${ago(m.descAt)}${m.descModel?" by "+esc(m.descModel):""}.</div>`
    : '<p class="muted">No write-up yet. The AI reads the cards and explains the game plan, win conditions and weak spots.</p>';
  const swapRow=x=>{ const ow=x.add&&owned(x.add), dd=x.add&&CARDDB[key(x.add)]; return `<li><span class="p">+ ${esc(x.add||"—")}</span>${ow?' <span class="tag own">Owned</span>':""}${dd&&dd.usd!=null?` <span class="muted small">${money(dd.usd)}</span>`:""}${x.cut?` <span class="m">− ${esc(x.cut)}</span>`:""}${x.why?`<div class="small muted">${esc(x.why)}</div>`:""}</li>`; };
  const suggHtml = busy==="sugg" ? '<div class="progress"><span class="dot"></span> Working out how to pilot it and what to change…</div>'
    : sg ? `${sstale?'<div class="warnbox small">The deck changed since these suggestions were made.</div>':""}
      ${list("How to play it",sg.howToPlay)}
      ${sg.mulligan?`<div><span class="eyebrow">Mulligan</span><p class="small" style="margin:4px 0">${esc(sg.mulligan)}</p></div>`:""}
      ${sg.swaps.length?`<div><span class="eyebrow">Suggested changes</span><ul class="dd-swaps">${sg.swaps.map(swapRow).join("")}</ul></div>`:""}
      ${sg.styleShift?`<div><span class="eyebrow">A different direction</span><p class="small" style="margin:4px 0">${esc(sg.styleShift)}</p></div>`:""}
      <div class="note">Made ${ago(m.suggAt)}. Open the deck in the builder to try these with live prices and the bracket check.</div>`
    : '<p class="muted">Get piloting tips, mulligan advice and specific swaps. Adds favor cards you already own.</p>';
  el.innerHTML=`<div class="deckdetail">
    <div class="dd-head"><span class="dt-band" style="${bandStyle(cols)}"></span>
      <div class="dd-title"><span class="eyebrow">Deck</span><h3>${esc(loc)}</h3><div class="stats">${cols.length?`<span>${colorPips(cols)}</span>`:""}<span><b>${st.copies}</b> cards</span>${st.lands?`<span><b>${st.lands}</b> lands</span>`:""}${st.avgMv!=null?`<span>avg MV <b>${st.avgMv.toFixed(2)}</b></span>`:""}${st.gc?`<span><b>${st.gc}</b> Game Changer${st.gc>1?"s":""}</span>`:""}${st.priced?`<span>value <b>${money(st.value)}</b></span>`:""}</div></div>
      <div class="dd-cmd">${cmdUi}</div>
    </div>
    ${st.copies!==100?`<div class="warnbox small">This deck has ${st.copies} cards; a Commander deck has 100 including the commander.</div>`:""}
    ${err?`<div class="err small">${esc(err.msg)}</div>`:""}
    <div class="row">
      <button type="button" class="btn primary" data-dact="playtest">Playtest</button>
      <button type="button" class="btn" data-dact="open">Open in deck builder</button>
      <span class="sp" style="flex:1"></span>
      <input type="text" data-dact-name value="${esc(loc)}" aria-label="Deck name" maxlength="80" style="width:180px">
      <button type="button" class="btn small" data-dact="rename">Rename</button>
      <button type="button" class="btn small ghost" data-dact="move">Move to general collection</button>
      <button type="button" class="btn small ghost" data-dact="delete">Delete deck</button>
    </div>
    <div class="dd-panels">
      <div class="dd-panel"><div class="dd-ph"><h4>How this deck works</h4><button type="button" class="btn small ${d&&!stale?"":"primary"}" data-dact="desc" ${busy||!sample?"disabled":""}>${d?"Regenerate description":"Describe this deck"}</button></div>${descHtml}</div>
      <div class="dd-panel"><div class="dd-ph"><h4>Play style &amp; change suggestions</h4><button type="button" class="btn small ${sg&&!sstale?"":"primary"}" data-dact="sugg" ${busy||!sample?"disabled":""}>${sg?"Refresh suggestions":"Get suggestions"}</button></div>${suggHtml}</div>
    </div>
    ${!sample?'<div class="note">Descriptions and suggestions need an AI engine; set one up under AI engine in the deck builder.</div>':""}
  </div>`;
}

// ---------- spreadsheet parsing ----------
let xlsxP=null;
function loadXLSX(){
  if(window.XLSX) return Promise.resolve(window.XLSX);
  if(!xlsxP) xlsxP=new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload=()=>res(window.XLSX); s.onerror=()=>{ xlsxP=null; rej(new Error("load")); }; document.head.appendChild(s); });
  return xlsxP;
}
const NAME_RE=[/^name$/,/^card ?name$/,/^card$/,/^cardname$/,/^card_name$/,/^english name$/,/^title$/,/^product name$/];
const QTY_RE=[/^(quantity|qty|count|amount|copies|owned|have|total|#|number|no\.?|num)$/,/^(quantity|qty|count|copies)\b/,/\b(quantity|qty)\b/];
function detectCols(rows){
  for(let h=0;h<Math.min(15,rows.length);h++){
    const cells=(rows[h]||[]).map(c=>String(c).trim().toLowerCase());
    let ni=-1; for(const re of NAME_RE){ ni=cells.findIndex(c=>re.test(c)); if(ni>=0) break; }
    if(ni<0) ni=cells.findIndex(c=>/name/.test(c)&&!/set|edition|expansion|artist|language|condition|collection|deck|binder|folder|list/.test(c));
    if(ni<0) continue;
    let qi=-1; for(const re of QTY_RE){ qi=cells.findIndex((c,i)=>i!==ni&&re.test(c)&&!/trade|wish|want|foil count|for sale/.test(c)); if(qi>=0) break; }
    return {h,ni,qi,headers:rows[h].map(String)};
  }
  return null;
}
function rowsToCards(rows){
  rows=rows.filter(r=>r&&r.some(c=>String(c).trim()!==""));
  if(!rows.length) return {cards:[],how:"empty"};
  const det=detectCols(rows);
  const out=[];
  const push=(n,q)=>{ n=cleanName(n); q=Math.round(Number(String(q).replace(/[^\d.]/g,""))); if(!n||/^(name|card|card name|quantity|qty|count)$/i.test(n)) return; out.push({n,q:q>0?q:1}); };
  if(det){
    rows.slice(det.h+1).forEach(r=>push(r[det.ni], det.qi>=0?r[det.qi]:1));
    return {cards:out,how:`columns “${det.headers[det.ni]}”${det.qi>=0?` and “${det.headers[det.qi]}”`:" (no quantity column found, so 1 copy each)"}`};
  }
  // no header: guess from shape
  const isNum=v=>/^\s*\d+\s*x?\s*$/i.test(String(v));
  const sample=rows.slice(0,30);
  if(sample.every(r=>r.filter(c=>String(c).trim()).length===1)){
    rows.forEach(r=>{ const t=String(r.find(c=>String(c).trim())).trim(); const m=t.match(/^(\d+)\s*x?\s+(.+)$/i); if(m) push(m[2],m[1]); else push(t,1); });
    return {cards:out,how:"one card per line"};
  }
  if(sample.filter(r=>isNum(r[0])).length>sample.length*0.6){ rows.forEach(r=>push(r[1],r[0])); return {cards:out,how:"quantity in column A, name in column B"}; }
  if(sample.filter(r=>isNum(r[1])).length>sample.length*0.6){ rows.forEach(r=>push(r[0],r[1])); return {cards:out,how:"name in column A, quantity in column B"}; }
  rows.forEach(r=>push(r[0],1)); return {cards:out,how:"names in column A, 1 copy each"};
}
function aggregate(list){ const m=new Map(); list.forEach(({n,q})=>{ const k=key(n); const cur=m.get(k); if(cur) cur.q+=q; else m.set(k,{n,q}); }); return [...m.values()]; }
async function handleFile(file){
  const el=$("upPreview"); if(!file) return;
  el.innerHTML='<span class="progress"><span class="dot"></span> Reading '+esc(file.name)+'…</span>';
  try{
    let parsed;
    if(/\.(txt)$/i.test(file.name)){
      const text=await file.text(); parsed=rowsToCards(text.split(/\r?\n/).map(l=>[l]));
    } else {
      let XLSX; try{ XLSX=await loadXLSX(); }catch(e){ el.innerHTML='<div class="err">The spreadsheet reader didn\'t load. Check your connection and try again, or save the sheet as CSV.</div>'; return; }
      const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});
      let best=null;
      wb.SheetNames.forEach(sn=>{ const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:false,defval:""}); const p=rowsToCards(rows); p.sheet=sn; if(!best||p.cards.length>best.cards.length) best=p; });
      parsed=best;
    }
    const cards=aggregate(parsed.cards);
    if(!cards.length){ el.innerHTML='<div class="err">No cards found in that file. It needs a column of card names (ideally headed “Name”) and, optionally, a quantity column.</div>'; return; }
    pendingUpload=cards;
    const copies=cards.reduce((a,c)=>a+c.q,0);
    const already=cards.filter(c=>owned(c.n)).length;
    el.innerHTML = `<div class="prev"><div><b>${cards.length.toLocaleString()} different cards</b> (${copies.toLocaleString()} copies) found in ${esc(file.name)}${parsed.sheet?" · sheet “"+esc(parsed.sheet)+"”":""}, using ${esc(parsed.how)}.${already&&COLL.size?` ${already} are already in your collection.`:""}</div>
      <div class="prevtbl"><table><thead><tr><th>Qty</th><th>Name</th></tr></thead><tbody>${cards.slice(0,8).map(c=>`<tr><td>${c.q}</td><td>${esc(c.n)}</td></tr>`).join("")}${cards.length>8?`<tr><td></td><td class="muted">and ${(cards.length-8).toLocaleString()} more</td></tr>`:""}</tbody></table></div>
      <div class="row"><button type="button" class="btn primary small" id="upAdd">Add to ${esc(destName())}</button>${placeCount(currentDest().loc)?`<button type="button" class="btn small" id="upReplace">Replace everything in ${esc(destName())}</button>`:""}<button type="button" class="btn small ghost" id="upCancel">Cancel</button></div>
      ${COLL.size?'<span class="note">Add increases counts for cards already there. Replace clears that place first (other decks stay as they are), which is right if this file is a full export of it.</span>':""}</div>`;
  }catch(e){ el.innerHTML='<div class="err">That file couldn\'t be read. Save it as .xlsx or .csv and try again.</div>'; }
}
function destName(){ const d=currentDest(); return !d.ok ? "the new deck" : d.loc ? d.loc : "General collection"; }
function placeCount(loc){ return [...COLL.values()].filter(v=>(v.loc||"")===(loc||"")).length; }
function parsePasted(text){ return aggregate(String(text).split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{ const m=l.match(/^(\d+)\s*x?\s+(.+)$/i); return m?{n:cleanName(m[2]),q:Number(m[1])}:{n:cleanName(l),q:1}; }).filter(c=>c.n)); }

// ---------- add-card suggestions ----------
const AC2={items:[],active:-1,seq:0}; let ac2T=null;
function knownNames(){ const s=new Map(); const add=n=>{ if(n&&!s.has(key(n))) s.set(key(n),n); }; Object.values(CARDDB).forEach(d=>add(d.name)); S.cards.forEach(c=>add(c.n)); if(S.edh) S.edh.pool.forEach(p=>add(p.n)); CMDS.forEach(c=>add(c.n)); return [...s.values()]; }
function ac2Render(){
  const el=$("addList"), inp=$("addName");
  if(!AC2.items.length){ el.hidden=true; el.innerHTML=""; inp.setAttribute("aria-expanded","false"); return; }
  const q=inp.value;
  el.innerHTML=AC2.items.map((n,i)=>`<li role="option" id="ad${i}" data-i="${i}" aria-selected="${i===AC2.active}"><span class="an">${hl(n,q)}</span>${owned(n)?`<span class="ap tag own">Own ×${owned(n).q}</span>`:""}</li>`).join("");
  el.hidden=false; inp.setAttribute("aria-expanded","true");
}
function ac2Update(){
  const q=fold($("addName").value.trim()); const seq=++AC2.seq;
  if(q.length<2){ AC2.items=[]; ac2Render(); return; }
  const local=knownNames().filter(n=>fold(n).startsWith(q)||fold(n).split(/[\s,'\-]+/).some(w=>w.startsWith(q))).sort((a,b)=>(fold(a).startsWith(q)?0:1)-(fold(b).startsWith(q)?0:1)||a.localeCompare(b)).slice(0,10);
  AC2.items=local; AC2.active=local.length?0:-1; ac2Render();
  if(LIVE && q.length>=3){
    clearTimeout(ac2T);
    ac2T=setTimeout(async()=>{
      try{ const j=await browserGet("https://api.scryfall.com/cards/autocomplete?q="+encodeURIComponent($("addName").value.trim())); if(seq!==AC2.seq) return;
        const merged=[...new Set([...(j.data||[]),...AC2.items])].slice(0,12); AC2.items=merged; AC2.active=merged.length?0:-1; ac2Render(); }catch(e){}
    },450);
  }
}
function ac2Pick(i){ const n=AC2.items[i]; if(!n) return; $("addName").value=n; AC2.items=[]; ac2Render(); }

// ================= cards you own (builder) =================
// S.ownCheck = {sig, at, model, items:[{n, verdict:"use"|"maybe"|"skip", why, replace, c}]}
let OWNBUSY=false, OWNERR="", ownShowAll=false;
function buildSig(){ return hashStr(S.cards.filter(c=>c.sel).map(c=>key(c.n)).sort().join("|")+"#"+S.commanders.map(c=>key(c.name)).join("+")+"#"+S.bracket); }
// Owned cards that aren't in the current build and could legally go in it. EDHREC picks for this commander first.
function ownedCandidates(){
  if(!COLL.size||!S.commanders.length) return [];
  const inDeck=new Set(S.cards.filter(c=>c.sel).map(c=>key(c.n))); S.commanders.forEach(c=>inDeck.add(key(c.name)));
  const seen=new Set(), out=[];
  for(const e of BYNAME.values()){
    const k=key(e.n); if(seen.has(k)) continue; seen.add(k);
    if(inDeck.has(k)||inDeck.has(k.split(" // ")[0])||BASIC_NAMES.test(e.n)) continue;
    const d=CARDDB[k];
    if(d && (d.legal!=="legal" || d.ci.some(x=>!S.colors.includes(x)))) continue;
    const p=S.edh&&S.edh.pool.find(x=>key(x.n)===k);
    out.push({n:e.n, own:e, d, edh:p||null});
  }
  return out.sort((a,b)=>((b.edh?1:0)-(a.edh?1:0)) || ((b.edh&&b.edh.inc||0)+(b.edh&&b.edh.syn||0)) - ((a.edh&&a.edh.inc||0)+(a.edh&&a.edh.syn||0)) || a.n.localeCompare(b.n));
}
async function checkOwned(){
  if(needClaude()) return;
  if(!S.commanders.length||!S.cards.some(c=>c.sel)){ toast("Build or import a deck first."); return; }
  OWNBUSY=true; OWNERR=""; renderOwnCheck();
  try{
    let cand=ownedCandidates();
    if(LIVE){ await liveTry(()=>scryNames(cand.slice(0,400).map(x=>x.n)), $("ownStatus")); cand=ownedCandidates(); }
    // Without card data, only cards EDHREC links to this commander are known to fit its colors.
    const known=cand.filter(x=>x.d||x.edh).slice(0,120);
    if(!known.length){ OWNERR=cand.length?"Couldn't check your cards' colors without live card data, so there's nothing safe to suggest.":"Nothing in your collection fits this deck that isn't already in it."; OWNBUSY=false; renderOwnCheck(); return; }
    const deck=S.cards.filter(c=>c.sel).map(c=>`${c.n} (${c.c})`).join("; ");
    const lines=known.map(x=>`${x.n}${x.d?` | ${x.d.type}${x.d.mana?" "+x.d.mana:""}`:""}${x.edh?` | in ${x.edh.inc!=null?x.edh.inc+"%":"?"} of EDHREC decks, ${x.edh.syn>=0?"+":""}${x.edh.syn}% synergy`:""}`).join("\n");
    const r=firstObj(await sample.json(`You are an expert Magic: The Gathering Commander deckbuilder. The player wants to know which cards they ALREADY OWN are worth putting in this deck.
${ctx()}
CURRENT DECK: ${deck}

CARDS THE PLAYER OWNS THAT AREN'T IN THE DECK (name | type | EDHREC stats | notes):
${lines}

For EVERY owned card listed, decide: "use" (clearly improves this deck; would make the cut), "maybe" (reasonable, depends on taste or meta), or "skip" (not worth a slot here). Judge against the actual cards in the deck and the bracket rules. For "use" and "maybe", name the weakest card in the CURRENT DECK it should replace.
Reply with only one JSON object: {"cards":[{"n":"exact owned card name","verdict":"use|maybe|skip","why":"max 22 words, specific to this deck","replace":"exact card name from the current deck, or empty","c":"payoff|engine|ramp|draw|removal|wipe|protection|land"}]}`,{modelTier:"default"}));
    const list=(Array.isArray(r.cards)?r.cards:Array.isArray(r)?r:[]).filter(x=>x&&x.n);
    const byName=new Map(known.map(x=>[key(x.n),x.n]));
    const items=list.map(x=>({n:byName.get(key(x.n))||String(x.n),verdict:/^use|yes|worth/i.test(x.verdict)?"use":/^skip|no|not/i.test(x.verdict)?"skip":"maybe",why:String(x.why||x.reason||""),replace:String(x.replace||x.cut||""),c:CATNAME[x.c]?x.c:catGuess(CARDDB[key(x.n)])})).filter(x=>byName.has(key(x.n)));
    if(!items.length) throw {code:"no_items",message:"The AI's answer didn't rate any of your cards. Try again."};
    S.ownCheck={sig:buildSig(),at:Date.now(),model:(LAST_AI&&LAST_AI.model)||"",items}; save();
  }catch(e){ if(!(e&&e.code==="cancelled")) OWNERR=errMsg(e); }
  OWNBUSY=false; renderOwnCheck();
}
function useOwned(n, replace){
  const d=CARDDB[key(n)], it=S.ownCheck&&S.ownCheck.items.find(x=>key(x.n)===key(n)), p=S.edh&&S.edh.pool.find(x=>key(x.n)===key(n));
  let c=S.cards.find(x=>key(x.n)===key(n));
  if(!c) c=addCard({n,c:(it&&it.c)||catGuess(d),mv:d?d.mv:0,s:it&&it.verdict==="use"?8:6,usd:d?d.usd:null,w:(it&&it.why)||(p?`You own it, and it's in ${p.inc}% of decks for this commander on EDHREC.`:"From your collection.")},{o:"added"});
  if(!c) return;
  const br=blockReason(c)||(gcLimitHit(Object.assign({},c,{sel:false}))?"the Game Changer limit for this bracket":"");
  if(br){ toast(`${n} can't go in: ${br}.`); return; }
  c.sel=true;
  let out=null; if(replace){ out=S.cards.find(x=>x.sel&&key(x.n)===key(replace)); if(out) out.sel=false; }
  toast(`Added ${n}${out?` in place of ${out.n}`:""}.`+(!out&&deckCount()>mainSize()?" You're over 99 now, so cut a card.":""));
  renderPool(); renderDeck(); save();
}
function renderOwnCheck(){
  const sec=$("ownSec"); if(!sec) return;
  sec.hidden = !S.cards.length || !COLL.size || !S.commanders.length;
  if(sec.hidden) return;
  const cand=ownedCandidates(), oc=S.ownCheck, stale=oc&&oc.sig!==buildSig();
  const btn=$("ownBtn"); btn.disabled=OWNBUSY||!sample; btn.textContent=oc?"Check again":"Check my collection";
  $("ownStatus").innerHTML = OWNBUSY ? '<span class="dot"></span> Comparing your cards with this deck…' : OWNERR ? `<span class="err small">${esc(OWNERR)}</span>` : "";
  const ownLabel=x=>{ const o=owned(x.n); return `<span class="tag own" title="${esc(o.locs.map(l=>l.q+" in "+(l.loc||"general collection")).join(", "))}">Owned${o.q>1?" ×"+o.q:""}</span>`; };
  const statLine=x=>{ const p=x.edh||(S.edh&&S.edh.pool.find(e=>key(e.n)===key(x.n))), d=CARDDB[key(x.n)]; return [p&&p.inc!=null?`in ${p.inc}% of decks`:"", p?`${p.syn>=0?"+":""}${p.syn}% synergy`:"", d&&d.usd!=null?money(d.usd):""].filter(Boolean).join(" · "); };
  const inDeckNow=n=>S.cards.some(c=>c.sel&&key(c.n)===key(n));
  const row=(x,v)=>{ const added=inDeckNow(x.n); return `<div class="ownrow ${v||""}"><div style="min-width:0"><div class="nmrow"><span class="nm"><a href="${sfUrl(x.n)}" target="_blank" rel="noopener">${esc(x.n)}</a></span>${ownLabel(x)}${v?`<span class="verdict-chip ${v}">${v==="use"?"Worth using":v==="maybe"?"Maybe":"Not worth it"}</span>`:""}</div>${x.why?`<div class="why">${esc(x.why)}</div>`:""}<div class="edh">${esc(statLine(x))}${x.replace&&v!=="skip"?` · would replace <b>${esc(x.replace)}</b>`:""}</div>${oracleHTML(x.n)}</div>
    <div>${added?'<span class="tag info">In the deck</span>':v==="skip"?"":`<button type="button" class="btn small ${v==="use"?"primary":""}" data-own="${esc(x.n)}" data-rep="${esc(v&&x.replace||"")}">${v&&x.replace&&inDeckNow(x.replace)?"Swap in":"Add"}</button>`}</div></div>`; };
  let html="";
  if(oc&&oc.items.length){
    const g=v=>oc.items.filter(x=>x.verdict===v);
    html += `${stale?'<div class="warnbox small">Your deck changed since this check. Run it again for up-to-date advice.</div>':""}
      <div class="owngroups">
        <div><h3 class="owng use">Worth using <span class="cnt">${g("use").length}</span></h3>${g("use").map(x=>row(x,"use")).join("")||'<div class="note">None of your cards clearly beat what\'s in the deck.</div>'}</div>
        <div><h3 class="owng maybe">Maybe <span class="cnt">${g("maybe").length}</span></h3>${g("maybe").map(x=>row(x,"maybe")).join("")||'<div class="note">Nothing borderline.</div>'}</div>
      </div>
      ${g("skip").length?`<details class="ownskip"><summary>Not worth it here (${g("skip").length})</summary>${g("skip").map(x=>row(x,"skip")).join("")}</details>`:""}
      <div class="note">Checked ${oc.items.length} of your cards ${ago(oc.at)}${oc.model?" with "+esc(oc.model):""}.</div>`;
  } else {
    const pop=cand.filter(x=>x.edh);
    const shown=ownShowAll?pop:pop.slice(0,8);
    html += pop.length ? `<div class="note">You own <b>${pop.length}</b> card${pop.length===1?"":"s"} that EDHREC players run with ${esc(S.commanders[0].name.split(",")[0])} and aren't in this deck${cand.length>pop.length?`, plus ${cand.length-pop.length} more in your collection the AI can weigh up`:""}.</div>${shown.map(x=>row(x,"")).join("")}${pop.length>8?`<button type="button" class="btn small ghost" id="ownMore">${ownShowAll?"Show fewer":`Show all ${pop.length}`}</button>`:""}`
      : `<div class="note">${cand.length?`You own ${cand.length} card${cand.length===1?"":"s"} that could go in this deck. Click <b>Check my collection</b> and the AI will say which are worth a slot.`:"Nothing in your collection fits this deck that isn't already in it."}</div>`;
  }
  $("ownOut").innerHTML=html;
}

// ================= surprise me (spin the wheel) =================
// Picks a random commander you own and has the AI draft a deck only from your cards, aiming for bracket 3+.
const SPIN={busy:false,ctl:null,last:"",msg:""};
const isLandCard = (n,d) => BASIC_NAMES.test(n) || !!(d && /\bLand\b/.test(d.type) && !/Creature/.test(d.type));
function ownedCommanders(){ const seen=new Set(), out=[]; for(const v of COLL.values()){ const k=key(v.n); if(seen.has(k)) continue; seen.add(k); if(isCommanderName(v.n)) out.push(v.n); } return out.sort((a,b)=>a.localeCompare(b)); }
// Owned cards (one entry per name) that are legal and inside the given color identity, with live card data.
function ownedPoolFor(ci, exclude){
  const ex=new Set((exclude||[]).map(key)), seen=new Set(), out=[];
  for(const e of BYNAME.values()){
    const k=key(e.n); if(seen.has(k)||ex.has(k)||BASIC_NAMES.test(e.n)) continue; seen.add(k);
    const d=CARDDB[k]; if(!d||d.legal!=="legal"||d.ci.some(x=>!ci.includes(x))) continue;
    out.push({n:d.name,d,q:e.q,land:isLandCard(d.name,d)});
  }
  return out;
}
// The lowest bracket the deck's cards allow by the official rules (Game Changers, land denial, combos, extra turns).
function rulesBracket(){
  const sel=S.cards.filter(c=>c.sel); const gc=sel.filter(c=>c.f.includes("gc")).length, mld=sel.some(c=>c.f.includes("mld")), combo=sel.some(c=>c.f.includes("combo")), xt=sel.some(c=>c.f.includes("xturn"));
  for(let k=1;k<=5;k++){ const bb=BRACKETS[k]; if(gc<=bb.gc && (!mld||bb.mld) && (!combo||bb.combo!==false) && (!xt||bb.xturn!=="none")) return k; }
  return 5;
}
function spinStatus(t){ $("spinStatus").innerHTML = t ? `<span class="dot"></span> ${esc(t)}` : ""; }
function animateWheel(names, pick){
  const reel=$("wheelReel"); const H=52;
  const seq=[]; const n=Math.max(28, names.length*3);
  for(let i=0;i<n;i++) seq.push(names[Math.floor(Math.random()*names.length)]);
  seq.push(pick, names[Math.floor(Math.random()*names.length)]);
  reel.innerHTML=seq.map((x,i)=>`<div class="wheel-row${i===seq.length-2?" win":""}">${esc(x)}</div>`).join("");
  const target=(seq.length-2)*H - H;   // land the pick in the middle row
  const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduce||!window.requestAnimationFrame){ reel.style.transform=`translateY(${-target}px)`; return Promise.resolve(); }
  return new Promise(res=>{ const t0=performance.now(), dur=3200; const step=t=>{ const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,4); reel.style.transform=`translateY(${-target*e}px)`; if(p<1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
}
async function spinDeck(){
  if(needClaude()) return;
  if(SPIN.busy) return;
  SPIN.msg=""; renderSpin();
  if(!LIVE){ SPIN.msg="Surprise decks need live card data to check your cards' colors. Open Commander Forge on your server (or the Claude desktop app)."; renderSpin(); return; }
  const cmds=ownedCommanders();
  if(!cmds.length){ SPIN.msg="You don't own any cards that can be a commander yet. Add one to My collection, then spin."; renderSpin(); return; }
  if(DIRTY && !confirmLeaveBuild()) return;
  SPIN.busy=true; SPIN.ctl=new AbortController(); running=[SPIN.ctl]; setBusy(true); renderSpin();
  try{
    const names=[...new Set([...BYNAME.values()].map(e=>e.n))];
    await liveTry(()=>scryNames(names.slice(0,4000),(d,t)=>spinStatus(`Reading your collection… ${d} / ${t}`)), $("spinStatus"));
    if(!LIVE) throw {code:"no_live",message:"Live card data stopped working, so your cards' colors can't be checked."};
    spinStatus("Finding commanders you can build…");
    const feas=cmds.map(n=>{ const d=CARDDB[key(n)]; if(!d||d.legal!=="legal") return null; const pool=ownedPoolFor(d.ci,[n]); return {n:d.name,d,pool,nonland:pool.filter(x=>!x.land).length}; }).filter(x=>x&&x.nonland>=45);
    if(!feas.length) throw {code:"no_feasible",message:`None of your ${cmds.length} commander${cmds.length>1?"s has":" has"} enough of your cards in its colors yet (a deck needs about 45 non-land cards besides lands). Add more of your collection and spin again.`};
    let opts=feas.filter(x=>x.n!==SPIN.last); if(!opts.length) opts=feas;
    const pick=opts[Math.floor(Math.random()*opts.length)];
    spinStatus("Spinning…");
    await animateWheel(feas.map(x=>x.n), pick.n);
    SPIN.last=pick.n;
    // fresh deck around the pick
    const keep={fmt:S.fmt,budget:S.budget};
    S=fresh("spin"); Object.assign(S,keep);
    S.commanders=[{name:pick.d.name,manaCost:pick.d.mana,type:pick.d.type,text:pick.d.text}];
    S.colors=["W","U","B","R","G"].filter(c=>pick.d.ci.includes(c)); S.query=pick.d.name; S.bracket=3; S.ownedFree=true;
    COMBOS=null; PT=null; HAND=null; render(); renderCombos(); renderPlaytest(); renderHand();
    spinStatus(`Landed on ${pick.d.name}. Checking what players do with it…`);
    await loadEdhForCommander($("spinStatus"));
    const edhRank=new Map(((S.edh&&S.edh.pool)||[]).map(p=>[key(p.n),(p.inc||0)+p.syn*1.5]));
    const pool=pick.pool.slice().sort((a,b)=>(edhRank.get(key(b.n))??-999)-(edhRank.get(key(a.n))??-999)||a.n.localeCompare(b.n)).slice(0,500);
    const poolSet=new Map(pool.map(x=>[key(x.n),x]));
    const basics=S.colors.map(c=>({W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"})[c]);
    const lines=pool.map(x=>`${x.n} | ${x.d.type}${x.d.mana?" "+x.d.mana:""}${x.d.gc?" | GAME CHANGER":""}${edhRank.has(key(x.n))?" | EDHREC pick":""}`).join("\n");
    spinStatus("Drafting a surprise deck from your cards…");
    let plan=null; const picked=[]; const basicQ={};
    await streamCall(`You are drafting a SURPRISE Commander deck for a player, using ONLY cards they own.
COMMANDER: ${pick.d.name} — ${pick.d.text.replace(/\n/g," ")}
Color identity: ${S.colors.join("")||"colorless"}
THE PLAYER OWNS ONLY THESE CARDS (name | type cost | notes). Never use a card that isn't on this list:
${lines}
Basic lands (${basics.join(", ")||"Wastes"}) are unlimited.

Choose a game plan that is strong but not the most obvious one for this commander, so it feels like a surprise. Aim for at least Commander bracket 3: tight synergy, efficient interaction, up to 3 Game Changers, a two-card combo only as a late-game finisher. Build exactly 99 cards plus the commander: about 10 ramp, 10 card draw, 8 removal, 2-3 wipes, and 35-38 lands including basics.
OUTPUT: JSON Lines, one object per line, no other text.
First ONE plan line: {"t":"plan","name":"short catchy name for the game plan","summary":"3 sentences on how it plays and wins","steps":["Early game: ...","Mid game: ...","Late game: ..."],"winCons":["2-4"],"mulligan":"1-2 sentences","risks":"1 sentence","lands":<total lands>,"weights":{"<color>":<share 0-1>},"bracket":<1-5 honest estimate of the finished deck>,"bracketWhy":"one sentence"}
Then one line per non-basic card: {"t":"card","n":"exact name from the list","c":"payoff|engine|ramp|draw|removal|wipe|protection|land","s":<synergy 1-10>,"w":"15-30 words on why it's in this deck","f":[any of "combo","xturn","mld","tutor"],"x":"combo partner or omit"}
Then one line per basic land type: {"t":"basic","n":"Island","q":<count>}`, o=>{
        if(o.t==="plan"){ plan=o; S.plan={summary:String(o.summary||""),steps:arr(o.steps,3),mulligan:String(o.mulligan||""),winCons:arr(o.winCons,4),risks:String(o.risks||""),lands:Number(o.lands)||37,weights:o.weights||{}}; S.landTarget=Math.max(30,Math.min(42,Number(o.lands)||37)); renderInsight(); }
        else if(o.t==="card"){ const x=poolSet.get(key(o.n)); if(!x||picked.length>=99) return; const c=addCard({n:x.n,c:o.c,mv:x.d.mv,s:o.s,usd:x.d.usd,w:o.w,f:o.f,x:o.x},{o:"owned"}); if(c){ c.sel=true; picked.push(c); spinStatus(`Drafting… ${picked.length} cards`); renderPool(); renderDeck(); } }
        else if(o.t==="basic"){ const b=String(o.n||""); if(basics.includes(b)) basicQ[b]=(basicQ[b]||0)+Math.max(0,Math.round(Number(o.q)||0)); }
      }, SPIN.ctl);
    if(picked.length<40) throw {code:"thin",message:"The AI didn't draft enough of your cards. Spin again."};
    // lands: use the AI's basics, then fit the deck to exactly 99
    S.basics = Object.keys(basicQ).length ? basicQ : null;
    if(!S.basics){ S.basics=Object.fromEntries(basicsList()); }
    const size=()=>S.cards.filter(c=>c.sel).length+Object.values(S.basics).reduce((a,b)=>a+b,0);
    while(size()>99){ const big=Object.entries(S.basics).sort((a,b)=>b[1]-a[1])[0]; if(big&&big[1]>0&&S.cards.filter(c=>c.sel&&c.c==="land").length+Object.values(S.basics).reduce((a,b)=>a+b,0)>34){ S.basics[big[0]]--; continue; } const weak=S.cards.filter(c=>c.sel&&c.c!=="land").sort((a,b)=>a.s-b.s)[0]; if(!weak) break; weak.sel=false; }
    if(size()<99 && basics.length){ const w=(S.plan&&S.plan.weights)||{}; while(size()<99){ const c=S.colors.slice().sort((a,b)=>(Number(w[b])||0)-(Number(w[a])||0))[(size())%Math.max(1,S.colors.length)]||S.colors[0]; const b=({W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"})[c]; S.basics[b]=(S.basics[b]||0)+1; } }
    S.gameplans=[{id:"surprise",name:String(plan&&plan.name||"Surprise plan"),pitch:S.plan?S.plan.summary:"",mechanics:[],keyCards:[]}]; S.chosen=["surprise"];
    const rb=rulesBracket(), ai=Math.round(Number(plan&&plan.bracket))||rb;
    const final=Math.max(rb, Math.min(5,ai));
    S.bracket=final;
    S.spin={commander:pick.d.name,plan:S.gameplans[0].name,bracket:final,bracketWhy:String(plan&&plan.bracketWhy||""),cards:picked.filter(c=>c.sel).length,pool:pick.pool.length,options:feas.length};
    DIRTY=true; spinStatus(""); render(); save();
    $("spinSec").scrollIntoView&&$("spinSec").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){ spinStatus(""); if(!(e&&e.code==="cancelled")) SPIN.msg=errMsg(e); }
  SPIN.busy=false; running=[]; setBusy(false); renderSpin();
}
function renderSpin(){
  const sec=$("spinSec"); if(!sec) return;
  sec.hidden = S.mode!=="spin";
  if(sec.hidden) return;
  const cmds=COLL.size?ownedCommanders():[];
  $("spinBtn").disabled=SPIN.busy; $("spinBtn").textContent = S.spin ? "Spin again" : "Spin the wheel";
  $("spinStop").hidden=!SPIN.busy;
  const reel=$("wheelReel");
  if(!SPIN.busy && !reel.dataset.ready){ reel.dataset.ready="1"; const show=cmds.length?cmds:["Your commanders appear here"]; reel.innerHTML=[show[show.length-1]||"",show[0],show[1%show.length]||""].map((x,i)=>`<div class="wheel-row${i===1?" win":""}">${esc(x)}</div>`).join(""); reel.style.transform="translateY(0)"; }
  const sp=S.spin; let html="";
  if(SPIN.msg) html+=`<div class="warnbox">${esc(SPIN.msg)}</div>`;
  if(sp && !SPIN.busy){
    const ok=sp.bracket>=3;
    html+=`<div class="spin-result ${ok?"ok":"low"}">
      <div><span class="eyebrow">The wheel picked</span><div class="spin-cmd">${esc(sp.commander)}</div><div class="spin-plan">${esc(sp.plan)}</div>
      <div class="small muted">${sp.cards} of your cards, drafted from the ${sp.pool} you own in its colors${sp.options>1?` · ${sp.options} of your commanders were buildable`:""}.</div></div>
      <div class="spin-b">${ok?`<span class="spin-badge">Bracket ${sp.bracket}</span><div class="small">${esc(sp.bracketWhy)}</div>`:`<button type="button" class="btn primary" id="spinReroll">This is bracket ${sp.bracket}. Click to Reroll</button><div class="small">${esc(sp.bracketWhy)}</div>`}</div>
    </div>
    <div class="note">The full deck is below. Playtest it, check combos, then save it in step 9 if you like it.</div>`;
  } else if(!sp && !SPIN.busy && !SPIN.msg){
    html+=`<div class="note">${cmds.length?`You own ${cmds.length} card${cmds.length===1?"":"s"} that can be a commander. Spin to get one of them and a deck built only from your collection.`:"Add your cards to My collection first, including at least one legendary creature."}</div>`;
  }
  $("spinResult").innerHTML=html;
}

// ================= MTGJSON precons =================
let PRE={n:[],d:[]};
function loadJsonData(id,file,apply){
  const el=document.getElementById(id);
  if(el&&el.textContent){ try{ apply(JSON.parse(el.textContent)); }catch(e){} return Promise.resolve(); }
  return fetch("data/"+file).then(r=>r.json()).then(apply).catch(()=>{});
}
const preconsReady = loadJsonData("preconData","precons.json",j=>{ PRE=j; });
function preconsFor(names){ const ks=names.map(key); return PRE.d.map((d,i)=>[d,i]).filter(([d])=>d[3].some(ci=>ks.includes(key(PRE.n[ci])))).map(([,i])=>i).slice(0,3); }
function preconText(i){
  const d=PRE.d[i]; const L=d[3].map(ci=>`1x ${PRE.n[ci]} [Commander{top}]`);
  d[4].forEach(x=>{ const [ci,q]=Array.isArray(x)?x:[x,1]; L.push(`${q} ${PRE.n[ci]}`); });
  return L.join("\n");
}
function renderPrecons(){
  const q=fold(($("preconFilter").value||"").trim()); const sel=$("preconSel"); const cur=sel.value;
  let html="", year="";
  PRE.d.forEach((d,i)=>{ const cmd=d[3].map(ci=>PRE.n[ci]).join(" + "); const label=`${d[0]} · ${cmd} (${d[1]})`; if(q && !fold(label).includes(q)) return;
    if(d[2]!==year){ if(year) html+="</optgroup>"; year=d[2]; html+=`<optgroup label="${esc(year)}">`; }
    html+=`<option value="${i}">${esc(label)}</option>`; });
  if(year) html+="</optgroup>";
  sel.innerHTML = html || '<option value="">No precons match</option>';
  if(cur && sel.querySelector && sel.querySelector(`option[value="${cur}"]`)) sel.value=cur;
}
async function loadPrecon(i){
  if(!PRE.d[i]) return;
  if(S.mode!=="import"){ const keep={bracket:S.bracket,budget:100,fmt:S.fmt}; S=fresh("import"); Object.assign(S,keep); render(); }
  $("importText").value=preconText(i); S.importText=$("importText").value;
  await importDeck();
  $("importStatus").insertAdjacentHTML("afterbegin",`<span>Loaded the official decklist for ${esc(PRE.d[i][0])} from MTGJSON.</span> `);
}

// ================= Commander Spellbook combos =================
let COMBOS=null;
const comboInDeck = () => { const s=new Set(); S.commanders.forEach(c=>{ s.add(key(c.name)); s.add(key(c.name).split(" // ")[0]); }); S.cards.filter(c=>c.sel).forEach(c=>{ s.add(key(c.n)); s.add(key(c.n).split(" // ")[0]); }); return s; };
async function findCombos(){
  const st=$("comboStatus");
  if(!LIVE){ st.innerHTML='<div class="warnbox">Combo search reads Commander Spellbook through the Claude desktop app\'s browser. Open this page in the desktop app to use it.</div>'; return; }
  if(!S.cards.some(c=>c.sel)){ st.textContent="Add some cards first."; return; }
  $("comboBtn").disabled=true;
  const names=[...new Set(S.cards.filter(c=>c.sel&&c.c!=="land").map(c=>c.n).concat(S.commanders.map(c=>c.name)))];
  const ci=(S.colors.join("")||"c").toLowerCase();
  const chunks=[]; for(let i=0;i<names.length;i+=45) chunks.push(names.slice(i,i+45));
  const seen=new Map();
  try{
    for(let k=0;k<chunks.length;k++){
      statusLine(st,`Searching Commander Spellbook… ${k+1} / ${chunks.length}`);
      const q=`coloridentity<=${ci} (${chunks[k].map(n=>'card="'+n.replace(/"/g,"")+'"').join(" or ")})`;
      const j=await browserGet("https://backend.commanderspellbook.com/variants/?format=json&limit=100&ordering=-popularity&q="+encodeURIComponent(q));
      (j.results||[]).forEach(v=>{ if(!seen.has(v.id)) seen.set(v.id,v); });
    }
  }catch(e){ if(isLiveFatal(e)){ LIVE=false; renderLive(); } st.innerHTML=`<div class="err">${esc(LIVE_ERR[e&&e.code]||"Commander Spellbook didn't answer. Try again in a moment.")}</div>`; $("comboBtn").disabled=false; return; }
  const deck=comboInDeck(); const has=n=>deck.has(key(n))||deck.has(key(n).split(" // ")[0]);
  const complete=[], near=[];
  seen.forEach(v=>{
    if(v.legalities && v.legalities.commander===false) return;
    const cards=(v.uses||[]).map(u=>u.card&&u.card.name).filter(Boolean); if(!cards.length) return;
    const missing=cards.filter(n=>!has(n));
    const o={id:v.id,cards,missing,feats:(v.produces||[]).map(p=>p.feature&&p.feature.name).filter(Boolean),desc:v.description||"",pre:[v.easyPrerequisites,v.notablePrerequisites].filter(Boolean).join("\n"),req:(v.requires||[]).map(r=>r.template&&r.template.name).filter(Boolean),pop:v.popularity||0,mana:v.manaNeeded||"",price:v.prices&&v.prices.tcgplayer};
    o.infinite=o.feats.some(f=>/infinite/i.test(f)); o.two=cards.length===2;
    if(!missing.length) complete.push(o); else if(missing.length===1) near.push(o);
  });
  complete.sort((a,b)=>b.pop-a.pop); near.sort((a,b)=>b.pop-a.pop);
  COMBOS={complete,near:near.slice(0,30),searched:seen.size,at:Date.now()};
  applyComboFlags();
  const missNames=[...new Set(COMBOS.near.map(o=>o.missing[0]))];
  await liveTry(()=>scryNames(missNames), st);
  st.innerHTML=`<span>Checked ${seen.size} popular combos that use your cards.</span>`;
  $("comboBtn").disabled=false; $("comboBtn").textContent="Search again";
  renderCombos(); renderPool(); renderDeck(); save();
}
function applyComboFlags(){
  S.cards.forEach(c=>{ if(c.sbCombo){ c.f=c.f.filter(x=>x!=="combo"); delete c.sbCombo; if(c.xsb){ delete c.x; delete c.xsb; } } });
  if(!COMBOS) return;
  COMBOS.complete.filter(o=>o.two&&o.infinite).forEach(o=>{
    o.cards.forEach((n,i)=>{ const c=S.cards.find(x=>key(x.n)===key(n)||key(x.n).split(" // ")[0]===key(n)); if(c){ if(!c.f.includes("combo")){ c.f.push("combo"); c.sbCombo=true; } if(!c.x){ c.x=o.cards[1-i]; c.xsb=true; } } });
  });
}
function comboHTML(o,kind){
  const cards=o.cards.map(n=>o.missing.includes(n)?`<span class="miss">${esc(n)}</span>`:esc(n)).join(" + ");
  let act="";
  if(kind==="near"){
    const n=o.missing[0], d=CARDDB[key(n)], ow=owned(n);
    const probe={n,f:o.two&&o.infinite?["combo"]:[],ci:d&&d.ci,legal:d&&d.legal};
    const br=blockReason(probe);
    const already=S.cards.find(c=>key(c.n)===key(n));
    act=`<div class="row small">${ow?`<span class="tag own">Owned${ow.q>1?" ×"+ow.q:""}</span>`:""}${d&&d.usd!=null?`<span class="muted">${money(d.usd)}</span>`:""}${br?`<span class="tag bad">${esc(br==="2-card combo"?"Two-card combos aren't allowed in bracket "+S.bracket:br)}</span>`:already&&already.sel?'<span class="tag info">Already added</span>':`<button type="button" class="btn small" data-addcombo="${esc(o.id)}">Add ${esc(n)}</button>`}</div>`;
  }
  const warn = kind==="complete" && o.two && o.infinite ? (S.bracket<=2?`<span class="tag bad">Two-card infinite: not allowed in bracket ${S.bracket}</span>`:S.bracket===3?'<span class="tag gc">Two-card infinite: bracket 3 allows it only late game</span>':"") : "";
  return `<div class="combo"><div class="cc">${cards} ${warn}</div><div class="feat">${o.feats.slice(0,4).map(f=>`<span class="chip">${esc(f)}</span>`).join("")}</div>${o.req.length?`<div class="small muted">Also needs: ${o.req.map(esc).join("; ")}</div>`:""}
    <details><summary>How it works</summary><div>${o.pre?esc("Setup: "+o.pre)+"\n\n":""}${esc(o.desc)}</div><a class="small" href="https://commanderspellbook.com/combo/${encodeURIComponent(o.id)}/" target="_blank" rel="noopener">Open on Commander Spellbook</a></details>${act}</div>`;
}
function renderCombos(){
  const el=$("comboOut");
  if(!COMBOS){ el.innerHTML = LIVE?"":'<div class="note">Needs live data. Open this page in the Claude desktop app.</div>'; return; }
  el.innerHTML = `<div class="cat"><div class="cat-h"><h3>In your deck</h3><span class="cnt">${COMBOS.complete.length}</span></div>${COMBOS.complete.length?COMBOS.complete.slice(0,25).map(o=>comboHTML(o,"complete")).join(""):'<div class="note" style="padding:8px">No known combos are complete in this list yet.</div>'}</div>
    <div class="cat"><div class="cat-h"><h3>One card away</h3><span class="cnt">${COMBOS.near.length}</span></div>${COMBOS.near.length?COMBOS.near.map(o=>comboHTML(o,"near")).join(""):'<div class="note" style="padding:8px">Nothing one card away.</div>'}</div>`;
}
async function addComboPiece(id){
  const o=COMBOS&&COMBOS.near.find(x=>String(x.id)===String(id)); if(!o) return;
  const n=o.missing[0]; const d=CARDDB[key(n)];
  let c=S.cards.find(x=>key(x.n)===key(n));
  if(!c) c=addCard({n,c:"payoff",mv:d?d.mv:0,s:8,usd:d?d.usd:null,w:`Completes a combo with ${o.cards.filter(x=>x!==n).join(" + ")}: ${o.feats.slice(0,2).join(", ")||"see Combos below"}.`,f:o.two&&o.infinite?["combo"]:[],x:o.two?o.cards.find(x=>x!==n):undefined},{o:"added"});
  if(c){ c.sel=!blockReason(c)&&!gcLimitHit(Object.assign({},c,{sel:false})); }
  o.missing=[]; COMBOS.complete.unshift(o); COMBOS.near=COMBOS.near.filter(x=>x!==o);
  applyComboFlags(); renderCombos(); renderPool(); renderDeck(); save();
  toast(c&&c.sel?`Added ${n}. The combo is now complete.`:`${n} is in the pool, but couldn't be checked in for this bracket.`);
}

// ================= EDHREC staples you're missing =================
function staplesHTML(){
  if(!S.edh||!S.edh.pool.length||!S.cards.length) return "";
  const inDeck=new Set(S.cards.filter(c=>c.sel).map(c=>key(c.n))); S.commanders.forEach(c=>inDeck.add(key(c.name)));
  const list=S.edh.pool.filter(p=>p.inc!=null&&p.inc>=25&&!inDeck.has(key(p.n))&&!BASIC_NAMES.test(p.n)).filter(p=>{ const d=CARDDB[key(p.n)]; return !d||(d.legal==="legal"&&!d.ci.some(x=>!S.colors.includes(x))); }).sort((a,b)=>b.inc-a.inc).slice(0,12);
  if(!list.length) return "";
  return `<div class="cat"><div class="cat-h"><h3>Popular on EDHREC that you're not running</h3><span class="cnt">${list.length}</span></div>${list.map(p=>{ const d=CARDDB[key(p.n)], ow=owned(p.n);
    return `<div class="card"><span></span><div style="min-width:0"><div class="nmrow"><span class="nm"><a href="${sfUrl(p.n)}" target="_blank" rel="noopener">${esc(p.n)}</a></span>${ow?`<span class="tag own">Owned</span>`:""}${d&&d.gc?'<span class="tag gc">Game Changer</span>':""}</div><div class="edh">in ${p.inc}% of decks · ${p.syn>=0?"+":""}${p.syn}% synergy</div></div><div class="meta">${d&&d.usd!=null?`<span class="px">${money(d.usd)}</span>`:""}<button type="button" class="btn small" data-staple="${esc(p.n)}">Add</button></div></div>`; }).join("")}</div>`;
}
function addStaple(n){
  const p=S.edh&&S.edh.pool.find(x=>key(x.n)===key(n)); const d=CARDDB[key(n)];
  let c=S.cards.find(x=>key(x.n)===key(n));
  if(!c) c=addCard({n,c:catGuess(d),mv:d?d.mv:0,s:Math.max(5,Math.min(9,Math.round(5+(p?p.syn:0)/10))),usd:d?d.usd:null,w:p?`A staple for ${S.commanders[0]?S.commanders[0].name.split(",")[0]:"this commander"}: it's in ${p.inc}% of decks on EDHREC${p.syn>0?`, ${p.syn}% more often than in other decks of these colors`:""}.`:""},{o:"added"});
  if(c){ const br=blockReason(c)||(gcLimitHit(Object.assign({},c,{sel:false}))?"Game Changer limit":""); if(br){ toast(`${n} can't go in: ${br}.`); } else { c.sel=true; toast(`Added ${n}.`+(deckCount()>mainSize()?" You're over 99 now, so cut a card.":"")); } }
  renderPool(); renderDeck(); save();
}

// ================= card text =================
function oracleHTML(n){ const d=CARDDB[key(n)]; if(!d||!d.text) return ""; return `<details class="otext"><summary>Card text</summary><div>${esc(d.type)}${d.mana?" · "+pips(d.mana):""}\n${esc(d.text)}</div></details>`; }
const poolQ = () => fold(($("poolFilter")&&$("poolFilter").value||"").trim());

// ================= mana check =================
const COLS=["W","U","B","R","G"];
function pipCount(cost){ const out={W:0,U:0,B:0,R:0,G:0}; (String(cost||"").match(/\{[^}]+\}/g)||[]).forEach(t=>{ const v=t.slice(1,-1).toUpperCase(); const parts=v.split("/").filter(x=>COLS.includes(x)); parts.forEach(p=>out[p]+=1/parts.length); }); return out; }
function manaStats(){
  const pips={W:0,U:0,B:0,R:0,G:0}; let known=0, unknown=0;
  S.cards.filter(c=>c.sel&&c.c!=="land").forEach(c=>{ const d=CARDDB[key(c.n)]; if(!d||d.mana==null){ unknown++; return; } known++; const p=pipCount(d.mana); COLS.forEach(k=>pips[k]+=p[k]); });
  S.commanders.forEach(c=>{ const p=pipCount(c.manaCost); COLS.forEach(k=>pips[k]+=p[k]*2); });
  const src={W:0,U:0,B:0,R:0,G:0}; let landsKnown=0, landsUnknown=0;
  S.cards.filter(c=>c.sel&&c.c==="land").forEach(c=>{ const d=CARDDB[key(c.n)]; if(!d||!d.prod){ landsUnknown++; return; } landsKnown++; d.prod.forEach(x=>{ if(src[x]!=null) src[x]++; }); if(/command tower|exotic orchard|reflecting pool/i.test(c.n)) S.colors.forEach(x=>src[x]+= d.prod.includes(x)?0:1); });
  const bmap={Plains:"W",Island:"U",Swamp:"B",Mountain:"R",Forest:"G"};
  basicsList().forEach(([b,k])=>{ const x=bmap[b.replace(/^Snow-Covered /,"")]; if(x) src[x]+=k; });
  // nonland mana rocks with known produced colors
  S.cards.filter(c=>c.sel&&c.c==="ramp").forEach(c=>{ const d=CARDDB[key(c.n)]; if(d&&d.prod&&d.prod.length&&d.prod.length<5) d.prod.forEach(x=>{ if(src[x]!=null) src[x]+=0.5; }); });
  return {pips,src,known,unknown,landsUnknown};
}
function renderMana(){
  const el=$("manaOut"); if(!el) return;
  const cols=S.colors; const m=manaStats();
  if(!S.cards.length||!cols.length){ el.innerHTML='<span class="note">Shows how your lands match the colors your spells need.</span>'; $("rebalance").hidden=true; return; }
  if(m.known<10){ el.innerHTML=`<span class="note">${LIVE?'Needs mana costs. Use "Refresh live prices" to load them.':"Needs live card data. Open this page in the Claude desktop app."}</span>`; $("rebalance").hidden=true; return; }
  const tp=cols.reduce((a,c)=>a+m.pips[c],0)||1, ts=cols.reduce((a,c)=>a+m.src[c],0)||1;
  let anyLow=false;
  el.innerHTML = cols.map(c=>{ const ps=m.pips[c]/tp, ss=m.src[c]/ts; const low = (m.pips[c]>=8 && m.src[c]<12) || ss < ps*0.75; if(low) anyLow=true;
    return `<div class="mrow">${manaSym(c)}<span class="mbar" title="Top: share of colored pips. Bottom: share of sources."><i style="width:${(ps*100).toFixed(0)}%"></i><u style="width:${(ss*100).toFixed(0)}%"></u></span><span class="st ${low?"warn":"ok"}">${Math.round(m.pips[c])} pips · ${Math.round(m.src[c])} src</span></div>`; }).join("")
    + `<span class="note">Orange is how much of your spells' colored mana each color is; green is its share of your mana sources.${anyLow?" Colors in yellow are short on sources.":" Your sources match your spells."}${m.unknown?` ${m.unknown} cards without data aren't counted.`:""}</span>`;
  $("rebalance").hidden=!anyLow;
}
function rebalance(){
  const m=manaStats(); const cols=S.colors; const tp=cols.reduce((a,c)=>a+m.pips[c],0)||1;
  const bnames={W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"};
  if(S.basics){ const total=Object.values(S.basics).reduce((a,b)=>a+b,0); const raw=cols.map(c=>m.pips[c]/tp*total); const out=raw.map(Math.floor); let left=total-out.reduce((a,b)=>a+b,0); raw.map((v,i)=>[v-Math.floor(v),i]).sort((a,b)=>b[0]-a[0]).forEach(([,i])=>{ if(left>0){out[i]++;left--;} }); S.basics={}; cols.forEach((c,i)=>{ if(out[i]) S.basics[bnames[c]]=out[i]; }); }
  else { S.plan=S.plan||{summary:"",steps:[],winCons:[],lands:S.landTarget}; S.plan.weights={}; cols.forEach(c=>S.plan.weights[c]=m.pips[c]/tp); }
  render(); save(); toast("Basic lands rebalanced to match your spells' colors.");
}

// ================= playtest =================
let HAND=null;
function playDeck(){
  const out=[];
  S.cards.filter(c=>c.sel).forEach(c=>{ const d=CARDDB[key(c.n)]; const isLand=c.c==="land"||(d&&/\bLand\b/.test(d.type)&&!/Creature/.test(d.type)); out.push({n:c.n,land:isLand,ramp:c.c==="ramp"&&!isLand,mv:c.mv}); });
  basicsList().forEach(([b,k])=>{ for(let i=0;i<k;i++) out.push({n:b,land:true,ramp:false,mv:0}); });
  return out;
}
function shuffled(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function cmdrMV(){ const c=S.commanders[0]; if(!c) return 4; const d=CARDDB[key(c.name)]; if(d) return d.mv; let mv=0; (String(c.manaCost).match(/\{[^}]+\}/g)||[]).forEach(t=>{ const v=t.slice(1,-1); mv+= /^\d+$/.test(v)?Number(v):v==="X"?0:1; }); return mv||4; }
let oddsKey="", oddsCache=null;
function computeOdds(){
  const deck=playDeck(); if(deck.length<60) return null;
  const k=deck.map(x=>x.n).join("|"); if(k===oddsKey) return oddsCache;
  const N=4000, cmv=cmdrMV(); let keep=0, drops=0, onCurve=0, lands7=0, ramp7=0;
  for(let t=0;t<N;t++){
    const lib=shuffled(deck); const h=lib.slice(0,7); const L=h.filter(x=>x.land).length; lands7+=L;
    if(L>=2&&L<=4) keep++; if(h.some(x=>x.ramp)) ramp7++;
    if(lib.slice(0,10).filter(x=>x.land).length>=4) drops++;
    const seen=lib.slice(0,7+Math.max(0,cmv-1)); const mana=seen.filter(x=>x.land).length+seen.filter(x=>x.ramp&&x.mv<cmv).length;
    if(mana>=cmv) onCurve++;
  }
  oddsKey=k; oddsCache={keep:keep/N,drops:drops/N,onCurve:onCurve/N,avgL:lands7/N,ramp:ramp7/N,cmv,size:deck.length};
  return oddsCache;
}
function renderOdds(){
  if(PT) renderPlaytest();
  const el=$("odds"); if(!el||$("testSec").hidden||el.hidden) return;
  const o=computeOdds();
  if(!o){ el.innerHTML='<span class="note">Add at least 60 cards to see opening-hand odds.</span>'; return; }
  const pct=v=>Math.round(v*100)+"%";
  el.innerHTML=`<div><b>${pct(o.keep)}</b><span>of opening hands have 2–4 lands</span></div><div><b>${o.avgL.toFixed(1)}</b><span>lands in an average opening hand</span></div><div><b>${pct(o.ramp)}</b><span>of opening hands have a ramp card</span></div><div><b>${pct(o.drops)}</b><span>chance of 4 lands by turn 4 on the play</span></div><div><b>${pct(o.onCurve)}</b><span>chance to cast your commander on turn ${o.cmv}</span></div>`;
}
function drawHand(mull){
  const deck=playDeck(); if(!deck.length) return;
  const lib=shuffled(deck);
  HAND={lib:lib.slice(7),hand:lib.slice(0,7).map(x=>Object.assign({},x)),mull:mull?HAND.mull+1:0,turn:0};
  renderHand();
}
function renderHand(){
  if(!HAND){ $("hand").innerHTML=""; $("handNote").textContent=""; $("mull").disabled=true; $("drawOne").disabled=true; return; }
  const L=HAND.hand.filter(x=>x.land).length;
  const sorted=HAND.hand.slice().sort((a,b)=>(b.land-a.land)||(a.mv-b.mv));
  $("hand").innerHTML=sorted.map(x=>`<div class="hc ${x.land?"land":x.ramp?"ramp":""} ${x.fresh?"new":""}"><span>${esc(x.n)}</span><small>${x.land?"Land":x.ramp?"Ramp · MV "+x.mv:"MV "+x.mv}</small></div>`).join("");
  const verdict = L<2?"Too few lands, mulligan.":L>5?"Too many lands, mulligan.":(L===2&&!HAND.hand.some(x=>x.ramp))?"Risky: two lands and no ramp.":"Keepable.";
  $("handNote").textContent = `${L} land${L===1?"":"s"}${HAND.turn?` · turn ${HAND.turn+1} draw`:""}${HAND.mull?` · mulligan ${HAND.mull}: put ${Math.max(0,HAND.mull-1)} on the bottom (first one is free in multiplayer)`:""} · ${HAND.turn?"":verdict}`;
  $("mull").disabled=false; $("drawOne").disabled=!HAND.lib.length;
}

// ================= auto playtest =================
let PT=null;
function simCard(c){ const d=CARDDB[key(c.n)]; const isLand=c.c==="land"||!!(d&&/\bLand\b/.test(d.type)&&!/Creature/.test(d.type)); return {n:c.n,land:isLand,cat:isLand?"land":c.c,mv:isLand?0:(Number(c.mv)||0)}; }
function simDeck(){ const out=S.cards.filter(c=>c.sel).map(simCard); basicsList().forEach(([b,k])=>{ for(let i=0;i<k;i++) out.push({n:b,land:true,cat:"land",mv:0}); }); return out; }
function deckKey(){ return simDeck().map(x=>x.n).sort().join("|")+"#"+S.commanders.map(c=>c.name).join("+"); }
function keepable(h){ const L=h.filter(x=>x.land).length; if(L<2||L>5) return false; if(L===2&&!h.some(x=>x.cat==="ramp"&&x.mv<=3)&&h.filter(x=>!x.land&&x.mv<=2).length<2) return false; return true; }
function simGame(deck,cmv){
  let lib=shuffled(deck), hand=lib.slice(0,7), mull=0; lib=lib.slice(7);
  while(!keepable(hand)&&mull<2){ mull++; lib=shuffled(deck); hand=lib.slice(0,7); lib=lib.slice(7); }
  const opening=hand.slice(); let bottom=Math.max(0,mull-1);
  while(bottom-->0){ const L=hand.filter(x=>x.land).length; let i=-1; if(L>3) i=hand.findIndex(x=>x.land); else hand.forEach((x,j)=>{ if(!x.land&&(i<0||x.mv>hand[i].mv)) i=j; }); if(i<0) i=0; lib.push(hand.splice(i,1)[0]); }
  const seen=hand.slice(); let lands=0, rocks=0, cmdTurn=0, missed=false, early=false, inter=false, draw=false, avail=0, usedAll=0; const log=[];
  for(let t=1;t<=6;t++){
    if(t>1){ const c=lib.shift(); if(c){ hand.push(c); seen.push(c); } }
    const li=hand.findIndex(x=>x.land); if(li>=0){ hand.splice(li,1); lands++; } else if(t===2||t===3) missed=true;
    const mana=lands+rocks; let used=0; const cast=[];
    hand.sort((a,b)=>a.mv-b.mv);
    for(let i=0;i<hand.length;i++){ const x=hand[i]; if(x.cat==="ramp"&&x.mv>0&&x.mv<=mana-used&&!(cmdTurn===0&&cmv<=mana&&mana-used-x.mv<cmv&&t>=cmv)){ used+=x.mv; rocks++; cast.push(x.n); hand.splice(i,1); i--; } }
    if(!cmdTurn&&cmv<=mana-used){ used+=cmv; cmdTurn=t; cast.push("commander"); }
    hand.sort((a,b)=>b.mv-a.mv);
    for(let i=0;i<hand.length;i++){ const x=hand[i]; if(!x.land&&x.mv>0&&x.mv<=mana-used){ used+=x.mv; cast.push(x.n); hand.splice(i,1); i--; } }
    if(t<=2&&used>0) early=true;
    avail+=mana; usedAll+=used;
    if(t===4) inter=seen.some(x=>x.cat==="removal"||x.cat==="wipe");
    if(t===5) draw=seen.some(x=>x.cat==="draw");
    log.push(cast);
  }
  return {mull,opening,missed,flood:seen.filter(x=>x.land).length>=8,cmdTurn,early,inter,draw,eff:avail?usedAll/avail:0,lands};
}
function runPlaytest(){
  const deck=simDeck();
  if(deck.length<60){ $("ptNote").textContent="Add at least 60 cards first."; return; }
  const N=Number($("ptN").value)||1000, cmv=cmdrMV();
  const games=[]; for(let i=0;i<N;i++) games.push(simGame(deck,cmv));
  const share=f=>games.filter(f).length/N;
  const cmdT=games.map(g=>g.cmdTurn||7);
  const nl=S.cards.filter(c=>c.sel&&c.c!=="land");
  const counts={lands:deck.filter(x=>x.land).length,ramp:nl.filter(c=>c.c==="ramp").length,draw:nl.filter(c=>c.c==="draw").length,removal:nl.filter(c=>c.c==="removal"||c.c==="wipe").length,avgMv:nl.length?nl.reduce((a,c)=>a+(Number(c.mv)||0),0)/nl.length:0};
  const r={N,cmv,size:deck.length,counts,
    mull:share(g=>g.mull>0), screw:share(g=>g.missed), flood:share(g=>g.flood), onCurve:share(g=>g.cmdTurn&&g.cmdTurn<=cmv),
    cmdAvg:cmdT.reduce((a,b)=>a+b,0)/N, early:share(g=>g.early), inter:share(g=>g.inter), draw:share(g=>g.draw), eff:games.reduce((a,g)=>a+g.eff,0)/N,
    sample:games.slice(0,8), key:deckKey(), at:Date.now()};
  r.diags=diagnose(r);
  const prev = PT && PT.key!==r.key ? PT : (PT&&PT.prev)||null;
  r.prev = prev && prev.key!==r.key ? {mull:prev.mull,screw:prev.screw,flood:prev.flood,onCurve:prev.onCurve,early:prev.early,inter:prev.inter,draw:prev.draw,eff:prev.eff} : null;
  PT=r; renderPlaytest();
}
function grade(v,good,bad,higherBetter){ return higherBetter ? (v>=good?"ok":v>=bad?"warn":"bad") : (v<=good?"ok":v<=bad?"warn":"bad"); }
function diagnose(r){
  const d=[]; const pct=v=>Math.round(v*100)+"%";
  const lowLand = r.screw>0.2 || (r.mull>0.25 && r.counts.lands<37);
  const highLand = r.flood>0.25 && r.screw<0.15;
  if(lowLand && r.counts.lands<41){ const n=r.screw>0.32?2:1; d.push({id:"lands+",sev:r.screw>0.28?"bad":"warn",title:`Add ${n} land${n>1?"s":""}`,why:`It missed a land drop on turn 2 or 3 in ${pct(r.screw)} of games${r.mull>0.22?`, and mulliganed ${pct(r.mull)} of the time`:""}. With ${r.counts.lands} lands, the deck stumbles too often.`,kind:"addLand",n}); }
  else if(highLand && r.counts.lands>32){ d.push({id:"lands-",sev:r.flood>0.33?"bad":"warn",title:"Cut a land",why:`It drew 8 or more lands in its first 12 cards in ${pct(r.flood)} of games, and rarely missed land drops. You can afford one more spell.`,kind:"cutLand",n:1}); }
  if(r.cmv>=4 && r.onCurve<0.5){ const n=r.onCurve<0.35?3:2; d.push({id:"ramp",sev:r.onCurve<0.35?"bad":"warn",title:`Add ${n} cheap ramp cards`,why:`Your commander came down on turn ${r.cmv} in only ${pct(r.onCurve)} of games (average turn ${r.cmdAvg.toFixed(1)}). You have ${r.counts.ramp} ramp cards; cheap rocks get it out on time.`,kind:"add",cat:"ramp",n,filter:c=>c.mv<=2}); }
  if(r.early<0.6 || r.eff<0.55){ const n=2; d.push({id:"curve",sev:r.early<0.45||r.eff<0.45?"bad":"warn",title:"Lower your curve",why:`It had nothing to cast by turn 2 in ${pct(1-r.early)} of games and used only ${pct(r.eff)} of its mana over six turns. Average mana value is ${r.counts.avgMv.toFixed(2)}. Swap a couple of expensive cards for cheap plays.`,kind:"curve",n}); }
  if(r.inter<0.5){ const n=r.inter<0.38?3:2; d.push({id:"removal",sev:r.inter<0.38?"bad":"warn",title:`Add ${n} removal spells`,why:`It had removal or a wipe by turn 4 in only ${pct(r.inter)} of games (${r.counts.removal} in the deck). Without answers, an opponent's early threat runs away.`,kind:"add",cat:"removal",n,filter:c=>c.mv<=4}); }
  if(r.draw<0.55){ const n=r.draw<0.42?3:2; d.push({id:"draw",sev:r.draw<0.42?"bad":"warn",title:`Add ${n} card draw`,why:`It found a card-draw source by turn 5 in only ${pct(r.draw)} of games (${r.counts.draw} in the deck), so it runs out of gas in the midgame.`,kind:"add",cat:"draw",n,filter:()=>true}); }
  propose(d);
  return d;
}
function protectedCut(c){ const must=new Set(String(S.must||"").split(/\n|,/).map(key).filter(Boolean)); return must.has(key(c.n)); }
function propose(diags){
  const used=new Set();
  const catCount=cat=>S.cards.filter(c=>c.sel&&c.c===cat).length;
  const needed=new Set(diags.filter(d=>d.cat).map(d=>d.cat));
  const pickCuts=(n,opts)=>{ opts=opts||{};
    const list=S.cards.filter(c=>c.sel&&c.c!=="land"&&!used.has(c.id)&&!protectedCut(c)&&!(opts.avoid||[]).includes(c.c)&&!(needed.has(c.c))&&!(TARGETS[c.c]&&catCount(c.c)<=TARGETS[c.c]))
      .sort((a,b)=>opts.highMv? (b.mv-a.mv)||(a.s-b.s) : (a.s-b.s)||(b.mv-a.mv));
    const out=list.slice(0,n); out.forEach(c=>used.add(c.id)); return out; };
  const pickAdds=(cat,n,filter)=>{ const list=S.cards.filter(c=>!c.sel&&!c.swapOut&&!used.has(c.id)&&(!cat||c.c===cat)&&c.c!=="land"&&filter(c)&&!blockReason(c)&&!gcLimitHit(c))
      .sort((a,b)=>((owned(b.n)?1:0)-(owned(a.n)?1:0))||(b.s-a.s)||(a.mv-b.mv)); const out=list.slice(0,n); out.forEach(c=>used.add(c.id)); return out; };
  const bestBasic=()=>{ const m=manaStats(); const cols=S.colors.length?S.colors:["C"]; let best=cols[0], gap=-1e9; cols.forEach(c=>{ const g=(m.pips[c]||0)-(m.src[c]||0)*2; if(g>gap){gap=g;best=c;} }); return ({W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"})[best]||"Wastes"; };
  diags.forEach(d=>{
    d.swaps=[];
    if(d.kind==="addLand"){ const cuts=pickCuts(d.n); for(let i=0;i<d.n;i++) d.swaps.push({add:{basic:bestBasic()},cut:cuts[i]?{id:cuts[i].id}:null}); }
    else if(d.kind==="cutLand"){ const bl=basicsList().sort((a,b)=>b[1]-a[1]); const adds=pickAdds(null,1,()=>true); d.swaps.push({cut:bl.length?{basic:bl[0][0]}:null,add:adds[0]?{id:adds[0].id}:null}); }
    else if(d.kind==="add"){ const adds=pickAdds(d.cat,d.n,d.filter); const cuts=pickCuts(adds.length,{avoid:[d.cat]}); adds.forEach((a,i)=>d.swaps.push({add:{id:a.id},cut:cuts[i]?{id:cuts[i].id}:null})); if(adds.length<d.n) d.ask=true; }
    else if(d.kind==="curve"){ const cuts=pickCuts(d.n,{highMv:true}).filter(c=>c.mv>=5); const adds=[]; cuts.forEach(c=>{ const a=pickAdds(c.c,1,x=>x.mv<=2)[0]||pickAdds(null,1,x=>x.mv<=2)[0]; adds.push(a); }); cuts.forEach((c,i)=>d.swaps.push({cut:{id:c.id},add:adds[i]?{id:adds[i].id}:null})); if(!cuts.length||adds.some(a=>!a)) d.ask=true; }
    d.swaps.forEach(sw=>sw.on=true);
    d.request = { "lands+":"", "lands-":"", ramp:`Add ${d.n} cheap ramp cards (2 mana or less) and cut the weakest cards to make room. Playtests show my commander comes out late.`, curve:"Lower my curve: swap 2-3 of my most expensive, least important cards for strong 1-2 mana plays.", removal:`Add ${d.n} cheap removal or interaction spells and cut the weakest cards to make room.`, draw:`Add ${d.n} card draw sources and cut the weakest cards to make room.` }[d.id]||"";
  });
}
function swapLabel(x){
  if(!x) return null;
  if(x.basic) return {n:x.basic,meta:"basic land"};
  const c=S.cards.find(c=>c.id===x.id); if(!c) return null;
  return {n:c.n,meta:`${c.c==="land"?"land":"MV "+c.mv}${c.usd!=null?" · "+(owned(c.n)?"owned":priceTxt(c.usd,c.live)):""}`};
}
function renderPlaytest(){
  const el=$("ptOut"); if(!el) return;
  if(!PT){ el.innerHTML=""; $("ptNote").textContent=""; return; }
  const stale = PT.key!==deckKey();
  $("ptNote").textContent = stale ? "Your deck changed since this run. Run it again to update." : `${PT.N.toLocaleString()} games, turns 1–6, on the play.`;
  const pct=v=>Math.round(v*100)+"%";
  const del=(k,hb)=>{ if(!PT.prev||PT.prev[k]==null) return ""; const dv=Math.round((PT[k]-PT.prev[k])*100); if(!dv) return '<span class="delta">no change</span>'; const better=hb?dv>0:dv<0; return `<span class="delta ${better?"up":"down"}">${dv>0?"+":""}${dv} pts since last run</span>`; };
  const m=(v,label,st,k,hb)=>`<div class="pt-m ${st}"><b>${v}</b><span>${label}</span>${del(k,hb)}</div>`;
  const bad=PT.diags.filter(d=>d.sev==="bad").length, warn=PT.diags.filter(d=>d.sev==="warn").length;
  const vcls=bad?"bad":warn?"warn":"ok";
  const vtxt=bad?"Needs work":warn?"Playable, with a few fixes":"Solid";
  const vsub=bad||warn?`${PT.diags.length} thing${PT.diags.length>1?"s":""} to improve, with suggested swaps below.`:"Opens well, hits its land drops and finds its key cards on time. No changes needed.";
  const games=PT.sample.map((g,i)=>{ const L=g.opening.filter(x=>x.land).length; const names=g.opening.slice().sort((a,b)=>(b.land-a.land)||(a.mv-b.mv)).map(x=>x.land?`<i>${esc(x.n)}</i>`:esc(x.n)).join(", ");
    const out=[g.mull?`mulliganed ${g.mull}×`:"kept 7", g.missed?"missed a land drop":"hit land drops", g.cmdTurn?`commander turn ${g.cmdTurn}`:"no commander by turn 6", g.flood?"flooded":""].filter(Boolean).join(" · ");
    return `<div class="pt-game"><span class="g">#${i+1}</span><div class="h"><div>${names}</div><div class="muted small">${L} land${L===1?"":"s"}${g.mull?" (final hand after mulligan)":""} · ${out}</div></div></div>`; }).join("");
  const fixes=PT.diags.map((d,di)=>{
    const rows=d.swaps.map((sw,si)=>{ const a=swapLabel(sw.add), c=swapLabel(sw.cut); if(!a&&!c) return "";
      return `<label class="pt-swap"><input type="checkbox" data-sw="${di}:${si}" ${sw.on?"checked":""} ${stale?"disabled":""}><span>${a?`<span class="p">+ ${esc(a.n)}</span> <span class="muted small">${esc(a.meta)}</span>`:'<span class="muted">(leave the slot open)</span>'}${c?` &nbsp; <span class="m">− ${esc(c.n)}</span> <span class="muted small">${esc(c.meta)}</span>`:""}</span></label>`; }).join("");
    return `<div class="pt-fix ${d.sev}"><h4>${esc(d.title)}</h4><div class="small">${esc(d.why)}</div>${rows||'<div class="note">No good candidates in your card pool yet.</div>'}${d.request?`<div><button type="button" class="btn small ghost" data-ptask="${di}">${d.ask||!rows?"Ask Claude for options":"Ask Claude for other options"}</button></div>`:""}</div>`; }).join("");
  el.innerHTML = `<div class="pt-verdict ${vcls}"><b>${vtxt}</b><span>${vsub}</span></div>
    <div class="pt-grid">
      ${m(pct(1-PT.mull),"kept their opening 7",grade(PT.mull,0.25,0.35,false),"mull",false)}
      ${m(pct(1-PT.screw),"hit land drops on turns 2 and 3",grade(PT.screw,0.18,0.28,false),"screw",false)}
      ${m(pct(PT.flood),"flooded (8+ lands in first 12 cards)",grade(PT.flood,0.2,0.3,false),"flood",false)}
      ${m(pct(PT.onCurve),`cast the commander by turn ${PT.cmv}`,PT.cmv<4?"ok":grade(PT.onCurve,0.55,0.4,true),"onCurve",true)}
      ${m(pct(PT.early),"had a play by turn 2",grade(PT.early,0.65,0.5,true),"early",true)}
      ${m(pct(PT.inter),"had removal by turn 4",grade(PT.inter,0.55,0.42,true),"inter",true)}
      ${m(pct(PT.draw),"found card draw by turn 5",grade(PT.draw,0.6,0.45,true),"draw",true)}
      ${m(pct(PT.eff),"of available mana used, turns 1–6",grade(PT.eff,0.62,0.5,true),"eff",true)}
    </div>
    ${fixes?`<div style="display:grid;gap:10px"><span class="eyebrow">Suggested changes</span>${fixes}<div class="row"><button type="button" class="btn primary" id="ptApply" ${stale?"disabled":""}>Apply selected changes and re-test</button><span class="note">Each change keeps the deck at ${mainSize()} cards.</span></div></div>`:""}
    <details><summary class="small">What it drew: the first ${PT.sample.length} games</summary><div class="pt-games">${games}</div></details>`;
}
function applyPlaytest(){
  if(!PT) return; let n=0;
  const bump=(name,dir)=>{ if(S.basics){ S.basics[name]=Math.max(0,(S.basics[name]||0)+dir); } else { S.landTarget=Math.max(28,Math.min(45,S.landTarget+dir)); if(dir>0){ S.plan=S.plan||{summary:"",steps:[],winCons:[],lands:S.landTarget,weights:{}}; const col=Object.entries({W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest"}).find(([,b])=>b===name); if(col&&S.plan.weights){ S.plan.weights[col[0]]=(Number(S.plan.weights[col[0]])||1/(S.colors.length||1))+0.04; } } } };
  PT.diags.forEach(d=>d.swaps.forEach(sw=>{ if(!sw.on) return; n++;
    if(sw.add){ if(sw.add.basic) bump(sw.add.basic,1); else { const c=S.cards.find(x=>x.id===sw.add.id); if(c) c.sel=true; } }
    if(sw.cut){ if(sw.cut.basic) bump(sw.cut.basic,-1); else { const c=S.cards.find(x=>x.id===sw.cut.id); if(c) c.sel=false; } }
  }));
  if(!n){ toast("Tick at least one change first."); return; }
  render(); save(); runPlaytest(); toast(`Made ${n} change${n>1?"s":""} and re-ran the playtest.`);
  $("testSec").scrollIntoView({behavior:"smooth",block:"start"});
}

// ================= commander autocomplete =================
const fold = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
let CMDS=[];
const cmdsReady = loadJsonData("cmdData","commanders.json",j=>{ CMDS=String(j).split("\n").map(l=>{ const p=l.split("|"); const n=p[0]; return {n,ci:p[1]||"",r:Number(p[2])||99999,f:fold(n),w:fold(n).split(/[\s,'\-]+/).filter(Boolean)}; }); });
const AC={items:[],active:-1};
function acSegment(v){ const i=v.lastIndexOf("+"); return i<0? {pre:"",q:v} : {pre:v.slice(0,i+1)+" ",q:v.slice(i+1)}; }
function acMatch(q){
  q=fold(q).trim(); if(q.length<2) return [];
  const out=[];
  for(const c of CMDS){
    let sc=-1;
    if(c.f.startsWith(q)) sc=0;
    else if(q.length>=3 && c.w.some((w,i)=>i>0&&w.startsWith(q))) sc=1;
    else if((q.length>=4||q.includes(" ")) && c.f.includes(q)) sc=2;
    if(sc>=0) out.push([sc,c]);
  }
  out.sort((a,b)=>a[0]-b[0]||a[1].r-b[1].r||a[1].n.localeCompare(b[1].n));
  return out.slice(0,12).map(x=>x[1]);
}
function hl(name,q){
  const f=fold(name), qq=fold(q).trim(); let i=f.startsWith(qq)?0:f.indexOf(" "+qq)>=0?f.indexOf(" "+qq)+1:f.indexOf(qq);
  if(i<0||!qq) return esc(name);
  return esc(name.slice(0,i))+"<mark>"+esc(name.slice(i,i+qq.length))+"</mark>"+esc(name.slice(i+qq.length));
}
function acRender(){
  const el=$("acList"), inp=$("cmdInput");
  const {q}=acSegment(inp.value);
  if(!AC.items.length){
    if(fold(q).trim().length>=2 && CMDS.length){ el.innerHTML='<li class="ac-empty" role="presentation">No commander starts with that. Press Analyze to search anyway.</li>'; el.hidden=false; inp.setAttribute("aria-expanded","true"); }
    else acClose();
    return;
  }
  el.innerHTML = AC.items.map((c,i)=>`<li role="option" id="ac${i}" data-i="${i}" aria-selected="${i===AC.active}"><span class="an">${hl(c.n,q)}</span><span class="ap">${colorPips(c.ci.split("").filter(Boolean))}</span></li>`).join("")
    + `<li class="ac-foot" role="presentation">Most-built first · ↑↓ to move · Enter to pick · use "+" for partners</li>`;
  el.hidden=false; inp.setAttribute("aria-expanded","true");
  if(AC.active>=0){ inp.setAttribute("aria-activedescendant","ac"+AC.active); const a=document.getElementById("ac"+AC.active); if(a&&a.scrollIntoView) a.scrollIntoView({block:"nearest"}); } else inp.removeAttribute("aria-activedescendant");
}
function acClose(){ AC.items=[]; AC.active=-1; const el=$("acList"); el.hidden=true; el.innerHTML=""; $("cmdInput").setAttribute("aria-expanded","false"); $("cmdInput").removeAttribute("aria-activedescendant"); }
function acPick(i){
  const c=AC.items[i]; if(!c) return;
  const inp=$("cmdInput"); const {pre}=acSegment(inp.value);
  inp.value=pre+c.n; acClose(); inp.focus();
  const p=inp.value.length; try{ inp.setSelectionRange(p,p); }catch(e){}
}
$("cmdInput").addEventListener("input",()=>{ const {q}=acSegment($("cmdInput").value); AC.items=acMatch(q); AC.active=AC.items.length?0:-1; acRender(); });
$("cmdInput").addEventListener("focus",()=>{ const {q}=acSegment($("cmdInput").value); if(fold(q).trim().length>=2 && !CMDS.some(c=>c.f===fold(q).trim())){ AC.items=acMatch(q); AC.active=AC.items.length?0:-1; acRender(); } });
$("cmdInput").addEventListener("keydown",e=>{
  const open=!$("acList").hidden && AC.items.length;
  if(e.key==="ArrowDown"){ if(!open){ const {q}=acSegment($("cmdInput").value); AC.items=acMatch(q); AC.active=0; acRender(); } else { AC.active=(AC.active+1)%AC.items.length; acRender(); } e.preventDefault(); }
  else if(e.key==="ArrowUp" && open){ AC.active=(AC.active-1+AC.items.length)%AC.items.length; acRender(); e.preventDefault(); }
  else if((e.key==="Enter"||e.key==="Tab") && open && AC.active>=0){ const {q}=acSegment($("cmdInput").value); if(fold(q).trim()!==AC.items[AC.active].f){ e.preventDefault(); acPick(AC.active); } else acClose(); }
  else if(e.key==="Escape" && !$("acList").hidden){ acClose(); e.preventDefault(); }
});
$("acList").addEventListener("mousedown",e=>{ const li=e.target.closest("li[data-i]"); if(!li) return; e.preventDefault(); acPick(Number(li.dataset.i)); });
$("cmdInput").addEventListener("blur",()=>setTimeout(acClose,120));

// ================= events =================
document.querySelectorAll(".mode").forEach(b=>b.addEventListener("click",()=>{
  const m=b.dataset.mode; if(S.mode===m && !S.example) return;
  if(S.example){ const keep={bracket:S.bracket,budget:m==="import"?100:500,fmt:S.fmt}; S=fresh(m); Object.assign(S,keep); }
  else { S.mode=m; if(m==="import"&&S.cards.length&&!S.cards.some(c=>c.o==="deck")){ /* switching modes on a new build keeps it */ } }
  render(); save(); (m==="import"?$("importText"):m==="spin"?$("spinBtn"):$("cmdInput")).focus();
}));
$("spinBtn").addEventListener("click",spinDeck);
$("spinStop").addEventListener("click",()=>{ if(SPIN.ctl) SPIN.ctl.abort(); });
$("spinResult").addEventListener("click",e=>{ if(e.target.id==="spinReroll") spinDeck(); });
$("cmdForm").addEventListener("submit",e=>{ e.preventDefault(); acClose(); const q=$("cmdInput").value.trim(); if(!q){ $("cmdInput").focus(); return; } analyze(q); });
$("importBtn").addEventListener("click",importDeck);
$("importText").addEventListener("input",e=>{ S.importText=e.target.value; });
$("importCmdr").addEventListener("change",async e=>{
  if(e.target.id!=="cmdrPick") return; const name=e.target.value;
  const old=S.commanders[0]; const card=S.cards.find(c=>key(c.n)===key(name));
  if(card) S.cards=S.cards.filter(c=>c!==card);
  if(old){ const d=CARDDB[key(old.name)]; const back=normCard({n:old.name,c:catGuess(d),mv:d?d.mv:0,s:5,usd:null,w:"",sel:true,o:"deck"}); applyLive(back); S.cards.push(back); }
  const d=CARDDB[key(name)]; S.commanders=[d?{name:d.name,manaCost:d.mana,type:d.type,text:d.text}:{name,manaCost:"",type:"",text:""}];
  S.colors=d?["W","U","B","R","G"].filter(c=>d.ci.includes(c)):S.colors;
  S.edh=null; S.gameplans=[]; if(LIVE){ setBusy(true); await loadEdhForCommander($("importStatus")); if(S.edh){ S.cards.forEach(applyLive); S.gameplans=S.edh.themes.slice(0,8).map(t=>({id:t.slug,name:t.name,decks:t.count})); } setBusy(false); }
  render(); if(sample){ setBusy(true); try{ await describePlans(undefined, $("importStatus")); $("importStatus").innerHTML=""; }catch(e){ $("importStatus").innerHTML=`<div class="warnbox">${esc(errMsg(e))}</div>`; } setBusy(false); }
  render(); save();
});
$("stopBtn").addEventListener("click",()=>running.forEach(c=>c.abort()));
$("buildBtn").addEventListener("click",build);
$("plans").addEventListener("click",async e=>{ if(e.target.id==="redesc"){ const st=S.mode==="import"?$("importStatus"):$("cmdStatus"); const ctl=new AbortController(); running=[ctl]; setBusy(true); renderPlans(); try{ await describePlans(ctl.signal, st); st.innerHTML=""; }catch(err){ st.innerHTML=err&&err.code==="cancelled"?"":`<div class="warnbox">${esc(errMsg(err))}</div>`; } running=[]; setBusy(false); renderPlans(); renderCommander(); save(); return; } const b=e.target.closest(".plan"); if(!b) return; const id=b.dataset.id; if(S.chosen.includes(id)) S.chosen=S.chosen.filter(x=>x!==id); else { S.chosen.push(id); if(S.chosen.length>2) S.chosen.shift(); } renderPlans(); save(); });
$("custom").addEventListener("input",e=>{S.custom=e.target.value; save();});
$("must").addEventListener("input",e=>{S.must=e.target.value; save();});
$("avoid").addEventListener("input",e=>{S.avoid=e.target.value; save();});
$("brackets").addEventListener("click",e=>{ const b=e.target.closest(".bk"); if(!b) return; S.bracket=Number(b.dataset.b); const n=enforceBracket(); if(n) toast(`Removed ${n} card${n>1?"s":""} that break bracket ${S.bracket}. "Fill open slots" replaces them.`); render(); save(); });
$("budget").addEventListener("input",e=>{ S.budget=Math.max(0,Number(e.target.value)||0); $("presets").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(Number(x.dataset.v)===S.budget))); renderDeck(); save(); });
$("presets").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return; S.budget=Number(b.dataset.v); renderBracket(); renderDeck(); save(); });
$("pool").addEventListener("change",e=>{ const id=e.target.dataset&&e.target.dataset.id; if(!id) return; const c=S.cards.find(x=>x.id===id); if(!c) return; if(c.swapOut) toggleSwap(c,e.target.checked); else c.sel=e.target.checked; renderPool(); renderDeck(); save(); });
$("pool").addEventListener("click",e=>{
  if(e.target.id==="applyAll"){ let n=0; S.cards.filter(c=>c.swapOut&&!c.sel&&!blockReason(c)).forEach(c=>{ toggleSwap(c,true); n++; }); toast(`Applied ${n} upgrades.`); renderPool(); renderDeck(); save(); return; }
  const sw=e.target.closest("[data-swap]"); if(sw){ const c=S.cards.find(x=>x.id===sw.dataset.id); if(c){ const from=c.n; swapAlt(c,sw.dataset.swap); toast(`Swapped ${from} for ${c.n}.`); renderPool(); renderDeck(); save(); } return; }
  const m=e.target.closest("[data-more]"); if(m) more(m.dataset.more);
  const sp=e.target.closest("[data-staple]"); if(sp) addStaple(sp.dataset.staple);
});
$("showOff").addEventListener("change",renderPool);
$("autofillBtn").addEventListener("click",()=>{ autofill(); render(); save(); toast(`Picked the best ${deckCount()} cards for bracket ${S.bracket}.`); });
$("fillOpenBtn").addEventListener("click",()=>{ const b=deckCount(); fillOpen(); render(); save(); toast(deckCount()>b?`Added ${deckCount()-b} cards.`:"No open slots, or no eligible cards left. Try Suggest more."); });
$("refreshBtn").addEventListener("click",refreshPrices);
$("fitBtn").addEventListener("click",()=>fitBudget(false));
$("upBtn").addEventListener("click",upgradeBudget);
$("refineExamples").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return; $("refineText").value=b.textContent; $("refineText").focus(); });
$("refineBtn").addEventListener("click",refine);
$("refineOut").addEventListener("change",e=>{ if(e.target.dataset&&e.target.dataset.prop) updateRefineNet(); });
$("refineOut").addEventListener("click",e=>{ if(e.target.id==="applyRefine") applyRefine(); if(e.target.id==="dismissRefine"){ S.refine=null; renderRefine(); save(); } });
document.querySelectorAll("[data-fmt]").forEach(b=>b.addEventListener("click",()=>{ S.fmt=b.dataset.fmt; renderExport(); save(); }));
$("copyBtn").addEventListener("click",()=>{ const t=exportText(); const ta=$("exportText"); navigator.clipboard.writeText(t).then(()=>toast("Copied. Paste it into the import box."),()=>{ ta.focus(); ta.select(); toast("Press Ctrl/Cmd+C to copy the selected list."); }); });
$("dlBtn").addEventListener("click",async()=>{ try{ await downloads.save({filename:(S.commanders[0]?S.commanders[0].name.split(",")[0]:"deck").replace(/[^\w ]+/g,"").trim()+" - "+(S.fmt==="moxfield"?"moxfield":"archidekt")+".txt",data:exportText()}); }catch(e){} });
$("saved").addEventListener("click",async e=>{
  const l=e.target.closest("[data-load]"); if(l){ const st=await buildState(l.dataset.load); if(st){ if(DIRTY && l.dataset.confirm!=="1"){ l.dataset.confirm="1"; const t=l.textContent; l.textContent="Unsaved changes will be lost. Click again to open "+t; setTimeout(()=>{ if(l.isConnected){ l.dataset.confirm=""; l.textContent=t; } },4000); return; } S=st; S.cards.forEach(normCard); S.savedName=S.savedName||l.dataset.load; S.example=false; COMBOS=null; PT=null; HAND=null; DIRTY=false; $("deckName").value=S.savedName; $("saveNote").textContent=""; render(); renderCombos(); renderPlaytest(); renderHand(); renderSaveBar(); window.scrollTo&&window.scrollTo({top:0,behavior:"smooth"}); toast("Opened "+l.dataset.load+"."); } else toast("Couldn't load that build."); return; }
  const d=e.target.closest("[data-del]"); if(d){ if(d.dataset.confirm!=="1"){ d.dataset.confirm="1"; d.textContent="Confirm"; setTimeout(()=>{ if(d.isConnected){d.dataset.confirm="";d.textContent="Delete";} },3000); return; } buildsDel(d.dataset.del); renderSaved(); }
});

// ---------- collection & tabs events ----------
function showView(v){
  const coll=v==="collection";
  $("builderView").hidden=coll; $("collectionView").hidden=!coll;
  $("tabBuilder").setAttribute("aria-selected",String(!coll)); $("tabColl").setAttribute("aria-selected",String(coll));
  document.querySelector(".mobilebar")&&(document.querySelector(".mobilebar").style.display=coll?"none":"");
  if(coll) renderCollection();
  try{ sessionStorage.setItem("cforge.view",v); }catch(e){}
}
$("tabBuilder").addEventListener("click",()=>showView("builder"));
$("tabColl").addEventListener("click",()=>showView("collection"));
$("collFile").addEventListener("change",e=>{ handleFile(e.target.files&&e.target.files[0]); e.target.value=""; });
["dragenter","dragover"].forEach(t=>$("drop").addEventListener(t,e=>{ e.preventDefault(); $("drop").classList.add("over"); }));
["dragleave","drop"].forEach(t=>$("drop").addEventListener(t,e=>{ e.preventDefault(); $("drop").classList.remove("over"); }));
$("drop").addEventListener("drop",e=>{ const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(f) handleFile(f); });
$("upPreview").addEventListener("click",e=>{
  const id=e.target.id;
  if(id==="upCancel"){ pendingUpload=null; $("upPreview").innerHTML=""; }
  if(id==="upAdd"&&pendingUpload){ const d=needDest(); if(!d.ok) return; const added=pendingUpload; const undo=collAddMany(pendingUpload,"add",d.loc); pendingUpload=null; $("upPreview").innerHTML=""; afterDest(d.loc); toast(`Added ${cardCount(added)} to ${locLabel(d.loc)}.`,{label:"Undo",fn:undo}); }
  if(id==="upReplace"&&pendingUpload){
    const d=needDest(); if(!d.ok) return;
    if(e.target.dataset.confirm!=="1"){ e.target.dataset.confirm="1"; e.target.textContent=`Click again to replace the ${placeCount(d.loc).toLocaleString()} cards in ${d.loc||"General collection"}`; return; }
    const added=pendingUpload; const undo=collAddMany(pendingUpload,"replace",d.loc); pendingUpload=null; $("upPreview").innerHTML=""; afterDest(d.loc); toast(`${d.loc||"General collection"} now has ${cardCount(added)} from the file.`,{label:"Undo",fn:undo});
  }
});
$("addForm").addEventListener("submit",e=>{ e.preventDefault(); const n=cleanName($("addName").value); const q=Math.max(1,Number($("addQty").value)||1); if(!n){ $("addName").focus(); return; } const d=needDest(); if(!d.ok) return; const any=owned(n); const name=any?any.n:n; const here=COLL.get(ckey(name,d.loc)); collSet(name,(here?here.q:0)+q,d.loc); afterDest(d.loc); toast(`${name}: ${(here?here.q:0)+q} in ${d.loc||"General collection"}${owned(name).q>(here?here.q:0)+q?` (${owned(name).q} total)`:""}.`); $("addName").value=""; $("addQty").value=1; AC2.items=[]; ac2Render(); $("addName").focus(); });
$("addName").addEventListener("input",ac2Update);
$("addName").addEventListener("keydown",e=>{ const open=!$("addList").hidden&&AC2.items.length;
  if(e.key==="ArrowDown"&&open){ AC2.active=(AC2.active+1)%AC2.items.length; ac2Render(); e.preventDefault(); }
  else if(e.key==="ArrowUp"&&open){ AC2.active=(AC2.active-1+AC2.items.length)%AC2.items.length; ac2Render(); e.preventDefault(); }
  else if(e.key==="Enter"&&open&&AC2.active>=0&&fold($("addName").value.trim())!==fold(AC2.items[AC2.active])){ e.preventDefault(); ac2Pick(AC2.active); }
  else if(e.key==="Escape"){ AC2.items=[]; ac2Render(); } });
$("addList").addEventListener("mousedown",e=>{ const li=e.target.closest("li[data-i]"); if(!li) return; e.preventDefault(); ac2Pick(Number(li.dataset.i)); });
$("addName").addEventListener("blur",()=>setTimeout(()=>{ AC2.items=[]; ac2Render(); },120));
$("pasteBtn").addEventListener("click",()=>{ const list=parsePasted($("pasteList").value); if(!list.length){ $("pasteNote").textContent="Nothing to add. Put one card per line, like “4 Sol Ring”."; return; } const d=needDest(); if(!d.ok) return; const undo=collAddMany(list,"add",d.loc); $("pasteList").value=""; $("pasteNote").textContent=""; afterDest(d.loc); toast(`Added ${cardCount(list)} to ${locLabel(d.loc)}.`,{label:"Undo",fn:undo}); });
$("collSearch").addEventListener("input",()=>{ collLimit=150; renderCollection(); });
$("collSort").addEventListener("change",renderCollection);
$("collColors").addEventListener("click",e=>{ const b=e.target.closest("[data-cg]"); if(!b) return; if(b.dataset.cg==="all") COLLCF.clear(); else { const g=Number(b.dataset.cg); COLLCF.has(g)?COLLCF.delete(g):COLLCF.add(g); } collLimit=150; renderCollection(); });
$("collTable").addEventListener("click",e=>{
  if(e.target.id==="collMore"){ collLimit+=150; renderCollection(); return; }
  const st=e.target.closest("[data-cq]"); if(st){ const v=COLL.get(st.dataset.cq); if(v) collSet(v.n, v.q+Number(st.dataset.d), v.loc); return; }
  const rm=e.target.closest("[data-crm]"); if(rm){ const v=COLL.get(rm.dataset.crm); if(v){ const undo=collMutate(()=>{ COLL.delete(rm.dataset.crm); return [rm.dataset.crm]; },true); toast(`Removed ${v.n}.`,{label:"Undo",fn:undo}); } }
});
$("collCopy").addEventListener("click",()=>{ const t=collText(); navigator.clipboard.writeText(t).then(()=>toast("Collection copied as a list."),()=>toast("Copy didn't work in this view. Use Save .csv instead.")); });
$("collDl").addEventListener("click",async()=>{ try{ await downloads.save({filename:"my-mtg-collection.csv",data:collCSV()}); }catch(e){} });
$("collClear").addEventListener("click",e=>{
  if(!COLL.size) return;
  const b=e.target; if(b.dataset.confirm!=="1"){ b.dataset.confirm="1"; b.textContent=`Click again to delete all ${COLL.size.toLocaleString()} cards`; setTimeout(()=>{ if(b.isConnected){ b.dataset.confirm=""; b.textContent="Delete all"; } },4000); return; }
  b.dataset.confirm=""; b.textContent="Delete all";
  const undo=clearCollection(); toast("Deleted your collection.",{label:"Undo",fn:undo});
});
$("preferOwned").addEventListener("change",e=>{ S.preferOwned=e.target.checked; save(); });
$("ownedFree").addEventListener("change",e=>{ S.ownedFree=e.target.checked; renderPool(); renderDeck(); save(); });
$("ownedOnly").addEventListener("change",renderPool);
$("shopCopy").addEventListener("click",()=>{ const t=shopList().map(c=>"1 "+c.n).join("\n"); navigator.clipboard.writeText(t).then(()=>toast("Shopping list copied."),()=>toast("Copy didn't work in this view.")); });
$("shopBought").addEventListener("click",()=>{ const list=shopList().map(c=>({n:c.n,q:1})); if(!list.length) return; const loc=defaultDeckName()||""; const undo=collAddMany(list,"add",loc); toast(`Added ${cardCount(list)} to ${locLabel(loc)}.`,{label:"Undo",fn:undo}); });
$("importOwnBtn").addEventListener("click",()=>{ const list=S.cards.filter(c=>c.o==="deck").map(c=>({n:c.n,q:1})); S.commanders.forEach(c=>list.push({n:c.name,q:1})); basicsList().forEach(([b,k])=>list.push({n:b,q:k})); const loc=(defaultDeckName()||"Imported deck").replace(/ \(imported\)$/,""); const all=aggregate(list); const undo=collAddMany(all,"replace",loc); toast(`Saved ${cardCount(all)} as deck “${loc}” in your collection.`,{label:"Undo",fn:undo}); });
$("collDest").addEventListener("change",()=>{ $("collDestName").hidden=$("collDest").value!=="__new"; if(!$("collDestName").hidden) $("collDestName").focus(); if(pendingUpload) $("upPreview").querySelector&&($("upPreview").querySelector("#upAdd")||{}).textContent!==undefined&&($("upPreview").querySelector("#upAdd").textContent="Add to "+destName()); });
$("collDestName").addEventListener("input",()=>{ if(pendingUpload&&$("upPreview").querySelector){ const b=$("upPreview").querySelector("#upAdd"); if(b) b.textContent="Add to "+destName(); } });
$("collLoc").addEventListener("change",()=>{ collLimit=150; const v=$("collLoc").value; if(v!=="*"&&v!=="__gen"){ OPENDECK=v; loadDeckData(v); } renderCollection(); });
$("deckGrid").addEventListener("click",e=>{
  const t=e.target.closest("[data-deck]"); if(!t) return; const loc=t.dataset.deck;
  OPENDECK = OPENDECK===loc ? null : loc;
  $("collLoc").value = OPENDECK || "*"; collLimit=150; renderCollection();
  if(OPENDECK){ loadDeckData(loc); const dd=$("deckDetail"); dd.scrollIntoView&&dd.scrollIntoView({behavior:"smooth",block:"nearest"}); }
});
$("deckDetail").addEventListener("change",e=>{
  const sel=e.target.closest("[data-dcmd]"); if(!sel||!OPENDECK) return;
  const cur=deckCommanders(OPENDECK).slice(); const i=Number(sel.dataset.dcmd);
  if(i===0){ cur[0]=sel.value; if(!sel.value) cur.length=0; } else { if(sel.value) cur[1]=sel.value; else cur.length=Math.min(cur.length,1); }
  setMeta(OPENDECK,{commanders:cur.filter(Boolean)}); loadDeckData(OPENDECK); toast(cur.filter(Boolean).length?`Commander set to ${cur.filter(Boolean).join(" + ")}.`:"Commander cleared.");
});
$("deckDetail").addEventListener("click",e=>{
  const b=e.target.closest("[data-dact]"); if(!b||!OPENDECK) return; const loc=OPENDECK, act=b.dataset.dact;
  if(act==="playtest") return openDeckInBuilder(loc,true);
  if(act==="open") return openDeckInBuilder(loc,false);
  if(act==="desc") return describeDeck(loc);
  if(act==="sugg") return suggestDeck(loc);
  if(act==="rename"){ const inp=$("deckDetail").querySelector("[data-dact-name]"); const to=(inp&&inp.value||"").trim(); if(!to||to===loc) return; if(decksList().some(d=>d.name===to)){ toast(`There's already a deck called “${to}”. Pick another name.`); return; } const undo=renameDeck(loc,to); renderCollection(); toast(`Renamed to “${to}”.`,{label:"Undo",fn:()=>{ undo(); if(DECKMETA[to]){ DECKMETA[loc]=DECKMETA[to]; delete DECKMETA[to]; persistMeta(); } OPENDECK=loc; renderCollection(); }}); return; }
  if(act==="move"){ const undo=moveLocation(loc,""); OPENDECK=null; $("collLoc").value="*"; renderCollection(); toast(`Moved “${loc}” into your general collection.`,{label:"Undo",fn:undo}); return; }
  if(act==="delete"){ if(b.dataset.confirm!=="1"){ b.dataset.confirm="1"; b.textContent="Click again to delete it"; setTimeout(()=>{ if(b.isConnected){ b.dataset.confirm=""; b.textContent="Delete deck"; } },4000); return; } const undo=deleteLocation(loc); OPENDECK=null; $("collLoc").value="*"; renderCollection(); toast(`Deleted “${loc}”.`,{label:"Undo",fn:undo}); }
});
// ---------- cards you own ----------
$("ownBtn").addEventListener("click",checkOwned);
$("ownOut").addEventListener("click",e=>{ if(e.target.id==="ownMore"){ ownShowAll=!ownShowAll; renderOwnCheck(); return; } const b=e.target.closest("[data-own]"); if(b) useOwned(b.dataset.own,b.dataset.rep); });

// ---------- save / discard ----------
$("saveDeck").addEventListener("click",saveDeck);
$("discardDeck").addEventListener("click",discardDeck);
$("deckName").addEventListener("input",()=>{ $("saveDeck").dataset.confirm=""; renderSaveBar(); });
$("deckName").addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); saveDeck(); } });
$("pool").addEventListener("click",e=>{ if(e.target.id==="loadExample") loadExample(); });
window.addEventListener("beforeunload",e=>{ if(DIRTY && !inClaude()){ e.preventDefault(); e.returnValue=""; } });
["brackets","presets"].forEach(id=>$(id).addEventListener("click",()=>setTimeout(savePrefs,0)));
$("budget").addEventListener("input",()=>setTimeout(savePrefs,0));
document.querySelectorAll("[data-fmt]").forEach(b=>b.addEventListener("click",()=>setTimeout(savePrefs,0)));

// ---------- AI engine events ----------
document.querySelectorAll("[data-ai]").forEach(b=>b.addEventListener("click",async()=>{ if(SERVER){ try{ await putServerAi({provider:b.dataset.ai==="claude"?"anthropic":"gemini"}); }catch(e){ toast(errMsg(e)); } applyProvider(); return; } const c=aiCfg(); c.provider=b.dataset.ai; saveAiCfg(c); applyProvider(); }));
$("gemTest").addEventListener("click",testGemini);
async function saveModelChoice(){ if(!SERVER) return; const prov=serverProvider(); const b={autoFallback:$("autoFb").checked}; b[prov==="anthropic"?"anthropicModel":"geminiModel"]=$("gemModelSel").value; b[prov==="anthropic"?"anthropicFast":"geminiFast"]=$("gemFastSel").value; try{ await putServerAi(b); toast("Saved. "+(b.autoFallback?"Busy models will fall back automatically.":"Automatic fallback is off.")); }catch(e){ toast(errMsg(e)); } applyProvider(); }
["gemModelSel","gemFastSel","autoFb"].forEach(id=>$(id).addEventListener("change",saveModelChoice));
$("gemKey").addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); testGemini(); } });

// ---------- v6 events ----------
$("preconFilter").addEventListener("input",renderPrecons);
$("preconLoad").addEventListener("click",()=>{ const i=Number($("preconSel").value); if(!isNaN(i)&&$("preconSel").value!=="") loadPrecon(i); });
$("cmdView").addEventListener("click",e=>{ const b=e.target.closest("[data-precon]"); if(b) loadPrecon(Number(b.dataset.precon)); });
$("comboBtn").addEventListener("click",findCombos);
$("comboOut").addEventListener("click",e=>{ const b=e.target.closest("[data-addcombo]"); if(b) addComboPiece(b.dataset.addcombo); });
$("poolFilter").addEventListener("input",renderPool);
$("rebalance").addEventListener("click",rebalance);
$("ptRun").addEventListener("click",()=>{ $("ptNote").textContent="Playing games…"; setTimeout(runPlaytest,20); });
$("ptOut").addEventListener("change",e=>{ const v=e.target.dataset&&e.target.dataset.sw; if(!v||!PT) return; const [di,si]=v.split(":").map(Number); const sw=PT.diags[di]&&PT.diags[di].swaps[si]; if(sw) sw.on=e.target.checked; });
$("ptOut").addEventListener("click",e=>{ if(e.target.id==="ptApply") applyPlaytest(); const a=e.target.closest("[data-ptask]"); if(a&&PT){ const d=PT.diags[Number(a.dataset.ptask)]; if(d&&d.request){ $("refineText").value=d.request; $("refineSec").scrollIntoView({behavior:"smooth",block:"start"}); refine(); } } });
$("draw7").addEventListener("click",()=>drawHand(false));
$("mull").addEventListener("click",()=>drawHand(true));
$("drawOne").addEventListener("click",()=>{ if(!HAND||!HAND.lib.length) return; HAND.hand.forEach(x=>x.fresh=false); const c=Object.assign({},HAND.lib.shift(),{fresh:true}); HAND.hand.push(c); HAND.turn++; renderHand(); });

// ================= boot =================
function loadInitial(){
  // Every visit starts with a fresh deck. Keep only the last bracket, budget and export format.
  let prefs={};
  try{ prefs=JSON.parse(localStorage.getItem("cforge.prefs")||"{}")||{}; localStorage.removeItem("cforge.current"); }catch(e){}
  S=fresh("new"); S.bracket=Number(prefs.bracket)||3; S.budget=prefs.budget!=null?Number(prefs.budget):500; S.fmt=prefs.fmt||"archidekt";
}
function savePrefs(){ try{ localStorage.setItem("cforge.prefs",JSON.stringify({bracket:S.bracket,budget:S.budget,fmt:S.fmt})); }catch(e){} }
loadCollLocal(); loadMetaLocal(); loadInitial(); mcp=undefined; render(); renderCollection(); renderPrecons(); renderCombos();
preconsReady.then(()=>{ renderPrecons(); renderCommander(); });
try{ const v=(location.hash||"").replace("#","")||sessionStorage.getItem("cforge.view"); if(v==="collection") showView("collection"); }catch(e){}
if (window.claude && window.claude.use){
  claudeSample=undefined;
  window.claude.use("sample").then(s=>{ claudeSample=s||null; applyProvider(); }).catch(()=>{ claudeSample=null; applyProvider(); });
  window.claude.use("downloads").then(d=>{ downloads=d; $("dlBtn").hidden=!d; $("collDl").hidden=!d; }).catch(()=>{});
  initCollectionStore();
  window.claude.use("mcp").then(async m=>{
    mcp=m||null;
    if(m){ try{ const l=await m.listTools("host:claude_browser"); LIVE=!!(l&&l.servers&&l.servers.some(s=>s.server==="host:claude_browser")); }catch(e){ LIVE=false; } }
    renderLive(); renderDeck(); renderCombos();
  }).catch(()=>{ mcp=null; renderLive(); });
} else {
  mcp=null; renderLive();
  fetch("api/health").then(r=>r.ok?r.json():null).then(async h=>{
    if(!h||h.mode!=="server"){ setSync("local"); return; }
    SERVER=true; LIVE=true;
    downloads={ save: async ({filename,data})=>{ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([data],{type:"text/plain"})); a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000); } };
    $("dlBtn").hidden=false; $("collDl").hidden=false;
    await refreshServerAi();
    try{ const b=await fetch("api/builds").then(r=>r.json()); BUILDS={}; (b.builds||[]).forEach(x=>{ BUILDS[x.name]={t:x.t,count:x.count}; }); }catch(e){}
    await initCollectionStore();
  }).catch(()=>setSync("local")).finally(()=>{ renderLive(); applyProvider(); render(); renderSaved(); renderCombos(); });
}
})();
