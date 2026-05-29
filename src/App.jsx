import { useState, useRef } from "react";

const cuisines = [
  { name: "Indian",        emoji: "🍛", tag: "Spicy & Aromatic",  img: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80" },
  { name: "Italian",       emoji: "🍝", tag: "Rich & Comforting",  img: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600&q=80" },
  { name: "Chinese",       emoji: "🥡", tag: "Bold & Savory",      img: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80" },
  { name: "Mexican",       emoji: "🌮", tag: "Vibrant & Zesty",    img: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80" },
  { name: "Mediterranean", emoji: "🫙", tag: "Fresh & Light",      img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80" },
  { name: "Japanese",      emoji: "🍱", tag: "Delicate & Umami",   img: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&q=80" },
  { name: "Thai",          emoji: "🍜", tag: "Sweet & Spicy",      img: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=600&q=80" },
  { name: "American",      emoji: "🍔", tag: "Hearty & Bold",      img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80" },
];

const HERO = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=85";

const TRENDING = [
  { name: "Butter Chicken",      cuisine: "Indian",  time: "45 mins", img: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80" },
  { name: "Spaghetti Carbonara", cuisine: "Italian", time: "25 mins", img: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&q=80" },
  { name: "Pad Thai",            cuisine: "Thai",    time: "30 mins", img: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=80" },
];

const RECIPE_IMGS = [
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&q=80",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80",
];

const DETAIL_IMG = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1000&q=85";

const dietTabs = [
  { key: "Veg",     label: "Vegetarian",     icon: "🥦", color: "#2d6a4f" },
  { key: "Non-Veg", label: "Non-Vegetarian", icon: "🍗", color: "#9b2226" },
  { key: "Vegan",   label: "Vegan",          icon: "🌱", color: "#386641" },
];

const G = { cream:"#fdf8f0", dark:"#1a1a1a", green:"#2d6a4f", red:"#9b2226", warm:"#c9882b", muted:"#6b6b6b", border:"#e8e0d5" };

export default function TasteMania() {
  const [step, setStep]               = useState("home");
  const [selectedCuisine, setSC]      = useState(null);
  const [selectedDiet, setSD]         = useState("Veg");
  const [recipes, setRecipes]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [selectedRecipe, setSR]       = useState(null);
  const [recipeDetail, setRD]         = useState(null);
  const [detailLoading, setDL]        = useState(false);
  const [error, setError]             = useState("");
  const cuisinesRef                   = useRef(null);

  const scrollToCuisines = () => cuisinesRef.current?.scrollIntoView({ behavior: "smooth" });

  const fetchRecipes = async (cuisine, diet) => {
    setLoading(true); setRecipes([]); setError("");
    try {
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: "You are a culinary expert. Return ONLY a valid JSON array, no markdown fences, no preamble. Each object: {name, description (1 sentence), time (e.g. '30 mins'), difficulty ('Easy'|'Medium'|'Hard'), tags ([string,string])}.",
          messages: [{ role: "user", content: `List exactly 6 popular ${diet} ${cuisine} recipes. JSON array only.` }]
        })
      });
      const data = await res.json();
      const raw  = data.content?.[0]?.text || "";
      setRecipes(JSON.parse(raw.replace(/```json|```/gi, "").trim()));
    } catch {
      setError("API key not configured. Set ANTHROPIC_API_KEY in Netlify → Site Settings → Environment Variables.");
      setRecipes([
        { name: `Classic ${cuisine} Dish 1`, description: "A beloved staple full of authentic flavour.", time: "30 mins", difficulty: "Easy",   tags: [diet, cuisine] },
        { name: `Classic ${cuisine} Dish 2`, description: "A hearty crowd-pleaser with bold spices.",   time: "45 mins", difficulty: "Medium", tags: [diet, cuisine] },
        { name: `Classic ${cuisine} Dish 3`, description: "Light and refreshing, perfect for any day.", time: "20 mins", difficulty: "Easy",   tags: [diet, cuisine] },
      ]);
    }
    setLoading(false);
  };

  const fetchDetail = async (r) => {
    setDL(true); setRD(null);
    try {
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          system: "You are a chef. Return ONLY valid JSON, no markdown. Format: {ingredients:[string], steps:[string], tip:string}",
          messages: [{ role: "user", content: `Full recipe for "${r.name}" (${selectedCuisine}, ${selectedDiet}). JSON only.` }]
        })
      });
      const data = await res.json();
      setRD(JSON.parse(data.content?.[0]?.text.replace(/```json|```/gi,"").trim()));
    } catch {
      setRD({ ingredients:["Set ANTHROPIC_API_KEY in Netlify environment variables to load live recipes."], steps:["Once API key is configured, full step-by-step instructions will appear here."], tip:"" });
    }
    setDL(false);
  };

  const goToDiet = (c) => { setSC(c.name); setSD("Veg"); setStep("diet"); fetchRecipes(c.name,"Veg"); };
  const changeDiet = (d) => { setSD(d); fetchRecipes(selectedCuisine, d); };
  const openRecipe = (r) => { setSR(r); setStep("detail"); fetchDetail(r); };
  const activeDiet = dietTabs.find(d => d.key === selectedDiet);

  return (
    <div style={{ background: G.cream, minHeight:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap');
        .play { font-family:'Playfair Display',Georgia,serif !important; }
        .card-hover:hover { transform:translateY(-6px); box-shadow:0 20px 48px rgba(0,0,0,0.15) !important; }
        .cuisine-hover:hover { transform:scale(1.04); box-shadow:0 12px 32px rgba(0,0,0,0.18) !important; }
        * { box-sizing:border-box; margin:0; padding:0; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ background:"#fff", borderBottom:`3px solid ${G.green}`, padding:"0 2rem", display:"flex", alignItems:"center", height:60, position:"sticky", top:0, zIndex:200 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
          onClick={() => { setStep("home"); setSC(null); }}>
          <span style={{ fontSize:26 }}>🍽️</span>
          <span className="play" style={{ fontSize:24, fontWeight:800, color:G.green }}>
            Taste<span style={{ color:G.red }}>Mania</span>
          </span>
        </div>
      </nav>

      {/* ══════════ HOME ══════════ */}
      {step === "home" && <>

        {/* HERO */}
        <div style={{ position:"relative", height:540, overflow:"hidden" }}>
          <img src={HERO} alt="hero" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center" }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, rgba(10,10,10,0.78) 42%, rgba(0,0,0,0.15))" }} />
          <div style={{ position:"absolute", top:"50%", left:"6%", transform:"translateY(-50%)", maxWidth:520 }}>
            <div style={{ display:"inline-block", background:G.warm, color:"#fff", fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", padding:"5px 14px", borderRadius:3, marginBottom:18 }}>
              🌍 Global Recipes
            </div>
            <h1 className="play" style={{ color:"#fff", fontSize:50, fontWeight:800, lineHeight:1.15, marginBottom:16, textShadow:"0 2px 16px rgba(0,0,0,0.4)" }}>
              Which cuisine would you like to try today?
            </h1>
            <p style={{ color:"rgba(255,255,255,0.82)", fontSize:17, lineHeight:1.65, marginBottom:30 }}>
              Fresh, flavorful recipes from around the world — made for real, everyday life.
            </p>
            <button onClick={scrollToCuisines}
              style={{ background:G.green, color:"#fff", padding:"14px 34px", border:"none", borderRadius:5, fontWeight:700, fontSize:15, cursor:"pointer", letterSpacing:0.4 }}>
              Browse Cuisines ↓
            </button>
          </div>
        </div>

        {/* GREEN FEATURE BAR */}
        <div style={{ background:G.green, padding:"14px 2rem", display:"flex", justifyContent:"center", gap:48, flexWrap:"wrap" }}>
          {[["🥗","Vegetarian","Veg & Vegan options"],["🌍","8 Cuisines","Global flavors"],["⚡","AI Powered","Live recipe fetch"],["⭐","Top Rated","Curated dishes"]].map(([ic,t,s])=>(
            <div key={t} style={{ display:"flex", alignItems:"center", gap:10, color:"#fff" }}>
              <span style={{ fontSize:22 }}>{ic}</span>
              <div><div style={{ fontWeight:700, fontSize:14 }}>{t}</div><div style={{ fontSize:12, opacity:0.8 }}>{s}</div></div>
            </div>
          ))}
        </div>

        {/* ── CUISINE GRID ── */}
        <div ref={cuisinesRef} style={{ maxWidth:1060, margin:"0 auto", padding:"4rem 1.5rem" }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <p style={{ color:G.warm, fontWeight:700, fontSize:12, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Explore by Region</p>
            <h2 className="play" style={{ fontSize:38, fontWeight:800, color:G.dark, marginBottom:12 }}>Choose Your Cuisine</h2>
            <p style={{ color:G.muted, fontSize:16, maxWidth:460, margin:"0 auto" }}>Tap a cuisine to discover handpicked recipes you'll love.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:20 }}>
            {cuisines.map((c) => (
              <div key={c.name} className="cuisine-hover" onClick={() => goToDiet(c)}
                style={{ position:"relative", height:210, borderRadius:14, overflow:"hidden", cursor:"pointer", transition:"all 0.2s", boxShadow:"0 4px 16px rgba(0,0,0,0.10)" }}>
                <img src={c.img} alt={c.name}
                  style={{ width:"100%", height:"100%", objectFit:"cover" }}
                  onError={e => { e.target.onerror=null; e.target.src=HERO; }} />
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.80) 48%, rgba(0,0,0,0.08))" }} />
                <div style={{ position:"absolute", bottom:16, left:16 }}>
                  <div style={{ fontSize:30, marginBottom:4 }}>{c.emoji}</div>
                  <div className="play" style={{ color:"#fff", fontWeight:800, fontSize:21, lineHeight:1.1 }}>{c.name}</div>
                  <div style={{ color:"rgba(255,255,255,0.72)", fontSize:12, marginTop:3 }}>{c.tag}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TRENDING ── */}
        <div style={{ background:"#fff", borderTop:`1px solid ${G.border}`, borderBottom:`1px solid ${G.border}`, padding:"3.5rem 1.5rem" }}>
          <div style={{ maxWidth:1060, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:32 }}>
              <p style={{ color:G.warm, fontWeight:700, fontSize:12, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>What's Hot</p>
              <h3 className="play" style={{ fontSize:34, color:G.dark }}>Trending This Week 🔥</h3>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:24 }}>
              {TRENDING.map((t) => (
                <div key={t.name} className="card-hover"
                  onClick={() => goToDiet(cuisines.find(c=>c.name===t.cuisine)||cuisines[0])}
                  style={{ borderRadius:14, overflow:"hidden", background:"#fff", boxShadow:"0 3px 14px rgba(0,0,0,0.08)", cursor:"pointer", transition:"all 0.2s" }}>
                  <div style={{ position:"relative", height:200 }}>
                    <img src={t.img} alt={t.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}
                      onError={e=>{ e.target.onerror=null; e.target.src=HERO; }} />
                    <div style={{ position:"absolute", top:12, left:12, background:"#d62828", color:"#fff", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:4, textTransform:"uppercase" }}>🔥 Trending</div>
                  </div>
                  <div style={{ padding:"16px 18px" }}>
                    <h4 className="play" style={{ fontSize:20, color:G.dark, marginBottom:5, fontWeight:700 }}>{t.name}</h4>
                    <p style={{ fontSize:13, color:G.muted }}>🍴 {t.cuisine} · ⏱ {t.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer style={{ background:G.dark, color:"#aaa", textAlign:"center", padding:"2rem", fontSize:13 }}>
          <span className="play" style={{ color:G.green, fontSize:20, fontWeight:800 }}>TasteMania</span>
          <p style={{ marginTop:8, opacity:0.55 }}>© 2025 TasteMania · Recipes from around the world · Powered by AI</p>
        </footer>
      </>}

      {/* ══════════ DIET + RECIPES ══════════ */}
      {step === "diet" && (
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"2.5rem 1.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28, color:G.muted, fontSize:13 }}>
            <span style={{ cursor:"pointer", color:G.green, fontWeight:600 }} onClick={() => { setStep("home"); setSC(null); }}>Home</span>
            <span>›</span><span style={{ color:G.dark, fontWeight:600 }}>{selectedCuisine} Recipes</span>
          </div>

          <p style={{ color:G.warm, fontWeight:700, fontSize:12, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>
            {cuisines.find(c=>c.name===selectedCuisine)?.emoji} {selectedCuisine} Cuisine
          </p>
          <h2 className="play" style={{ fontSize:34, fontWeight:800, color:G.dark, marginBottom:22 }}>What are you in the mood for?</h2>

          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:32 }}>
            {dietTabs.map(d => {
              const active = selectedDiet === d.key;
              return (
                <button key={d.key} onClick={() => changeDiet(d.key)}
                  style={{ padding:"11px 24px", borderRadius:6, border:`2px solid ${d.color}`, background:active?d.color:"#fff", color:active?"#fff":d.color, fontWeight:700, fontSize:14, cursor:"pointer", transition:"all 0.15s", display:"flex", alignItems:"center", gap:7 }}>
                  {d.icon} {d.label}
                </button>
              );
            })}
          </div>

          {error && (
            <div style={{ background:"#fff8e1", border:`1px solid ${G.warm}`, borderRadius:8, padding:"12px 16px", marginBottom:24, fontSize:14, color:"#7a5c00" }}>
              ⚠️ <strong>API Note:</strong> {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign:"center", padding:"5rem 0" }}>
              <div style={{ fontSize:60, marginBottom:16 }}>👨‍🍳</div>
              <p className="play" style={{ color:G.muted, fontSize:24 }}>Cooking up {selectedDiet} {selectedCuisine} recipes…</p>
              <p style={{ color:"#bbb", fontSize:14, marginTop:8 }}>Fetching from AI — this takes a few seconds</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:24 }}>
              {recipes.map((r, i) => (
                <div key={i} className="card-hover" onClick={() => openRecipe(r)}
                  style={{ background:"#fff", borderRadius:14, overflow:"hidden", cursor:"pointer", transition:"all 0.2s", boxShadow:"0 3px 14px rgba(0,0,0,0.08)" }}>
                  <div style={{ position:"relative", height:210 }}>
                    <img src={RECIPE_IMGS[i % RECIPE_IMGS.length]} alt={r.name}
                      style={{ width:"100%", height:"100%", objectFit:"cover" }}
                      onError={e=>{ e.target.onerror=null; e.target.src=HERO; }} />
                    <div style={{ position:"absolute", top:12, left:12, background:activeDiet.color, color:"#fff", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:4, textTransform:"uppercase" }}>
                      {activeDiet.icon} {selectedDiet}
                    </div>
                  </div>
                  <div style={{ padding:"1rem 1.2rem" }}>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:9 }}>
                      {(r.tags||[]).map((t,ti)=>(
                        <span key={ti} style={{ background:G.cream, color:G.warm, fontSize:11, fontWeight:600, padding:"3px 8px", borderRadius:3 }}>{t}</span>
                      ))}
                    </div>
                    <h3 className="play" style={{ fontWeight:700, fontSize:20, color:G.dark, marginBottom:7, lineHeight:1.25 }}>{r.name}</h3>
                    <p style={{ fontSize:13, color:G.muted, marginBottom:14, lineHeight:1.55 }}>{r.description}</p>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <span style={{ background:"#f0faf4", color:G.green, borderRadius:4, padding:"4px 10px", fontSize:12, fontWeight:700 }}>⏱ {r.time}</span>
                      <span style={{ background:"#fef3f3", color:G.red,   borderRadius:4, padding:"4px 10px", fontSize:12, fontWeight:700 }}>📊 {r.difficulty}</span>
                      <span style={{ marginLeft:"auto", color:G.green, fontWeight:700, fontSize:13 }}>View Recipe →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ RECIPE DETAIL ══════════ */}
      {step === "detail" && selectedRecipe && (
        <div style={{ maxWidth:820, margin:"0 auto", padding:"2.5rem 1.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28, color:G.muted, fontSize:13 }}>
            <span style={{ cursor:"pointer", color:G.green, fontWeight:600 }} onClick={() => { setStep("home"); setSC(null); }}>Home</span>
            <span>›</span>
            <span style={{ cursor:"pointer", color:G.green, fontWeight:600 }} onClick={() => setStep("diet")}>{selectedCuisine}</span>
            <span>›</span><span style={{ color:G.dark }}>{selectedRecipe.name}</span>
          </div>

          <div style={{ background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.09)" }}>
            <img src={DETAIL_IMG} alt={selectedRecipe.name}
              style={{ width:"100%", height:340, objectFit:"cover" }}
              onError={e=>{ e.target.onerror=null; e.target.src=HERO; }} />
            <div style={{ padding:"2rem 2.5rem" }}>
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                <span style={{ background:G.cream, color:G.warm, fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:4 }}>{selectedCuisine}</span>
                <span style={{ background:"#f0faf4", color:G.green, fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:4 }}>{selectedDiet}</span>
              </div>
              <h1 className="play" style={{ fontSize:34, fontWeight:800, color:G.dark, marginBottom:10, lineHeight:1.2 }}>{selectedRecipe.name}</h1>
              <p style={{ color:G.muted, fontSize:16, marginBottom:22, lineHeight:1.65 }}>{selectedRecipe.description}</p>

              <div style={{ display:"flex", gap:16, padding:"16px 0", borderTop:`1px solid ${G.border}`, borderBottom:`1px solid ${G.border}`, marginBottom:32 }}>
                {[["⏱","Cook Time",selectedRecipe.time],["📊","Difficulty",selectedRecipe.difficulty],["🍽️","Cuisine",selectedCuisine]].map(([ic,label,val])=>(
                  <div key={label} style={{ flex:1, textAlign:"center" }}>
                    <div style={{ fontSize:22 }}>{ic}</div>
                    <div style={{ fontSize:11, color:G.muted, textTransform:"uppercase", fontWeight:700, letterSpacing:1, marginTop:5 }}>{label}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:G.dark, marginTop:3 }}>{val}</div>
                  </div>
                ))}
              </div>

              {detailLoading ? (
                <div style={{ textAlign:"center", padding:"3rem 0" }}>
                  <div style={{ fontSize:48 }}>🍳</div>
                  <p className="play" style={{ color:G.muted, fontSize:22, marginTop:14 }}>Loading the full recipe…</p>
                </div>
              ) : recipeDetail && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:40 }}>
                  <div>
                    <h3 className="play" style={{ fontSize:22, color:G.red, marginBottom:16 }}>Ingredients</h3>
                    <ul style={{ listStyle:"none" }}>
                      {recipeDetail.ingredients?.map((ing,i)=>(
                        <li key={i} style={{ padding:"8px 0", borderBottom:`1px solid ${G.border}`, fontSize:14, color:G.dark, display:"flex", gap:8, alignItems:"flex-start" }}>
                          <span style={{ color:G.green, fontWeight:700, marginTop:1 }}>✓</span>{ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="play" style={{ fontSize:22, color:G.green, marginBottom:16 }}>Instructions</h3>
                    <ol style={{ listStyle:"none" }}>
                      {recipeDetail.steps?.map((s,i)=>(
                        <li key={i} style={{ display:"flex", gap:14, marginBottom:18 }}>
                          <span style={{ background:G.green, color:"#fff", borderRadius:"50%", width:28, height:28, minWidth:28, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}>{i+1}</span>
                          <p style={{ fontSize:15, color:G.dark, lineHeight:1.65 }}>{s}</p>
                        </li>
                      ))}
                    </ol>
                    {recipeDetail.tip && (
                      <div style={{ background:"#fffbeb", border:`1.5px solid ${G.warm}`, borderRadius:10, padding:"14px 18px", marginTop:24 }}>
                        <p style={{ fontWeight:700, color:G.warm, marginBottom:6, fontSize:14 }}>💡 Chef's Tip</p>
                        <p style={{ fontSize:14, color:"#7a5c00", lineHeight:1.6 }}>{recipeDetail.tip}</p>
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