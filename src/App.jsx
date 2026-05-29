import { useState, useRef } from "react";

const cuisines = [
  { name:"Indian",        emoji:"🍛", tag:"Spicy & Aromatic",  grad:["#ff6b35","#f7c59f"] },
  { name:"Italian",       emoji:"🍝", tag:"Rich & Comforting",  grad:["#2d6a4f","#95d5b2"] },
  { name:"Chinese",       emoji:"🥡", tag:"Bold & Savory",      grad:["#c1121f","#ffb703"] },
  { name:"Mexican",       emoji:"🌮", tag:"Vibrant & Zesty",    grad:["#e9c46a","#f4a261"] },
  { name:"Mediterranean", emoji:"🫙", tag:"Fresh & Light",      grad:["#457b9d","#a8dadc"] },
  { name:"Japanese",      emoji:"🍱", tag:"Delicate & Umami",   grad:["#7b2d8b","#c77dff"] },
  { name:"Thai",          emoji:"🍜", tag:"Sweet & Spicy",      grad:["#06b6d4","#67e8f9"] },
  { name:"American",      emoji:"🍔", tag:"Hearty & Bold",      grad:["#ef233c","#8d99ae"] },
];

const dietTabs = [
  { key:"Veg",     label:"Vegetarian",     icon:"🥦", color:"#2d6a4f" },
  { key:"Non-Veg", label:"Non-Vegetarian", icon:"🍗", color:"#9b2226" },
  { key:"Vegan",   label:"Vegan",          icon:"🌱", color:"#386641" },
];

const CARD_COLORS = [
  ["#ff6b35","#fff3ee"],["#2d6a4f","#eaf7f0"],["#c1121f","#fff0f0"],
  ["#e07b00","#fff8ec"],["#457b9d","#eaf4f8"],["#7b2d8b","#f5ecff"],
];

const TRENDING = [
  { name:"Butter Chicken",      cuisine:"Indian",  time:"45 mins", emoji:"🍛", grad:["#ff6b35","#ffb347"] },
  { name:"Spaghetti Carbonara", cuisine:"Italian", time:"25 mins", emoji:"🍝", grad:["#2d6a4f","#95d5b2"] },
  { name:"Pad Thai",            cuisine:"Thai",    time:"30 mins", emoji:"🍜", grad:["#06b6d4","#67e8f9"] },
];

const G = { cream:"#fdf8f0", dark:"#1a1a1a", green:"#2d6a4f", red:"#9b2226", warm:"#c9882b", muted:"#666", border:"#e8e0d5" };
const play = { fontFamily:"'Playfair Display',Georgia,serif" };

// Robust JSON extractor — handles markdown fences, extra text, etc.
const extractJSON = (text) => {
  try { return JSON.parse(text.trim()); } catch {}
  const cleaned = text.replace(/```json\s?/gi,"").replace(/```\s?/gi,"").trim();
  try { return JSON.parse(cleaned); } catch {}
  const arr = text.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]); } catch {} }
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch {} }
  throw new Error("Could not parse JSON");
};

export default function TasteMania() {
  const [step,      setStep]    = useState("home");
  const [cuisine,   setCuisine] = useState(null);
  const [diet,      setDiet]    = useState("Veg");
  const [recipes,   setRecipes] = useState([]);
  const [loading,   setLoading] = useState(false);
  const [recipe,    setRecipe]  = useState(null);
  const [detail,    setDetail]  = useState(null);
  const [detLoading,setDL]      = useState(false);
  const [error,     setError]   = useState("");
  const cuisinesRef = useRef(null);

  const scrollToCuisines = () => cuisinesRef.current?.scrollIntoView({ behavior:"smooth" });

  const fetchRecipes = async (c, d) => {
    setLoading(true); setRecipes([]); setError("");
    try {
      const res = await fetch("/.netlify/functions/claude", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          max_tokens: 1500,
          system: "Return ONLY a valid JSON array. No markdown, no explanation. Each item: {name, description, time, difficulty, tags:[str,str]}",
          messages: [{ role:"user", content:`List exactly 6 popular ${d} ${c} recipes. JSON array only.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      setRecipes(extractJSON(text));
    } catch (e) {
      setError("Could not load recipes. Please try again in a moment.");
      setRecipes([
        { name:`${c} Classic 1`, description:"A beloved staple bursting with authentic flavour.", time:"30 mins", difficulty:"Easy",   tags:[d,c] },
        { name:`${c} Classic 2`, description:"A hearty crowd-pleaser with bold, warming spices.",  time:"45 mins", difficulty:"Medium", tags:[d,c] },
        { name:`${c} Classic 3`, description:"Light and refreshing — perfect for any occasion.",   time:"20 mins", difficulty:"Easy",   tags:[d,c] },
        { name:`${c} Classic 4`, description:"Rich, slow-cooked comfort food at its finest.",      time:"60 mins", difficulty:"Hard",   tags:[d,c] },
      ]);
    }
    setLoading(false);
  };

  const fetchDetail = async (r) => {
    setDL(true); setDetail(null);
    try {
      const res = await fetch("/.netlify/functions/claude", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          max_tokens: 1200,
          system: "Return ONLY valid JSON. No markdown. Format: {ingredients:[str], steps:[str], tip:str}",
          messages: [{ role:"user", content:`Full recipe for "${r.name}" (${cuisine}, ${diet}). JSON only.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      setDetail(extractJSON(text));
    } catch {
      setDetail({ ingredients:["Could not load ingredients."], steps:["Could not load steps. Please go back and try again."], tip:"" });
    }
    setDL(false);
  };

  const goTo = (c) => { setCuisine(c.name); setDiet("Veg"); setStep("diet"); fetchRecipes(c.name,"Veg"); };
  const changeDiet = (d) => { setDiet(d); fetchRecipes(cuisine, d); };
  const openRecipe = (r) => { setRecipe(r); setStep("detail"); fetchDetail(r); };
  const activeDiet = dietTabs.find(d => d.key === diet);
  const cuisineObj  = cuisines.find(c => c.name === cuisine);

  return (
    <div style={{ background:G.cream, minHeight:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .lift:hover{transform:translateY(-6px);box-shadow:0 20px 48px rgba(0,0,0,0.15)!important}
        .pop:hover{transform:scale(1.04);box-shadow:0 12px 32px rgba(0,0,0,0.18)!important}
      `}</style>

      {/* NAV */}
      <nav style={{ background:"#fff", borderBottom:`3px solid ${G.green}`, padding:"0 2rem", display:"flex", alignItems:"center", height:62, position:"sticky", top:0, zIndex:200 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
          onClick={() => { setStep("home"); setCuisine(null); }}>
          <span style={{ fontSize:28 }}>🍽️</span>
          <span style={{ ...play, fontSize:26, fontWeight:800, color:G.green }}>
            Taste<span style={{ color:G.red }}>Mania</span>
          </span>
        </div>
      </nav>

      {/* ══ HOME ══ */}
      {step === "home" && <>
        {/* HERO */}
        <div style={{ position:"relative", minHeight:500, background:"linear-gradient(135deg,#1a1a1a 0%,#2d3a2e 40%,#3b1f0a 100%)", display:"flex", alignItems:"center", overflow:"hidden" }}>
          {["#ff6b3520","#c9882b18","#2d6a4f22"].map((c,i) => (
            <div key={i} style={{ position:"absolute", width:380+i*80, height:380+i*80, borderRadius:"50%", background:c, top:i===0?-80:i===1?120:-60, right:i===0?-60:i===1?200:-20, pointerEvents:"none" }} />
          ))}
          <div style={{ position:"relative", zIndex:2, padding:"3.5rem 6%", maxWidth:600 }}>
            <div style={{ display:"inline-block", background:G.warm, color:"#fff", fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:"uppercase", padding:"6px 16px", borderRadius:4, marginBottom:22 }}>
              🌍 Global Recipes
            </div>
            <h1 style={{ ...play, color:"#fff", fontSize:50, fontWeight:800, lineHeight:1.15, marginBottom:18 }}>
              Which cuisine would you<br/>like to try today?
            </h1>
            <p style={{ color:"rgba(255,255,255,0.78)", fontSize:18, lineHeight:1.7, marginBottom:32 }}>
              Fresh, flavorful recipes from around the world —<br/>made for real, everyday life.
            </p>
            <button onClick={scrollToCuisines}
              style={{ background:G.green, color:"#fff", padding:"15px 36px", border:"none", borderRadius:6, fontWeight:700, fontSize:16, cursor:"pointer" }}>
              Browse Cuisines ↓
            </button>
          </div>
          <div style={{ position:"absolute", right:"5%", top:"50%", transform:"translateY(-50%)", fontSize:140, opacity:0.18, pointerEvents:"none" }}>🍽️</div>
        </div>

        {/* FEATURE BAR */}
        <div style={{ background:G.green, padding:"16px 2rem", display:"flex", justifyContent:"center", gap:48, flexWrap:"wrap" }}>
          {[["🥗","Vegetarian","Veg & Vegan options"],["🌍","8 Cuisines","Global flavors"],["⚡","AI Powered","Live recipe fetch"],["⭐","Top Rated","Curated dishes"]].map(([ic,t,s]) => (
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
            <h2 style={{ ...play, fontSize:40, fontWeight:800, color:G.dark, marginBottom:12 }}>Choose Your Cuisine</h2>
            <p style={{ color:G.muted, fontSize:16, maxWidth:460, margin:"0 auto" }}>Tap a cuisine to discover handpicked recipes you'll love.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:20 }}>
            {cuisines.map((c) => (
              <div key={c.name} className="pop" onClick={() => goTo(c)}
                style={{ height:210, borderRadius:16, overflow:"hidden", cursor:"pointer", transition:"all 0.2s", boxShadow:"0 4px 18px rgba(0,0,0,0.10)", background:`linear-gradient(135deg,${c.grad[0]},${c.grad[1]})`, display:"flex", flexDirection:"column", justifyContent:"flex-end", padding:"20px" }}>
                <div style={{ fontSize:52, marginBottom:8, filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.2))" }}>{c.emoji}</div>
                <div style={{ ...play, color:"#fff", fontWeight:800, fontSize:22, lineHeight:1.1, textShadow:"0 1px 6px rgba(0,0,0,0.3)" }}>{c.name}</div>
                <div style={{ color:"rgba(255,255,255,0.80)", fontSize:12, marginTop:4 }}>{c.tag}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TRENDING */}
        <div style={{ background:"#fff", borderTop:`1px solid ${G.border}`, padding:"3.5rem 1.5rem" }}>
          <div style={{ maxWidth:1060, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:34 }}>
              <p style={{ color:G.warm, fontWeight:700, fontSize:11, letterSpacing:2.5, textTransform:"uppercase", marginBottom:8 }}>What's Hot</p>
              <h3 style={{ ...play, fontSize:36, color:G.dark }}>Trending This Week 🔥</h3>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:24 }}>
              {TRENDING.map((t) => (
                <div key={t.name} className="lift"
                  onClick={() => goTo(cuisines.find(c => c.name === t.cuisine) || cuisines[0])}
                  style={{ borderRadius:14, overflow:"hidden", background:"#fff", boxShadow:"0 3px 14px rgba(0,0,0,0.08)", cursor:"pointer", transition:"all 0.2s" }}>
                  <div style={{ height:190, background:`linear-gradient(135deg,${t.grad[0]},${t.grad[1]})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:90 }}>
                    {t.emoji}
                  </div>
                  <div style={{ padding:"16px 18px" }}>
                    <span style={{ background:"#fde8e8", color:"#c1121f", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:4, textTransform:"uppercase" }}>🔥 Trending</span>
                    <h4 style={{ ...play, fontSize:20, color:G.dark, margin:"10px 0 5px", fontWeight:700 }}>{t.name}</h4>
                    <p style={{ fontSize:13, color:G.muted }}>🍴 {t.cuisine} · ⏱ {t.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer style={{ background:G.dark, color:"#aaa", textAlign:"center", padding:"2rem", fontSize:13 }}>
          <div style={{ ...play, color:G.green, fontSize:22, fontWeight:800, marginBottom:8 }}>TasteMania</div>
          <p style={{ opacity:.5 }}>© 2025 TasteMania · Recipes from around the world · Powered by AI</p>
        </footer>
      </>}

      {/* ══ DIET + RECIPES ══ */}
      {step === "diet" && (
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"2.5rem 1.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28, fontSize:13, color:G.muted }}>
            <span style={{ cursor:"pointer", color:G.green, fontWeight:600 }} onClick={() => { setStep("home"); setCuisine(null); }}>Home</span>
            <span>›</span><span style={{ color:G.dark, fontWeight:600 }}>{cuisine} Recipes</span>
          </div>

          {cuisineObj && (
            <div style={{ borderRadius:14, padding:"2rem 2.5rem", marginBottom:32, display:"flex", alignItems:"center", gap:24, background:`linear-gradient(135deg,${cuisineObj.grad[0]},${cuisineObj.grad[1]})` }}>
              <span style={{ fontSize:72 }}>{cuisineObj.emoji}</span>
              <div>
                <p style={{ color:"rgba(255,255,255,0.75)", fontSize:12, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Exploring</p>
                <h2 style={{ ...play, color:"#fff", fontSize:36, fontWeight:800, marginBottom:4 }}>{cuisine} Cuisine</h2>
                <p style={{ color:"rgba(255,255,255,0.80)", fontSize:15 }}>{cuisineObj.tag}</p>
              </div>
            </div>
          )}

          <h3 style={{ ...play, fontSize:26, color:G.dark, marginBottom:18 }}>What are you in the mood for?</h3>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:32 }}>
            {dietTabs.map(d => {
              const active = diet === d.key;
              return (
                <button key={d.key} onClick={() => changeDiet(d.key)}
                  style={{ padding:"11px 24px", borderRadius:6, border:`2px solid ${d.color}`, background:active?d.color:"#fff", color:active?"#fff":d.color, fontWeight:700, fontSize:14, cursor:"pointer", transition:"all .15s", display:"flex", alignItems:"center", gap:7 }}>
                  {d.icon} {d.label}
                </button>
              );
            })}
          </div>

          {error && <div style={{ background:"#fff8e1", border:`1px solid ${G.warm}`, borderRadius:8, padding:"12px 16px", marginBottom:24, fontSize:14, color:"#7a5c00" }}>{error}</div>}

          {loading ? (
            <div style={{ textAlign:"center", padding:"5rem 0" }}>
              <div style={{ fontSize:64, marginBottom:16 }}>👨‍🍳</div>
              <p style={{ ...play, color:G.muted, fontSize:24, marginBottom:8 }}>Cooking up {diet} {cuisine} recipes…</p>
              <p style={{ color:"#bbb", fontSize:14 }}>Fetching from AI — just a moment</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))", gap:24 }}>
              {recipes.map((r, i) => {
                const [accent] = CARD_COLORS[i % CARD_COLORS.length];
                return (
                  <div key={i} className="lift" onClick={() => openRecipe(r)}
                    style={{ background:"#fff", borderRadius:14, overflow:"hidden", cursor:"pointer", transition:"all .2s", boxShadow:"0 3px 14px rgba(0,0,0,0.08)" }}>
                    <div style={{ height:160, background:`linear-gradient(135deg,${accent}cc,${accent}88)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:80, position:"relative" }}>
                      <span style={{ filter:"drop-shadow(0 4px 10px rgba(0,0,0,0.2))" }}>{cuisineObj?.emoji || "🍽️"}</span>
                      <div style={{ position:"absolute", top:12, left:12, background:activeDiet.color, color:"#fff", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:4, textTransform:"uppercase" }}>
                        {activeDiet.icon} {diet}
                      </div>
                    </div>
                    <div style={{ padding:"1rem 1.2rem" }}>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:9 }}>
                        {(r.tags || []).map((t, ti) => (
                          <span key={ti} style={{ background:G.cream, color:G.warm, fontSize:11, fontWeight:600, padding:"3px 8px", borderRadius:3 }}>{t}</span>
                        ))}
                      </div>
                      <h3 style={{ ...play, fontWeight:700, fontSize:20, color:G.dark, marginBottom:7, lineHeight:1.25 }}>{r.name}</h3>
                      <p style={{ fontSize:13, color:G.muted, marginBottom:14, lineHeight:1.55 }}>{r.description}</p>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <span style={{ background:"#f0faf4", color:G.green, borderRadius:4, padding:"4px 10px", fontSize:12, fontWeight:700 }}>⏱ {r.time}</span>
                        <span style={{ background:"#fef3f3", color:G.red, borderRadius:4, padding:"4px 10px", fontSize:12, fontWeight:700 }}>📊 {r.difficulty}</span>
                        <span style={{ marginLeft:"auto", color:G.green, fontWeight:700, fontSize:13 }}>View Recipe →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ DETAIL ══ */}
      {step === "detail" && recipe && (
        <div style={{ maxWidth:820, margin:"0 auto", padding:"2.5rem 1.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28, fontSize:13, color:G.muted }}>
            <span style={{ cursor:"pointer", color:G.green, fontWeight:600 }} onClick={() => { setStep("home"); setCuisine(null); }}>Home</span>
            <span>›</span>
            <span style={{ cursor:"pointer", color:G.green, fontWeight:600 }} onClick={() => setStep("diet")}>{cuisine}</span>
            <span>›</span><span style={{ color:G.dark }}>{recipe.name}</span>
          </div>

          <div style={{ background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.09)" }}>
            <div style={{ height:260, background:`linear-gradient(135deg,${cuisineObj?.grad[0] || "#2d6a4f"},${cuisineObj?.grad[1] || "#95d5b2"})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:120 }}>
              <span style={{ filter:"drop-shadow(0 6px 18px rgba(0,0,0,0.25))" }}>{cuisineObj?.emoji || "🍽️"}</span>
            </div>
            <div style={{ padding:"2rem 2.5rem" }}>
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                <span style={{ background:G.cream, color:G.warm, fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:4 }}>{cuisine}</span>
                <span style={{ background:"#f0faf4", color:G.green, fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:4 }}>{diet}</span>
              </div>
              <h1 style={{ ...play, fontSize:34, fontWeight:800, color:G.dark, marginBottom:10, lineHeight:1.2 }}>{recipe.name}</h1>
              <p style={{ color:G.muted, fontSize:16, marginBottom:22, lineHeight:1.65 }}>{recipe.description}</p>

              <div style={{ display:"flex", gap:16, padding:"16px 0", borderTop:`1px solid ${G.border}`, borderBottom:`1px solid ${G.border}`, marginBottom:32 }}>
                {[["⏱","Cook Time",recipe.time],["📊","Difficulty",recipe.difficulty],["🍽️","Cuisine",cuisine]].map(([ic,label,val]) => (
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
                  <p style={{ ...play, color:G.muted, fontSize:22, marginTop:14 }}>Loading the full recipe…</p>
                </div>
              ) : detail && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:40 }}>
                  <div>
                    <h3 style={{ ...play, fontSize:22, color:G.red, marginBottom:16 }}>Ingredients</h3>
                    <ul style={{ listStyle:"none" }}>
                      {detail.ingredients?.map((ing, i) => (
                        <li key={i} style={{ padding:"8px 0", borderBottom:`1px solid ${G.border}`, fontSize:14, color:G.dark, display:"flex", gap:8, alignItems:"flex-start" }}>
                          <span style={{ color:G.green, fontWeight:700 }}>✓</span>{ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 style={{ ...play, fontSize:22, color:G.green, marginBottom:16 }}>Instructions</h3>
                    <ol style={{ listStyle:"none" }}>
                      {detail.steps?.map((s, i) => (
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
    </div>
  );
}