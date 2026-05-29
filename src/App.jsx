import { useState, useRef, useEffect, useCallback } from "react";

const cuisines = [
  { name:"Indian",        emoji:"🍛", tag:"Spicy & Aromatic",  img:"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80" },
  { name:"Italian",       emoji:"🍝", tag:"Rich & Comforting",  img:"https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600&q=80" },
  { name:"Chinese",       emoji:"🥡", tag:"Bold & Savory",      img:"https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80" },
  { name:"Mexican",       emoji:"🌮", tag:"Vibrant & Zesty",    img:"https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80" },
  { name:"Mediterranean", emoji:"🫙", tag:"Fresh & Light",      img:"https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80" },
  { name:"Japanese",      emoji:"🍱", tag:"Delicate & Umami",   img:"https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&q=80" },
  { name:"Thai",          emoji:"🍜", tag:"Sweet & Spicy",      img:"https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=600&q=80" },
  { name:"American",      emoji:"🍔", tag:"Hearty & Bold",      img:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80" },
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

const G = {
  cream:"#fafaf8", dark:"#0a0a0a", green:"#1a5c3a", red:"#c0392b",
  warm:"#b07d3a", muted:"#6e6e73", border:"#e5e5e5", card:"#ffffff",
  accent:"#1a5c3a"
};

const host = typeof window !== "undefined" ? window.location.hostname : "";
const isLive = !host.includes("localhost") && !host.includes("claude") && !host.includes("anthropic");
const API_URL = isLive ? "/api/claude" : "https://api.anthropic.com/v1/messages";

const callAI = async (system, userMsg, max_tokens = 1500) => {
  const res = await fetch(API_URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ max_tokens, system, messages: [{ role: "user", content: userMsg }] })
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.content?.[0]?.text || "";
};

const extractJSON = (text) => {
  try { return JSON.parse(text.trim()); } catch {}
  const c = text.replace(/```json\s?/gi, "").replace(/```\s?/gi, "").trim();
  try { return JSON.parse(c); } catch {}
  const arr = text.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]); } catch {} }
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch {} }
  throw new Error("Could not parse JSON");
};

// Fetch single dish image from Pexels (via backend on live, TheMealDB in preview)
const fetchDishImage = async (dishName, fallback) => {
  try {
    if (isLive) {
      const res = await fetch("/api/pexels", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishes: [dishName] })
      });
      const map = await res.json();
      return map[dishName] || fallback;
    } else {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(dishName)}`);
      const data = await res.json();
      return data?.meals?.[0]?.strMealThumb || fallback;
    }
  } catch { return fallback; }
};

// Fetch all images in parallel
const fetchAllImages = async (recipeList, fallback, setRecipeImages) => {
  try {
    if (isLive) {
      const res = await fetch("/api/pexels", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishes: recipeList.map(r => r.name) })
      });
      const imageMap = await res.json();
      const finalMap = {};
      recipeList.forEach(r => { finalMap[r.name] = imageMap[r.name] || fallback; });
      setRecipeImages(finalMap);
    } else {
      const results = await Promise.all(
        recipeList.map(r =>
          fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(r.name)}`)
            .then(res => res.json())
            .then(data => ({ name: r.name, url: data?.meals?.[0]?.strMealThumb || fallback }))
            .catch(() => ({ name: r.name, url: fallback }))
        )
      );
      const imgMap = {};
      results.forEach(r => { imgMap[r.name] = r.url; });
      setRecipeImages(imgMap);
    }
  } catch {
    const imgMap = {};
    recipeList.forEach(r => { imgMap[r.name] = fallback; });
    setRecipeImages(imgMap);
  }
};

export default function TasteMania() {
  const [step,        setStep]       = useState("home");
  const [cuisine,     setCuisine]    = useState(null);
  const [diet,        setDiet]       = useState("Veg");
  const [recipes,     setRecipes]    = useState([]);
  const [loading,     setLoading]    = useState(false);
  const [recipe,      setRecipe]     = useState(null);
  const [detail,      setDetail]     = useState(null);
  const [detLoading,  setDL]         = useState(false);
  const [error,       setError]      = useState("");
  const [recipeImages,setRecipeImages] = useState({});
  const [detailImage, setDetailImage] = useState(null);
  const [search,      setSearch]     = useState("");
  const [suggestions, setSugg]       = useState([]);
  const [suggLoading, setSL]         = useState(false);
  const [chatOpen,    setChatOpen]   = useState(false);
  const [chatMsgs,    setChatMsgs]   = useState([
    { role:"bot", text:"👋 Hi! I'm your TasteMania food assistant. Ask me about any recipe or food fact!" }
  ]);
  const [chatInput,   setChatInput]  = useState("");
  const [chatLoading, setCL]         = useState(false);

  const cuisinesRef = useRef(null);
  const chatEndRef  = useRef(null);
  const searchTimer = useRef(null);

  const scrollToCuisines = () => cuisinesRef.current?.scrollIntoView({ behavior:"smooth" });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chatMsgs]);

  const cuisineObj  = cuisines.find(c => c.name === cuisine);
  const activeDiet  = dietTabs.find(d => d.key === diet);

  // ── Fetch full recipe card details for any dish (used by search + chatbot) ──
  const fetchFullRecipeCard = async (dishName, cuisineName) => {
    const text = await callAI(
      "Return ONLY a valid JSON object. No markdown. Fields: {name, description, time, difficulty, cuisine, tags:[str,str]}",
      `Give recipe card details for "${dishName}" ${cuisineName ? `(${cuisineName} cuisine)` : ""}. JSON only.`
    );
    return extractJSON(text);
  };

  const fetchRecipes = async (c, d) => {
    setLoading(true); setRecipes([]); setError(""); setSearch(""); setSugg([]); setRecipeImages({});
    try {
      const text = await callAI(
        "Return ONLY a valid JSON array. No markdown. Each item: {name, description, time, difficulty, tags:[str,str]}",
        `List exactly 6 popular ${d} ${c} recipes. JSON array only.`
      );
      const parsed = extractJSON(text);
      setRecipes(parsed);
      fetchAllImages(parsed, cuisines.find(cu => cu.name === c)?.img || FALLBACK, setRecipeImages);
    } catch (e) {
      setError("⚠️ " + e.message);
      setRecipes([
        { name:`${c} Classic 1`, description:"A beloved staple.", time:"30 mins", difficulty:"Easy",   tags:[d,c] },
        { name:`${c} Classic 2`, description:"A hearty classic.", time:"45 mins", difficulty:"Medium", tags:[d,c] },
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

  // ── Open recipe detail — works from cards, search, AND chatbot ──
  const openRecipeDetail = useCallback(async (r, cuisineName) => {
    setStep("detail");
    setDetail(null);
    setDetailImage(null);

    // If recipe came from chatbot/search it may be missing fields — fetch full card
    let fullRecipe = r;
    if (!r.time || !r.difficulty || !r.description) {
      try {
        const card = await fetchFullRecipeCard(r.name, cuisineName || cuisine);
        fullRecipe = { ...r, ...card };
      } catch {}
    }
    setRecipe(fullRecipe);
    if (cuisineName) setCuisine(cuisineName);

    // Fetch image specifically for this dish
    const fallback = cuisines.find(c => c.name === (cuisineName || cuisine))?.img || FALLBACK;
    fetchDishImage(fullRecipe.name, fallback).then(url => setDetailImage(url));

    // Fetch ingredients + steps
    setDL(true);
    try {
      const text = await callAI(
        "Return ONLY valid JSON. No markdown. Format: {ingredients:[str], steps:[str], tip:str}",
        `Full recipe for "${fullRecipe.name}" (${cuisineName || cuisine || "any"}, ${diet || "any"}). JSON only.`
      );
      setDetail(extractJSON(text));
    } catch (e) {
      setDetail({ ingredients:["Error: "+e.message], steps:["Please go back and try again."], tip:"" });
    }
    setDL(false);
  }, [cuisine, diet]);

  const selectSuggestion = async (name) => {
    setSearch(name); setSugg([]);
    setLoading(true); setError("");
    try {
      const text = await callAI(
        "Return ONLY a valid JSON array with ONE item. Fields: {name, description, time, difficulty, tags:[str,str]}",
        `Recipe card for "${name}" (${cuisine}, ${diet}). JSON array, one item.`
      );
      const parsed = extractJSON(text);
      setRecipes(parsed);
      fetchAllImages(parsed, cuisineObj?.img || FALLBACK, setRecipeImages);
    } catch (e) { setError("⚠️ " + e.message); }
    setLoading(false);
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatInput("");
    setChatMsgs(p => [...p, { role:"user", text:msg }]);
    setCL(true);
    try {
      const text = await callAI(
        `You are TasteMania's food assistant. If user asks for a recipe, respond: {"type":"recipe","name":"<dish>","cuisine":"<cuisine or empty>","message":"<short intro>"}. Otherwise: {"type":"fact","message":"<answer>"}. JSON only.`,
        msg, 600
      );
      const parsed = extractJSON(text);
      if (parsed.type === "recipe") {
        setChatMsgs(p => [...p, {
          role:"bot", text: parsed.message,
          action: { label:`View ${parsed.name} Recipe →`, name: parsed.name, cuisine: parsed.cuisine || null }
        }]);
      } else {
        setChatMsgs(p => [...p, { role:"bot", text: parsed.message }]);
      }
    } catch {
      setChatMsgs(p => [...p, { role:"bot", text:"Sorry, couldn't process that. Please try again!" }]);
    }
    setCL(false);
  };

  const goTo = (c) => { setCuisine(c.name); setDiet("Veg"); setStep("diet"); fetchRecipes(c.name, "Veg"); };
  const changeDiet = (d) => { setDiet(d); fetchRecipes(cuisine, d); };

  return (
    <div style={{ background:G.cream, minHeight:"100vh", fontFamily:"-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif", color:G.dark }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Inter:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .play{font-family:'Playfair Display',Georgia,serif!important}
        .inter{font-family:'Inter',system-ui,sans-serif!important}
        .card-hover{transition:transform 0.3s cubic-bezier(.25,.46,.45,.94),box-shadow 0.3s cubic-bezier(.25,.46,.45,.94)}
        .card-hover:hover{transform:translateY(-8px);box-shadow:0 24px 56px rgba(0,0,0,0.13)!important}
        .cuisine-hover{transition:transform 0.3s cubic-bezier(.25,.46,.45,.94),box-shadow 0.3s cubic-bezier(.25,.46,.45,.94)}
        .cuisine-hover:hover{transform:scale(1.03);box-shadow:0 16px 40px rgba(0,0,0,0.18)!important}
        .btn-primary{transition:all 0.25s ease;letter-spacing:0.02em}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(26,92,58,0.35)!important}
        .sugg-item:hover{background:#f5f5f0}
        .chat-bubble{animation:fadeUp .2s ease}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{box-shadow:0 8px 32px rgba(26,92,58,0.5),0 0 0 0 rgba(26,92,58,0.35)}70%{box-shadow:0 8px 32px rgba(26,92,58,0.5),0 0 0 12px rgba(26,92,58,0)}}
        ::selection{background:#1a5c3a22}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#d0d0d0;border-radius:4px}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ background:"rgba(250,250,248,0.92)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderBottom:"1px solid rgba(0,0,0,0.06)", padding:"0 2.5rem", display:"flex", alignItems:"center", height:72, position:"sticky", top:0, zIndex:200 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, cursor:"pointer" }} onClick={()=>{ setStep("home"); setCuisine(null); }}>
          <div style={{ background:`linear-gradient(145deg,${G.green},#0d3d27)`, borderRadius:14, width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 16px rgba(26,92,58,0.30)` }}>
            <span style={{ fontSize:24 }}>🍽️</span>
          </div>
          <div style={{ borderLeft:`2.5px solid ${G.warm}`, paddingLeft:14 }}>
            <div style={{ display:"flex", alignItems:"baseline" }}>
              <span className="play" style={{ fontSize:28, fontWeight:900, color:G.green, letterSpacing:"-1.5px", lineHeight:1 }}>Taste</span>
              <span className="play" style={{ fontSize:28, fontWeight:900, color:G.red,   letterSpacing:"-1.5px", lineHeight:1 }}>Mania</span>
            </div>
            <div className="inter" style={{ fontSize:8, fontWeight:600, letterSpacing:5, textTransform:"uppercase", color:G.warm, marginTop:2 }}>World Kitchen</div>
          </div>
        </div>
      </nav>

      {/* ══ HOME ══ */}
      {step==="home" && <>
        {/* HERO */}
        <div style={{ position:"relative", height:580, overflow:"hidden" }}>
          <img src={HERO} alt="hero" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 40%" }} onError={e=>e.target.src=FALLBACK} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(105deg,rgba(8,8,8,0.82) 38%,rgba(0,0,0,0.08))" }} />
          <div style={{ position:"absolute", top:"50%", left:"7%", transform:"translateY(-50%)", maxWidth:580, zIndex:2 }}>
            <div className="inter" style={{ display:"inline-block", background:G.warm, color:"#fff", fontSize:10, fontWeight:700, letterSpacing:3, textTransform:"uppercase", padding:"6px 16px", borderRadius:100, marginBottom:24 }}>🌍 Global Recipes</div>
            <h1 className="play" style={{ color:"#fff", fontSize:56, fontWeight:900, lineHeight:1.08, marginBottom:20, letterSpacing:"-1.5px" }}>
              Which cuisine would you like to try today?
            </h1>
            <p className="inter" style={{ color:"rgba(255,255,255,0.72)", fontSize:17, lineHeight:1.75, marginBottom:36, fontWeight:300, letterSpacing:"0.01em" }}>
              Fresh, flavorful recipes from around the world —<br/>crafted for real, everyday life.
            </p>
            <button className="btn-primary" onClick={scrollToCuisines}
              style={{ background:G.green, color:"#fff", padding:"16px 40px", border:"none", borderRadius:100, fontWeight:600, fontSize:15, cursor:"pointer", letterSpacing:"0.04em" }}>
              Browse Cuisines ↓
            </button>
          </div>
        </div>

        {/* FEATURE BAR */}
        <div style={{ background:G.green, padding:"18px 2rem", display:"flex", justifyContent:"center", gap:52, flexWrap:"wrap" }}>
          {[["🥗","Vegetarian","Veg & Vegan options"],["🌍","8 Cuisines","Global flavors"],["⚡","AI Powered","Live recipe fetch"],["⭐","Top Rated","Curated dishes"]].map(([ic,t,s])=>(
            <div key={t} style={{ display:"flex", alignItems:"center", gap:12, color:"#fff" }}>
              <span style={{ fontSize:20 }}>{ic}</span>
              <div>
                <div className="inter" style={{ fontWeight:600, fontSize:13, letterSpacing:"0.01em" }}>{t}</div>
                <div className="inter" style={{ fontSize:11, opacity:.7, marginTop:1 }}>{s}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CUISINE GRID */}
        <div ref={cuisinesRef} style={{ maxWidth:1080, margin:"0 auto", padding:"5rem 1.5rem" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <p className="inter" style={{ color:G.warm, fontWeight:600, fontSize:11, letterSpacing:3, textTransform:"uppercase", marginBottom:12 }}>Explore by Region</p>
            <h2 className="play" style={{ fontSize:44, fontWeight:900, color:G.dark, marginBottom:14, letterSpacing:"-1px" }}>Choose Your Cuisine</h2>
            <p className="inter" style={{ color:G.muted, fontSize:16, maxWidth:440, margin:"0 auto", lineHeight:1.7, fontWeight:300 }}>Tap a cuisine to discover handpicked recipes you'll love.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:20 }}>
            {cuisines.map(c=>(
              <div key={c.name} className="cuisine-hover" onClick={()=>goTo(c)}
                style={{ position:"relative", height:220, borderRadius:20, overflow:"hidden", cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,0.08)" }}>
                <img src={c.img} alt={c.name} style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.6s ease" }} onError={e=>e.target.src=FALLBACK} />
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.85) 45%,rgba(0,0,0,0.05))" }} />
                <div style={{ position:"absolute", bottom:18, left:18 }}>
                  <div style={{ fontSize:28, marginBottom:5 }}>{c.emoji}</div>
                  <div className="play" style={{ color:"#fff", fontWeight:800, fontSize:22, letterSpacing:"-0.5px" }}>{c.name}</div>
                  <div className="inter" style={{ color:"rgba(255,255,255,0.65)", fontSize:11, marginTop:3, letterSpacing:"0.03em" }}>{c.tag}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TRENDING */}
        <div style={{ background:"#fff", borderTop:"1px solid #efefef", padding:"4.5rem 1.5rem" }}>
          <div style={{ maxWidth:1080, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:40 }}>
              <p className="inter" style={{ color:G.warm, fontWeight:600, fontSize:11, letterSpacing:3, textTransform:"uppercase", marginBottom:12 }}>What's Hot</p>
              <h3 className="play" style={{ fontSize:40, fontWeight:900, color:G.dark, letterSpacing:"-0.8px" }}>Trending This Week 🔥</h3>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))", gap:24 }}>
              {TRENDING.map(t=>(
                <div key={t.name} className="card-hover" onClick={()=>goTo(cuisines.find(c=>c.name===t.cuisine)||cuisines[0])}
                  style={{ borderRadius:20, overflow:"hidden", background:"#fff", boxShadow:"0 4px 20px rgba(0,0,0,0.07)", cursor:"pointer" }}>
                  <div style={{ position:"relative", height:210 }}>
                    <img src={t.img} alt={t.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.src=FALLBACK} />
                    <div style={{ position:"absolute", top:14, left:14, background:"#c0392b", color:"#fff", fontSize:10, fontWeight:700, padding:"5px 12px", borderRadius:100, letterSpacing:"0.05em", textTransform:"uppercase" }}>🔥 Trending</div>
                  </div>
                  <div style={{ padding:"18px 20px" }}>
                    <h4 className="play" style={{ fontSize:21, color:G.dark, marginBottom:6, fontWeight:700, letterSpacing:"-0.3px" }}>{t.name}</h4>
                    <p className="inter" style={{ fontSize:12, color:G.muted, letterSpacing:"0.02em" }}>🍴 {t.cuisine} · ⏱ {t.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer style={{ background:"#0a0a0a", color:"#888", textAlign:"center", padding:"3rem 2rem", fontSize:13 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:10 }}>
            <span className="play" style={{ color:G.green, fontSize:22, fontWeight:900 }}>Taste</span>
            <span className="play" style={{ color:G.red,   fontSize:22, fontWeight:900 }}>Mania</span>
          </div>
          <p className="inter" style={{ opacity:.4, fontSize:12, letterSpacing:"0.03em" }}>© 2025 TasteMania · Recipes from around the world · Powered by AI</p>
        </footer>
      </>}

      {/* ══ DIET + RECIPES ══ */}
      {step==="diet" && (
        <div style={{ maxWidth:1080, margin:"0 auto", padding:"2.5rem 1.5rem" }}>
          {/* Breadcrumb */}
          <div className="inter" style={{ display:"flex", alignItems:"center", gap:8, marginBottom:32, fontSize:13, color:G.muted }}>
            <span style={{ cursor:"pointer", color:G.green, fontWeight:500 }} onClick={()=>{ setStep("home"); setCuisine(null); }}>Home</span>
            <span style={{ opacity:.4 }}>›</span>
            <span style={{ color:G.dark, fontWeight:500 }}>{cuisine} Recipes</span>
          </div>

          {/* Cuisine Banner */}
          {cuisineObj && (
            <div style={{ borderRadius:20, marginBottom:36, overflow:"hidden", position:"relative", height:190 }}>
              <img src={cuisineObj.img} alt={cuisine} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.src=FALLBACK} />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right,rgba(0,0,0,0.72),rgba(0,0,0,0.05))", display:"flex", alignItems:"center", gap:24, padding:"0 2.5rem" }}>
                <span style={{ fontSize:64 }}>{cuisineObj.emoji}</span>
                <div>
                  <p className="inter" style={{ color:"rgba(255,255,255,0.6)", fontSize:10, fontWeight:600, letterSpacing:3, textTransform:"uppercase", marginBottom:6 }}>Exploring</p>
                  <h2 className="play" style={{ color:"#fff", fontSize:34, fontWeight:900, marginBottom:4, letterSpacing:"-0.5px" }}>{cuisine} Cuisine</h2>
                  <p className="inter" style={{ color:"rgba(255,255,255,0.72)", fontSize:14, fontWeight:300 }}>{cuisineObj.tag}</p>
                </div>
              </div>
            </div>
          )}

          {/* Diet Tabs */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:28 }}>
            {dietTabs.map(d=>{
              const active = diet === d.key;
              return <button key={d.key} onClick={()=>changeDiet(d.key)}
                className="inter"
                style={{ padding:"11px 26px", borderRadius:100, border:`1.5px solid ${active?d.color:"#ddd"}`, background:active?d.color:"#fff", color:active?"#fff":d.color, fontWeight:600, fontSize:13, cursor:"pointer", transition:"all .2s", display:"flex", alignItems:"center", gap:7, letterSpacing:"0.02em" }}>
                {d.icon} {d.label}
              </button>;
            })}
          </div>

          {/* Search Bar */}
          <div style={{ position:"relative", marginBottom:36 }}>
            <div style={{ display:"flex", alignItems:"center", background:"#fff", border:"1.5px solid #e8e8e8", borderRadius:14, padding:"14px 20px", boxShadow:"0 2px 16px rgba(0,0,0,0.05)", gap:12 }}>
              <span style={{ fontSize:18, opacity:.5 }}>🔍</span>
              <input value={search} onChange={e=>handleSearchInput(e.target.value)}
                placeholder="Enter the food item you're craving for…"
                className="inter"
                style={{ flex:1, border:"none", outline:"none", fontSize:15, color:G.dark, background:"transparent", fontWeight:400 }} />
              {suggLoading && <span className="inter" style={{ fontSize:12, color:G.muted }}>Searching…</span>}
              {search && <span style={{ cursor:"pointer", color:G.muted, fontSize:16, opacity:.5 }} onClick={()=>{ setSearch(""); setSugg([]); fetchRecipes(cuisine,diet); }}>✕</span>}
            </div>
            {suggestions.length > 0 && (
              <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #efefef", borderRadius:14, boxShadow:"0 12px 32px rgba(0,0,0,0.10)", zIndex:100, marginTop:6, overflow:"hidden" }}>
                {suggestions.map((s,i)=>(
                  <div key={i} className="sugg-item inter" onClick={()=>selectSuggestion(s)}
                    style={{ padding:"13px 20px", cursor:"pointer", fontSize:14, color:G.dark, display:"flex", alignItems:"center", gap:10, borderBottom:i<suggestions.length-1?"1px solid #f5f5f5":"none", transition:"background .15s", fontWeight:400 }}>
                    <span style={{ fontSize:16 }}>{cuisineObj?.emoji}</span> {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="inter" style={{ background:"#fffbf0", border:"1px solid #e8d5a0", borderRadius:10, padding:"12px 18px", marginBottom:24, fontSize:13, color:"#7a5c00" }}>{error}</div>}

          {loading ? (
            <div style={{ textAlign:"center", padding:"6rem 0" }}>
              <div style={{ fontSize:60, marginBottom:20 }}>👨‍🍳</div>
              <p className="play" style={{ color:G.muted, fontSize:26, marginBottom:8, fontWeight:700 }}>Bringing you the best {diet} {cuisine} recipes…</p>
              <p className="inter" style={{ color:"#bbb", fontSize:13, letterSpacing:"0.03em" }}>Crafting your perfect menu</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:28 }}>
              {recipes.map((r,i)=>(
                <div key={i} className="card-hover" onClick={()=>openRecipeDetail(r, cuisine)}
                  style={{ background:G.card, borderRadius:20, overflow:"hidden", cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,0.07)" }}>
                  <div style={{ position:"relative", height:210, overflow:"hidden", background:"#f0ede8" }}>
                    <img
                      src={recipeImages[r.name] || cuisineObj?.img || FALLBACK}
                      alt={r.name}
                      style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.5s ease" }}
                      onError={e=>{ e.target.onerror=null; e.target.src=cuisineObj?.img||FALLBACK; }}
                    />
                    <div style={{ position:"absolute", top:14, left:14, background:activeDiet?.color, color:"#fff", fontSize:10, fontWeight:700, padding:"5px 12px", borderRadius:100, letterSpacing:"0.05em", textTransform:"uppercase" }}>
                      {activeDiet?.icon} {diet}
                    </div>
                  </div>
                  <div style={{ padding:"1.2rem 1.4rem" }}>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                      {(r.tags||[]).map((t,ti)=>(
                        <span key={ti} className="inter" style={{ background:"#f5f5f0", color:G.warm, fontSize:10, fontWeight:600, padding:"3px 10px", borderRadius:100, letterSpacing:"0.03em" }}>{t}</span>
                      ))}
                    </div>
                    <h3 className="play" style={{ fontWeight:800, fontSize:20, color:G.dark, marginBottom:8, lineHeight:1.25, letterSpacing:"-0.3px" }}>{r.name}</h3>
                    <p className="inter" style={{ fontSize:13, color:G.muted, marginBottom:16, lineHeight:1.65, fontWeight:300 }}>{r.description}</p>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span className="inter" style={{ background:"#f0faf4", color:G.green, borderRadius:100, padding:"5px 12px", fontSize:11, fontWeight:600 }}>⏱ {r.time}</span>
                      <span className="inter" style={{ background:"#fdf0f0", color:G.red, borderRadius:100, padding:"5px 12px", fontSize:11, fontWeight:600 }}>📊 {r.difficulty}</span>
                      <span className="inter" style={{ marginLeft:"auto", color:G.green, fontWeight:600, fontSize:13 }}>View →</span>
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
        <div style={{ maxWidth:840, margin:"0 auto", padding:"2.5rem 1.5rem" }}>
          <div className="inter" style={{ display:"flex", alignItems:"center", gap:8, marginBottom:32, fontSize:13, color:G.muted }}>
            <span style={{ cursor:"pointer", color:G.green, fontWeight:500 }} onClick={()=>{ setStep("home"); setCuisine(null); }}>Home</span>
            {cuisine && <><span style={{ opacity:.4 }}>›</span><span style={{ cursor:"pointer", color:G.green, fontWeight:500 }} onClick={()=>setStep("diet")}>{cuisine}</span></>}
            <span style={{ opacity:.4 }}>›</span><span style={{ color:G.dark }}>{recipe.name}</span>
          </div>

          <div style={{ background:G.card, borderRadius:24, overflow:"hidden", boxShadow:"0 8px 40px rgba(0,0,0,0.10)" }}>
            {/* Hero image — Pexels/TheMealDB specific to THIS dish */}
            <div style={{ position:"relative", height:340, overflow:"hidden", background:"#f0ede8" }}>
              <img
                src={detailImage || recipeImages[recipe.name] || cuisineObj?.img || FALLBACK}
                alt={recipe.name}
                style={{ width:"100%", height:"100%", objectFit:"cover", transition:"opacity 0.4s" }}
                onError={e=>{ e.target.onerror=null; e.target.src=cuisineObj?.img||FALLBACK; }}
              />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.65),rgba(0,0,0,0.05))" }} />
              <h1 className="play" style={{ position:"absolute", bottom:28, left:32, color:"#fff", fontSize:38, fontWeight:900, textShadow:"0 2px 16px rgba(0,0,0,0.4)", letterSpacing:"-0.8px", maxWidth:"80%" }}>{recipe.name}</h1>
            </div>

            <div style={{ padding:"2.2rem 2.8rem" }}>
              <div style={{ display:"flex", gap:8, marginBottom:18 }}>
                {(recipe.cuisine||cuisine) && <span className="inter" style={{ background:"#f5f5f0", color:G.warm, fontSize:11, fontWeight:600, padding:"5px 14px", borderRadius:100 }}>{recipe.cuisine||cuisine}</span>}
                <span className="inter" style={{ background:"#f0faf4", color:G.green, fontSize:11, fontWeight:600, padding:"5px 14px", borderRadius:100 }}>{diet}</span>
              </div>
              <p className="inter" style={{ color:G.muted, fontSize:16, marginBottom:24, lineHeight:1.75, fontWeight:300 }}>{recipe.description}</p>

              {/* Stats bar */}
              <div style={{ display:"flex", gap:0, borderRadius:14, overflow:"hidden", marginBottom:36, border:"1px solid #efefef" }}>
                {[["⏱","Cook Time",recipe.time||"—"],["📊","Difficulty",recipe.difficulty||"—"],["🍽️","Cuisine",recipe.cuisine||cuisine||"—"]].map(([ic,label,val],i,arr)=>(
                  <div key={label} style={{ flex:1, textAlign:"center", padding:"18px 12px", background:i%2===0?"#fafaf8":"#fff", borderRight:i<arr.length-1?"1px solid #efefef":"none" }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>{ic}</div>
                    <div className="inter" style={{ fontSize:10, color:G.muted, textTransform:"uppercase", fontWeight:600, letterSpacing:2, marginBottom:4 }}>{label}</div>
                    <div className="inter" style={{ fontSize:14, fontWeight:600, color:G.dark }}>{val}</div>
                  </div>
                ))}
              </div>

              {detLoading ? (
                <div style={{ textAlign:"center", padding:"3rem 0" }}>
                  <div style={{ fontSize:48 }}>🍳</div>
                  <p className="play" style={{ color:G.muted, fontSize:22, marginTop:14 }}>Loading recipe…</p>
                </div>
              ) : detail && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:44 }}>
                  <div>
                    <h3 className="play" style={{ fontSize:22, color:G.red, marginBottom:18, fontWeight:800 }}>Ingredients</h3>
                    <ul style={{ listStyle:"none" }}>
                      {detail.ingredients?.map((ing,i)=>(
                        <li key={i} className="inter" style={{ padding:"9px 0", borderBottom:"1px solid #f5f5f5", fontSize:14, color:G.dark, display:"flex", gap:10, alignItems:"flex-start", fontWeight:400, lineHeight:1.5 }}>
                          <span style={{ color:G.green, fontWeight:700, marginTop:1, flexShrink:0 }}>✓</span>{ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="play" style={{ fontSize:22, color:G.green, marginBottom:18, fontWeight:800 }}>Instructions</h3>
                    <ol style={{ listStyle:"none" }}>
                      {detail.steps?.map((s,i)=>(
                        <li key={i} style={{ display:"flex", gap:16, marginBottom:22 }}>
                          <span className="inter" style={{ background:G.green, color:"#fff", borderRadius:"50%", width:28, height:28, minWidth:28, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, marginTop:1 }}>{i+1}</span>
                          <p className="inter" style={{ fontSize:15, color:G.dark, lineHeight:1.75, fontWeight:300 }}>{s}</p>
                        </li>
                      ))}
                    </ol>
                    {detail.tip && (
                      <div style={{ background:"#fffbf0", border:"1.5px solid #e8d5a0", borderRadius:14, padding:"16px 20px", marginTop:24 }}>
                        <p className="inter" style={{ fontWeight:700, color:G.warm, marginBottom:7, fontSize:13, letterSpacing:"0.02em" }}>💡 Chef's Tip</p>
                        <p className="inter" style={{ fontSize:14, color:"#7a5c00", lineHeight:1.7, fontWeight:300 }}>{detail.tip}</p>
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
        style={{ position:"fixed", bottom:28, right:28, width:62, height:62, borderRadius:"50%", background:`linear-gradient(145deg,${G.green},#0d3d27)`, color:"#fff", fontSize:26, border:"3px solid rgba(255,255,255,0.9)", cursor:"pointer", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", transition:"transform .25s cubic-bezier(.25,.46,.45,.94)", animation:chatOpen?"none":"pulse 2.5s infinite" }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
        {chatOpen?"✕":"💬"}
      </button>

      {chatOpen && (
        <div style={{ position:"fixed", bottom:104, right:28, width:348, maxHeight:500, background:"#fff", borderRadius:20, boxShadow:"0 16px 56px rgba(0,0,0,0.16)", zIndex:299, display:"flex", flexDirection:"column", overflow:"hidden", border:"1px solid #efefef" }}>
          <div style={{ background:`linear-gradient(145deg,${G.green},#0d3d27)`, padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:10, width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🍽️</div>
            <div>
              <div className="play" style={{ color:"#fff", fontWeight:800, fontSize:16 }}>TasteMania Assistant</div>
              <div className="inter" style={{ color:"rgba(255,255,255,0.65)", fontSize:11, marginTop:1, fontWeight:300 }}>Ask me anything about food!</div>
            </div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 14px 8px", display:"flex", flexDirection:"column", gap:10 }}>
            {chatMsgs.map((m,i)=>(
              <div key={i} className="chat-bubble" style={{ display:"flex", flexDirection:"column", alignItems:m.role==="user"?"flex-end":"flex-start" }}>
                <div className="inter" style={{ maxWidth:"84%", background:m.role==="user"?G.green:"#f4f4f2", color:m.role==="user"?"#fff":G.dark, padding:"10px 15px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", fontSize:14, lineHeight:1.6, fontWeight:m.role==="user"?400:300 }}>
                  {m.text}
                </div>
                {m.action && (
                  <button className="inter"
                    onClick={()=>{ openRecipeDetail({ name:m.action.name }, m.action.cuisine); setChatOpen(false); }}
                    style={{ marginTop:8, background:G.warm, color:"#fff", border:"none", borderRadius:100, padding:"9px 16px", fontSize:12, fontWeight:600, cursor:"pointer", letterSpacing:"0.03em" }}>
                    {m.action.label}
                  </button>
                )}
              </div>
            ))}
            {chatLoading && <div className="inter" style={{ background:"#f4f4f2", padding:"10px 15px", borderRadius:"16px 16px 16px 4px", fontSize:14, color:G.muted, alignSelf:"flex-start" }}>Thinking… 🤔</div>}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding:"12px 14px", borderTop:"1px solid #f0f0f0", display:"flex", gap:8 }}>
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()}
              className="inter"
              placeholder="Ask about a recipe or food fact…"
              style={{ flex:1, border:"1.5px solid #e8e8e8", borderRadius:100, padding:"10px 16px", fontSize:13, outline:"none", color:G.dark, fontWeight:400 }} />
            <button onClick={sendChat} disabled={chatLoading}
              style={{ background:G.green, color:"#fff", border:"none", borderRadius:"50%", width:40, height:40, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}