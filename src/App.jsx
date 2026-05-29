import { useState, useRef, useEffect } from "react";

const cuisines = [
  { name:"Indian",        emoji:"🍛", tag:"Spicy & Aromatic",  grad:["#ff6b35","#f7c59f"], img:"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80" },
  { name:"Italian",       emoji:"🍝", tag:"Rich & Comforting",  grad:["#2d6a4f","#95d5b2"], img:"https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600&q=80" },
  { name:"Chinese",       emoji:"🥡", tag:"Bold & Savory",      grad:["#c1121f","#ffb703"], img:"https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80" },
  { name:"Mexican",       emoji:"🌮", tag:"Vibrant & Zesty",    grad:["#e9c46a","#f4a261"], img:"https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80" },
  { name:"Mediterranean", emoji:"🫙", tag:"Fresh & Light",      grad:["#457b9d","#a8dadc"], img:"https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80" },
  { name:"Japanese",      emoji:"🍱", tag:"Delicate & Umami",   grad:["#7b2d8b","#c77dff"], img:"https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&q=80" },
  { name:"Thai",          emoji:"🍜", tag:"Sweet & Spicy",      grad:["#06b6d4","#67e8f9"], img:"https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=600&q=80" },
  { name:"American",      emoji:"🍔", tag:"Hearty & Bold",      grad:["#ef233c","#8d99ae"], img:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80" },
];

const TRENDING = [
  { name:"Butter Chicken",      cuisine:"Indian",  time:"45 mins", img:"https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80" },
  { name:"Spaghetti Carbonara", cuisine:"Italian", time:"25 mins", img:"https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&q=80" },
  { name:"Pad Thai",            cuisine:"Thai",    time:"30 mins", img:"https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=80" },
];

const HERO     = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=80";
const FALLBACK = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80";

const dietTabs = [
  { key:"Veg",     label:"Vegetarian",     icon:"🥦", color:"#2d6a4f" },
  { key:"Non-Veg", label:"Non-Vegetarian", icon:"🍗", color:"#9b2226" },
  { key:"Vegan",   label:"Vegan",          icon:"🌱", color:"#386641" },
];

const G = { cream:"#fdf8f0", dark:"#1a1a1a", green:"#2d6a4f", red:"#9b2226", warm:"#c9882b", muted:"#666", border:"#e8e0d5" };
const play = { fontFamily:"'Playfair Display',Georgia,serif" };

const API_URL = typeof window !== "undefined" && window.location.hostname.includes("netlify")
  ? "/.netlify/functions/claude"
  : "https://api.anthropic.com/v1/messages";

const callAI = async (system, userMsg, max_tokens=1500) => {
  const res = await fetch(API_URL, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ max_tokens, system, messages:[{ role:"user", content:userMsg }] })
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.content?.[0]?.text || "";
};

const extractJSON = (text) => {
  try { return JSON.parse(text.trim()); } catch {}
  const c = text.replace(/```json\s?/gi,"").replace(/```\s?/gi,"").trim();
  try { return JSON.parse(c); } catch {}
  const arr = text.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]); } catch {} }
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch {} }
  throw new Error("Could not parse JSON");
};

// Fast Unsplash image using AI-provided specific keyword + name-based seed
// The seed ensures the same dish always gets the same image (no flickering)
const strHash = (s) => Math.abs(s.split("").reduce((a,c) => (a * 31 + c.charCodeAt(0)) | 0, 0));
const foodImg = (keyword, fallback) => {
  if (!keyword) return fallback;
  const seed = strHash(keyword);
  return `https://source.unsplash.com/600x400/?${encodeURIComponent(keyword)}&sig=${seed}`;
};

export default function TasteMania() {
  const [step,       setStep]    = useState("home");
  const [cuisine,    setCuisine] = useState(null);
  const [diet,       setDiet]    = useState("Veg");
  const [recipes,    setRecipes] = useState([]);
  const [loading,    setLoading] = useState(false);
  const [recipe,     setRecipe]  = useState(null);
  const [detail,     setDetail]  = useState(null);
  const [detLoading, setDL]      = useState(false);
  const [error,      setError]   = useState("");
  const [search,     setSearch]  = useState("");
  const [suggestions,setSugg]    = useState([]);
  const [suggLoading,setSL]      = useState(false);
  const [chatOpen,   setChatOpen]= useState(false);
  const [chatMsgs,   setChatMsgs]= useState([
    { role:"bot", text:"👋 Hi! I'm your TasteMania assistant. Ask me about any recipe or food fact!" }
  ]);
  const [chatInput,  setChatInput]= useState("");
  const [chatLoading,setCL]      = useState(false);
  const cuisinesRef  = useRef(null);
  const chatEndRef   = useRef(null);
  const searchTimer  = useRef(null);

  const scrollToCuisines = () => cuisinesRef.current?.scrollIntoView({ behavior:"smooth" });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [chatMsgs]);

  const fetchRecipes = async (c, d) => {
    setLoading(true); setRecipes([]); setError(""); setSearch(""); setSugg([]);
    try {
      const text = await callAI(
        "Return ONLY a valid JSON array. No markdown. Each item: {name, description, time, difficulty, tags:[str,str]}",
        `List exactly 6 popular ${d} ${c} recipes. JSON array only.`
      );
      setRecipes(extractJSON(text));
    } catch(e) {
      setError("⚠️ " + e.message);
      setRecipes([
        {name:`${c} Classic 1`,description:"A beloved staple full of authentic flavour.",time:"30 mins",difficulty:"Easy",  tags:[d,c]},
        {name:`${c} Classic 2`,description:"A hearty crowd-pleaser with bold spices.",   time:"45 mins",difficulty:"Medium",tags:[d,c]},
        {name:`${c} Classic 3`,description:"Light and refreshing for any occasion.",     time:"20 mins",difficulty:"Easy",  tags:[d,c]},
        {name:`${c} Classic 4`,description:"Rich, slow-cooked comfort food.",            time:"60 mins",difficulty:"Hard",  tags:[d,c]},
      ]);
    }
    setLoading(false);
  };

  const handleSearchInput = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setSugg([]); return; }
    setSL(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const text = await callAI(
          "Return ONLY a JSON array of strings. No markdown.",
          `List 6 ${cuisine} dish names matching keyword "${val}". JSON array only.`, 400
        );
        setSugg(extractJSON(text));
      } catch { setSugg([]); }
      setSL(false);
    }, 600);
  };

  const selectSuggestion = async (name) => {
    setSearch(name); setSugg([]);
    setLoading(true); setError("");
    try {
      const text = await callAI(
        "Return ONLY a valid JSON array with ONE item. No markdown. Format: [{name, description, time, difficulty, tags:[str,str]}]",
        `Recipe card for "${name}" (${cuisine}, ${diet}). JSON array, one item.`
      );
      setRecipes(extractJSON(text));
    } catch(e) { setError("⚠️ " + e.message); }
    setLoading(false);
  };

  const fetchDetail = async (r) => {
    setDL(true); setDetail(null);
    try {
      const text = await callAI(
        "Return ONLY valid JSON. No markdown. Format: {ingredients:[str], steps:[str], tip:str}",
        `Full recipe for "${r.name}" (${cuisine||"any"}, ${diet||"any"}). JSON only.`
      );
      setDetail(extractJSON(text));
    } catch(e) {
      setDetail({ ingredients:["Error: "+e.message], steps:["Please go back and try again."], tip:"" });
    }
    setDL(false);
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatInput("");
    setChatMsgs(p => [...p, { role:"user", text:msg }]);
    setCL(true);
    try {
      const text = await callAI(
        `You are TasteMania's food assistant. If user asks for a recipe, respond: {"type":"recipe","name":"<dish>","message":"<intro>"}. Otherwise: {"type":"fact","message":"<answer>"}. JSON only.`,
        msg, 600
      );
      const parsed = extractJSON(text);
      if (parsed.type === "recipe") {
        setChatMsgs(p => [...p, { role:"bot", text:parsed.message,
          action:{ label:`View ${parsed.name} Recipe →`, recipe:{ name:parsed.name, description:"", time:"", difficulty:"", tags:[] } }
        }]);
      } else {
        setChatMsgs(p => [...p, { role:"bot", text:parsed.message }]);
      }
    } catch {
      setChatMsgs(p => [...p, { role:"bot", text:"Sorry, I couldn't process that. Please try again!" }]);
    }
    setCL(false);
  };

  const openChatRecipe = (r) => { setRecipe(r); setStep("detail"); setCuisine(r.cuisine||null); setDiet("Veg"); fetchDetail(r); setChatOpen(false); };
  const goTo       = (c) => { setCuisine(c.name); setDiet("Veg"); setStep("diet"); fetchRecipes(c.name,"Veg"); };
  const changeDiet = (d) => { setDiet(d); fetchRecipes(cuisine,d); };
  const openRecipe = (r) => { setRecipe(r); setStep("detail"); fetchDetail(r); };
  const activeDiet = dietTabs.find(d=>d.key===diet);
  const cuisineObj  = cuisines.find(c=>c.name===cuisine);

  return (
    <div style={{ background:G.cream, minHeight:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .lift:hover{transform:translateY(-6px);box-shadow:0 20px 48px rgba(0,0,0,0.15)!important}
        .pop:hover{transform:scale(1.04);box-shadow:0 12px 32px rgba(0,0,0,0.18)!important}
        .sugg-item:hover{background:#f5f0e8}
        .chat-bubble{animation:popIn .2s ease}
        @keyframes popIn{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes pulse{0%,100%{box-shadow:0 6px 24px rgba(45,106,79,0.5),0 0 0 0 rgba(45,106,79,0.4)}70%{box-shadow:0 6px 24px rgba(45,106,79,0.5),0 0 0 12px rgba(45,106,79,0)}}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ background:"#fff", borderBottom:`3px solid ${G.green}`, padding:"0 2rem", display:"flex", alignItems:"center", height:72, position:"sticky", top:0, zIndex:200, boxShadow:"0 2px 16px rgba(0,0,0,0.07)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, cursor:"pointer" }} onClick={()=>{ setStep("home"); setCuisine(null); }}>
          {/* Icon badge */}
          <div style={{ background:`linear-gradient(135deg,${G.green},#1a4731)`, borderRadius:13, width:50, height:50, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 14px rgba(45,106,79,0.40)`, flexShrink:0 }}>
            <span style={{ fontSize:28 }}>🍽️</span>
          </div>
          {/* Brand name */}
          <div style={{ borderLeft:`3px solid ${G.warm}`, paddingLeft:14 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:0, lineHeight:1 }}>
              <span style={{ ...play, fontSize:34, fontWeight:900, color:G.green, letterSpacing:"-2px" }}>Taste</span>
              <span style={{ ...play, fontSize:34, fontWeight:900, color:G.red,   letterSpacing:"-2px" }}>Mania</span>
            </div>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:4.5, textTransform:"uppercase", color:G.warm, marginTop:2 }}>World Kitchen</div>
          </div>
        </div>
      </nav>

      {/* ══ HOME ══ */}
      {step==="home" && <>
        {/* HERO */}
        <div style={{ position:"relative", height:540, overflow:"hidden" }}>
          <img src={HERO} alt="hero" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.src=FALLBACK} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right,rgba(10,10,10,0.80) 42%,rgba(0,0,0,0.1))" }} />
          <div style={{ position:"absolute", top:"50%", left:"6%", transform:"translateY(-50%)", maxWidth:560, zIndex:2 }}>
            <div style={{ display:"inline-block", background:G.warm, color:"#fff", fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:"uppercase", padding:"6px 16px", borderRadius:4, marginBottom:20 }}>🌍 Global Recipes</div>
            <h1 style={{ ...play, color:"#fff", fontSize:52, fontWeight:900, lineHeight:1.12, marginBottom:18, textShadow:"0 2px 20px rgba(0,0,0,0.4)" }}>
              Which cuisine would you like to try today?
            </h1>
            <p style={{ color:"rgba(255,255,255,0.80)", fontSize:18, lineHeight:1.7, marginBottom:32 }}>Fresh, flavorful recipes from around the world.</p>
            <button onClick={scrollToCuisines} style={{ background:G.green, color:"#fff", padding:"15px 36px", border:"none", borderRadius:6, fontWeight:700, fontSize:16, cursor:"pointer", boxShadow:`0 4px 16px rgba(45,106,79,0.4)` }}>
              Browse Cuisines ↓
            </button>
          </div>
        </div>

        {/* FEATURE BAR */}
        <div style={{ background:G.green, padding:"16px 2rem", display:"flex", justifyContent:"center", gap:48, flexWrap:"wrap" }}>
          {[["🥗","Vegetarian","Veg & Vegan"],["🌍","8 Cuisines","Global flavors"],["⚡","AI Powered","Live recipes"],["⭐","Top Rated","Curated dishes"]].map(([ic,t,s])=>(
            <div key={t} style={{ display:"flex", alignItems:"center", gap:10, color:"#fff" }}>
              <span style={{ fontSize:22 }}>{ic}</span>
              <div><div style={{ fontWeight:700, fontSize:14 }}>{t}</div><div style={{ fontSize:12, opacity:.8 }}>{s}</div></div>
            </div>
          ))}
        </div>

        {/* CUISINE GRID */}
        <div ref={cuisinesRef} style={{ maxWidth:1060, margin:"0 auto", padding:"4rem 1.5rem" }}>
          <div style={{ textAlign:"center", marginBottom:42 }}>
            <p style={{ color:G.warm, fontWeight:700, fontSize:11, letterSpacing:2.5, textTransform:"uppercase", marginBottom:10 }}>Explore by Region</p>
            <h2 style={{ ...play, fontSize:42, fontWeight:900, color:G.dark, marginBottom:12 }}>Choose Your Cuisine</h2>
            <p style={{ color:G.muted, fontSize:16, maxWidth:460, margin:"0 auto" }}>Tap a cuisine to discover handpicked recipes.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:20 }}>
            {cuisines.map(c=>(
              <div key={c.name} className="pop" onClick={()=>goTo(c)}
                style={{ position:"relative", height:210, borderRadius:16, overflow:"hidden", cursor:"pointer", transition:"all 0.2s", boxShadow:"0 4px 18px rgba(0,0,0,0.10)" }}>
                <img src={c.img} alt={c.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.src=FALLBACK} />
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.82) 50%,rgba(0,0,0,0.08))" }} />
                <div style={{ position:"absolute", bottom:16, left:16 }}>
                  <div style={{ fontSize:30, marginBottom:4 }}>{c.emoji}</div>
                  <div style={{ ...play, color:"#fff", fontWeight:800, fontSize:22 }}>{c.name}</div>
                  <div style={{ color:"rgba(255,255,255,0.72)", fontSize:12, marginTop:3 }}>{c.tag}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TRENDING */}
        <div style={{ background:"#fff", borderTop:`1px solid ${G.border}`, padding:"3.5rem 1.5rem" }}>
          <div style={{ maxWidth:1060, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:34 }}>
              <p style={{ color:G.warm, fontWeight:700, fontSize:11, letterSpacing:2.5, textTransform:"uppercase", marginBottom:8 }}>What's Hot</p>
              <h3 style={{ ...play, fontSize:38, fontWeight:900, color:G.dark }}>Trending This Week 🔥</h3>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:24 }}>
              {TRENDING.map(t=>(
                <div key={t.name} className="lift" onClick={()=>goTo(cuisines.find(c=>c.name===t.cuisine)||cuisines[0])}
                  style={{ borderRadius:14, overflow:"hidden", background:"#fff", boxShadow:"0 3px 14px rgba(0,0,0,0.08)", cursor:"pointer", transition:"all 0.2s" }}>
                  <div style={{ position:"relative", height:200 }}>
                    <img src={t.img} alt={t.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.src=FALLBACK} />
                    <div style={{ position:"absolute", top:12, left:12, background:"#d62828", color:"#fff", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:4 }}>🔥 Trending</div>
                  </div>
                  <div style={{ padding:"16px 18px" }}>
                    <h4 style={{ ...play, fontSize:20, color:G.dark, margin:"0 0 5px", fontWeight:700 }}>{t.name}</h4>
                    <p style={{ fontSize:13, color:G.muted }}>🍴 {t.cuisine} · ⏱ {t.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer style={{ background:G.dark, color:"#aaa", textAlign:"center", padding:"2.5rem", fontSize:13 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:8 }}>
            <span style={{ fontSize:22 }}>🍽️</span>
            <span style={{ ...play, color:G.green, fontSize:24, fontWeight:900 }}>Taste</span>
            <span style={{ ...play, color:G.red,   fontSize:24, fontWeight:900 }}>Mania</span>
          </div>
          <p style={{ opacity:.5 }}>© 2025 TasteMania · Recipes from around the world · Powered by AI</p>
        </footer>
      </>}

      {/* ══ DIET + RECIPES ══ */}
      {step==="diet" && (
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"2.5rem 1.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28, fontSize:13, color:G.muted }}>
            <span style={{ cursor:"pointer", color:G.green, fontWeight:600 }} onClick={()=>{ setStep("home"); setCuisine(null); }}>Home</span>
            <span>›</span><span style={{ color:G.dark, fontWeight:600 }}>{cuisine} Recipes</span>
          </div>

          {cuisineObj && (
            <div style={{ borderRadius:14, marginBottom:32, overflow:"hidden", position:"relative", height:180 }}>
              <img src={cuisineObj.img} alt={cuisine} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.src=FALLBACK} />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right,rgba(0,0,0,0.68),rgba(0,0,0,0.1))", display:"flex", alignItems:"center", gap:24, padding:"0 2.5rem" }}>
                <span style={{ fontSize:72 }}>{cuisineObj.emoji}</span>
                <div>
                  <p style={{ color:"rgba(255,255,255,0.75)", fontSize:12, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Exploring</p>
                  <h2 style={{ ...play, color:"#fff", fontSize:36, fontWeight:800, marginBottom:4 }}>{cuisine} Cuisine</h2>
                  <p style={{ color:"rgba(255,255,255,0.80)", fontSize:15 }}>{cuisineObj.tag}</p>
                </div>
              </div>
            </div>
          )}

          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:24 }}>
            {dietTabs.map(d=>{
              const active=diet===d.key;
              return <button key={d.key} onClick={()=>changeDiet(d.key)}
                style={{ padding:"11px 24px", borderRadius:6, border:`2px solid ${d.color}`, background:active?d.color:"#fff", color:active?"#fff":d.color, fontWeight:700, fontSize:14, cursor:"pointer", transition:"all .15s", display:"flex", alignItems:"center", gap:7 }}>
                {d.icon} {d.label}
              </button>;
            })}
          </div>

          {/* SEARCH */}
          <div style={{ position:"relative", marginBottom:32 }}>
            <div style={{ display:"flex", alignItems:"center", background:"#fff", border:`2px solid ${G.border}`, borderRadius:10, padding:"12px 18px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", gap:12 }}>
              <span style={{ fontSize:20 }}>🔍</span>
              <input value={search} onChange={e=>handleSearchInput(e.target.value)}
                placeholder="Enter the food item you're craving for…"
                style={{ flex:1, border:"none", outline:"none", fontSize:15, color:G.dark, background:"transparent" }} />
              {suggLoading && <span style={{ fontSize:13, color:G.muted }}>Searching…</span>}
              {search && <span style={{ cursor:"pointer", color:G.muted, fontSize:18 }} onClick={()=>{ setSearch(""); setSugg([]); fetchRecipes(cuisine,diet); }}>✕</span>}
            </div>
            {suggestions.length > 0 && (
              <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:`1px solid ${G.border}`, borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", zIndex:100, marginTop:4, overflow:"hidden" }}>
                {suggestions.map((s,i)=>(
                  <div key={i} className="sugg-item" onClick={()=>selectSuggestion(s)}
                    style={{ padding:"12px 18px", cursor:"pointer", fontSize:15, color:G.dark, display:"flex", alignItems:"center", gap:10, borderBottom:i<suggestions.length-1?`1px solid ${G.border}`:"none", transition:"background .1s" }}>
                    <span style={{ fontSize:18 }}>{cuisineObj?.emoji}</span> {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div style={{ background:"#fff8e1", border:`1px solid ${G.warm}`, borderRadius:8, padding:"12px 16px", marginBottom:24, fontSize:13, color:"#7a5c00" }}>{error}</div>}

          {loading ? (
            <div style={{ textAlign:"center", padding:"5rem 0" }}>
              <div style={{ fontSize:64, marginBottom:16 }}>👨‍🍳</div>
              <p style={{ ...play, color:G.muted, fontSize:24 }}>Bringing you the best {diet} {cuisine} recipes…</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))", gap:24 }}>
              {recipes.map((r,i)=>(
                <div key={i} className="lift" onClick={()=>openRecipe(r)}
                  style={{ background:"#fff", borderRadius:14, overflow:"hidden", cursor:"pointer", transition:"all .2s", boxShadow:"0 3px 14px rgba(0,0,0,0.08)" }}>
                  {/* ✅ Fast: AI-provided specific keyword → Unsplash CDN */}
                  <div style={{ height:200, overflow:"hidden", position:"relative" }}>
                    <img
                      src={foodImg(r.imageKeyword, cuisineObj?.img || FALLBACK)}
                      alt={r.name}
                      style={{ width:"100%", height:"100%", objectFit:"cover" }}
                      onError={e=>{ e.target.onerror=null; e.target.src=cuisineObj?.img||FALLBACK; }}
                    />
                    <div style={{ position:"absolute", top:12, left:12, background:activeDiet.color, color:"#fff", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:4, textTransform:"uppercase" }}>
                      {activeDiet.icon} {diet}
                    </div>
                  </div>
                  <div style={{ padding:"1rem 1.2rem" }}>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:9 }}>
                      {(r.tags||[]).map((t,ti)=><span key={ti} style={{ background:G.cream, color:G.warm, fontSize:11, fontWeight:600, padding:"3px 8px", borderRadius:3 }}>{t}</span>)}
                    </div>
                    <h3 style={{ ...play, fontWeight:800, fontSize:20, color:G.dark, marginBottom:7, lineHeight:1.25 }}>{r.name}</h3>
                    <p style={{ fontSize:13, color:G.muted, marginBottom:14, lineHeight:1.55 }}>{r.description}</p>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <span style={{ background:"#f0faf4", color:G.green, borderRadius:4, padding:"4px 10px", fontSize:12, fontWeight:700 }}>⏱ {r.time}</span>
                      <span style={{ background:"#fef3f3", color:G.red, borderRadius:4, padding:"4px 10px", fontSize:12, fontWeight:700 }}>📊 {r.difficulty}</span>
                      <span style={{ marginLeft:"auto", color:G.green, fontWeight:700, fontSize:13 }}>View Recipe →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ RECIPE DETAIL ══ */}
      {step==="detail" && recipe && (
        <div style={{ maxWidth:820, margin:"0 auto", padding:"2.5rem 1.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28, fontSize:13, color:G.muted }}>
            <span style={{ cursor:"pointer", color:G.green, fontWeight:600 }} onClick={()=>{ setStep("home"); setCuisine(null); }}>Home</span>
            {cuisine && <><span>›</span><span style={{ cursor:"pointer", color:G.green, fontWeight:600 }} onClick={()=>setStep("diet")}>{cuisine}</span></>}
            <span>›</span><span style={{ color:G.dark }}>{recipe.name}</span>
          </div>
          <div style={{ background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.09)" }}>
            {/* ✅ Fast: AI-provided specific keyword → Unsplash CDN */}
            <div style={{ position:"relative", height:320, overflow:"hidden" }}>
              <img
                src={foodImg(recipe.imageKeyword, cuisineObj?.img || FALLBACK)}
                alt={recipe.name}
                style={{ width:"100%", height:"100%", objectFit:"cover" }}
                onError={e=>{ e.target.onerror=null; e.target.src=cuisineObj?.img||FALLBACK; }}
              />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.60),transparent)" }} />
              <h1 style={{ ...play, position:"absolute", bottom:24, left:28, color:"#fff", fontSize:36, fontWeight:900, textShadow:"0 2px 12px rgba(0,0,0,0.5)" }}>{recipe.name}</h1>
            </div>
            <div style={{ padding:"2rem 2.5rem" }}>
              <div style={{ display:"flex", gap:8, marginBottom:18 }}>
                {cuisine && <span style={{ background:G.cream, color:G.warm, fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:4 }}>{cuisine}</span>}
                <span style={{ background:"#f0faf4", color:G.green, fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:4 }}>{diet}</span>
              </div>
              <p style={{ color:G.muted, fontSize:16, marginBottom:22, lineHeight:1.65 }}>{recipe.description}</p>
              <div style={{ display:"flex", gap:16, padding:"16px 0", borderTop:`1px solid ${G.border}`, borderBottom:`1px solid ${G.border}`, marginBottom:32 }}>
                {[["⏱","Cook Time",recipe.time||"—"],["📊","Difficulty",recipe.difficulty||"—"],["🍽️","Cuisine",cuisine||"Any"]].map(([ic,label,val])=>(
                  <div key={label} style={{ flex:1, textAlign:"center" }}>
                    <div style={{ fontSize:22 }}>{ic}</div>
                    <div style={{ fontSize:11, color:G.muted, textTransform:"uppercase", fontWeight:700, letterSpacing:1, marginTop:5 }}>{label}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:G.dark, marginTop:3 }}>{val}</div>
                  </div>
                ))}
              </div>
              {detLoading ? (
                <div style={{ textAlign:"center", padding:"3rem 0" }}>
                  <div style={{ fontSize:56 }}>🍳</div>
                  <p style={{ ...play, color:G.muted, fontSize:22, marginTop:14 }}>Loading recipe…</p>
                </div>
              ) : detail && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:40 }}>
                  <div>
                    <h3 style={{ ...play, fontSize:22, color:G.red, marginBottom:16 }}>Ingredients</h3>
                    <ul style={{ listStyle:"none" }}>
                      {detail.ingredients?.map((ing,i)=>(
                        <li key={i} style={{ padding:"8px 0", borderBottom:`1px solid ${G.border}`, fontSize:14, color:G.dark, display:"flex", gap:8 }}>
                          <span style={{ color:G.green, fontWeight:700 }}>✓</span>{ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 style={{ ...play, fontSize:22, color:G.green, marginBottom:16 }}>Instructions</h3>
                    <ol style={{ listStyle:"none" }}>
                      {detail.steps?.map((s,i)=>(
                        <li key={i} style={{ display:"flex", gap:14, marginBottom:20 }}>
                          <span style={{ background:G.green, color:"#fff", borderRadius:"50%", width:28, height:28, minWidth:28, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}>{i+1}</span>
                          <p style={{ fontSize:15, color:G.dark, lineHeight:1.65 }}>{s}</p>
                        </li>
                      ))}
                    </ol>
                    {detail.tip && (
                      <div style={{ background:"#fffbeb", border:`1.5px solid ${G.warm}`, borderRadius:10, padding:"14px 18px", marginTop:20 }}>
                        <p style={{ fontWeight:700, color:G.warm, marginBottom:6, fontSize:14 }}>💡 Chef's Tip</p>
                        <p style={{ fontSize:14, color:"#7a5c00", lineHeight:1.6 }}>{detail.tip}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ CHATBOT ══ */}
      <button onClick={()=>setChatOpen(o=>!o)}
        style={{ position:"fixed", bottom:28, right:28, width:64, height:64, borderRadius:"50%", background:`linear-gradient(135deg,${G.green},#1a4731)`, color:"#fff", fontSize:28, border:"3px solid #fff", cursor:"pointer", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", transition:"transform .2s", animation:chatOpen?"none":"pulse 2s infinite" }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.12)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
        {chatOpen?"✕":"💬"}
      </button>

      {chatOpen && (
        <div style={{ position:"fixed", bottom:104, right:28, width:340, maxHeight:480, background:"#fff", borderRadius:16, boxShadow:"0 12px 48px rgba(0,0,0,0.18)", zIndex:299, display:"flex", flexDirection:"column", overflow:"hidden", border:`1px solid ${G.border}` }}>
          <div style={{ background:G.green, padding:"14px 18px", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:22 }}>🍽️</span>
            <div>
              <div style={{ ...play, color:"#fff", fontWeight:800, fontSize:16 }}>TasteMania Assistant</div>
              <div style={{ color:"rgba(255,255,255,0.75)", fontSize:12 }}>Ask me anything about food!</div>
            </div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 8px", display:"flex", flexDirection:"column", gap:10 }}>
            {chatMsgs.map((m,i)=>(
              <div key={i} className="chat-bubble" style={{ display:"flex", flexDirection:"column", alignItems:m.role==="user"?"flex-end":"flex-start" }}>
                <div style={{ maxWidth:"82%", background:m.role==="user"?G.green:"#f4f4f4", color:m.role==="user"?"#fff":G.dark, padding:"10px 14px", borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", fontSize:14, lineHeight:1.55 }}>
                  {m.text}
                </div>
                {m.action && (
                  <button onClick={()=>openChatRecipe(m.action.recipe)}
                    style={{ marginTop:6, background:G.warm, color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    {m.action.label}
                  </button>
                )}
              </div>
            ))}
            {chatLoading && <div style={{ background:"#f4f4f4", padding:"10px 14px", borderRadius:"14px 14px 14px 4px", fontSize:14, color:G.muted, alignSelf:"flex-start" }}>Thinking… 🤔</div>}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding:"10px 12px", borderTop:`1px solid ${G.border}`, display:"flex", gap:8 }}>
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()}
              placeholder="Ask about a recipe or food fact…"
              style={{ flex:1, border:`1.5px solid ${G.border}`, borderRadius:8, padding:"9px 12px", fontSize:14, outline:"none", color:G.dark }} />
            <button onClick={sendChat} disabled={chatLoading}
              style={{ background:G.green, color:"#fff", border:"none", borderRadius:8, padding:"9px 14px", fontWeight:700, cursor:"pointer", fontSize:14 }}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}