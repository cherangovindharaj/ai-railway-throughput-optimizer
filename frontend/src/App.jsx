import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000";

const STATIONS = [
  { name: "Chennai Central", short: "MAS", km: 0 },
  { name: "Villupuram",      short: "VM",  km: 162 },
  { name: "Vridhachalam",    short: "VRI", km: 214 },
  { name: "Trichy",          short: "TPJ", km: 336 },
];

const TRAIN_COLORS = ["#2563eb","#16a34a","#d97706","#dc2626","#7c3aed"];

const ROUTES = [
  "Chennai → Trichy",
  "Chennai → Mumbai",
  "Chennai → Delhi",
  "Mumbai → Delhi",
  "Chennai → Kolkata"
];
// ── Password Validator ────────────────────────────────────
const validatePassword = (password) => {
  const rules = [
    { test: password.length >= 8,          message: "At least 8 characters" },
    { test: /[A-Z]/.test(password),        message: "One uppercase letter (A-Z)" },
    { test: /[0-9]/.test(password),        message: "One number (0-9)" },
    { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), message: 'One special character (!@#$%^&*)' },
  ];
  const failed  = rules.filter(r => !r.test);
  const passed  = rules.filter(r => r.test);
  return {
    isValid:  failed.length === 0,
    failed:   failed.map(r => r.message),
    passed:   passed.map(r => r.message),
    strength: passed.length === 0 ? "Weak"
            : passed.length === 1 ? "Weak"
            : passed.length === 2 ? "Medium"
            : passed.length === 3 ? "Strong"
            : "Very Strong"
  };
};

// ── Password Strength Bar Component ──────────────────────
const PasswordStrengthBar = ({ password }) => {
  if (!password) return null;
  const result = validatePassword(password);
  const colors = { "Weak":"#ef4444", "Medium":"#f59e0b", "Strong":"#3b82f6", "Very Strong":"#16a34a" };
  const widths = { "Weak":"25%", "Medium":"50%", "Strong":"75%", "Very Strong":"100%" };
  const col    = colors[result.strength];

  return (
    <div style={{ marginTop:8 }}>
      {/* Strength bar */}
      <div style={{ display:"flex", gap:4, marginBottom:6 }}>
        {["Weak","Medium","Strong","Very Strong"].map((level,i) => (
          <div key={level} style={{ flex:1, height:4, borderRadius:2, background: Object.keys(colors).indexOf(result.strength) >= i ? col : "#e2e8f0", transition:"background 0.3s" }} />
        ))}
      </div>

      {/* Strength label */}
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:11, color:col, fontWeight:600 }}>{result.strength} Password</span>
        {result.isValid && <span style={{ fontSize:11, color:"#16a34a", fontWeight:600 }}>✅ Password is strong!</span>}
      </div>

      {/* Rules checklist */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
        {[
          { test: password.length >= 8,          label:"8+ characters" },
          { test: /[A-Z]/.test(password),         label:"Uppercase letter" },
          { test: /[0-9]/.test(password),         label:"Number (0-9)" },
          { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), label:"Special character" },
        ].map(rule=>(
          <div key={rule.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ fontSize:11, color: rule.test?"#16a34a":"#94a3b8" }}>
              {rule.test ? "✅" : "○"}
            </span>
            <span style={{ fontSize:11, color: rule.test?"#374151":"#94a3b8" }}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────
const Badge = ({ text, color }) => (
  <span style={{
    display:"inline-block", padding:"2px 10px", borderRadius:20,
    fontSize:11, fontWeight:600,
    background: color==="green"?"#dcfce7":color==="red"?"#fee2e2":color==="yellow"?"#fef9c3":color==="blue"?"#dbeafe":color==="purple"?"#f3e8ff":"#f3f4f6",
    color:      color==="green"?"#15803d":color==="red"?"#b91c1c":color==="yellow"?"#92400e":color==="blue"?"#1d4ed8":color==="purple"?"#7c3aed":"#374151",
  }}>{text}</span>
);

const Card = ({ children, style={} }) => (
  <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", ...style }}>
    {children}
  </div>
);

// ── Alert Sound ───────────────────────────────────────────
function useAlertSound(conflictCount) {
  const prev = useRef(0);
  useEffect(() => {
    if (conflictCount > prev.current && conflictCount > 0) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [[880,0,0.15],[880,0.2,0.15],[1100,0.4,0.3]].forEach(([freq,start,dur]) => {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = freq; osc.type = "square";
          gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + dur);
        });
      } catch(e) {}
    }
    prev.current = conflictCount;
  }, [conflictCount]);
}

// ══════════════════════════════════════════════════════════
//  LOGIN PAGE
// ══════════════════════════════════════════════════════════
function LoginPage({ onLogin, onGoSignup, onForgotPassword }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) { onLogin(data.user); }
      else        { setError(data.detail || "Invalid email or password."); }
    } catch { setError("Cannot connect to server. Is backend running?"); }
    setLoading(false);
  };

  const inp = {
    width:"100%", padding:"11px 14px",
    border:"1.5px solid #d1d5db", borderRadius:8,
    fontSize:14, color:"#111827", outline:"none",
    background:"#fff", boxSizing:"border-box", transition:"border 0.2s"
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"linear-gradient(135deg,#1e3a5f 0%,#0f2540 100%)" }}>
      {/* Left Panel */}
      <div style={{ width:"45%", padding:"60px 48px", display:"flex", flexDirection:"column", justifyContent:"center", color:"white" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:48 }}>
          <div style={{ width:44, height:44, background:"rgba(255,255,255,0.15)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🚆</div>
          <div style={{ fontSize:16, fontWeight:700 }}>Railway Control System</div>
        </div>
        <h1 style={{ fontSize:36, fontWeight:800, lineHeight:1.2, marginBottom:16 }}>
          AI-Powered<br/>Traffic Control<br/>System
        </h1>
        <p style={{ fontSize:14, opacity:0.7, lineHeight:1.8, marginBottom:40, maxWidth:320 }}>
          Real-time monitoring and AI-assisted decision support for railway section controllers.
        </p>
        {["🔴 Live conflict detection","🤖 AI-powered suggestions","📊 Throughput analytics","🔒 Role-based secure access"].map(f=>(
          <div key={f} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#60a5fa", flexShrink:0 }} />
            <span style={{ fontSize:13, opacity:0.85 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Right Panel */}
      <div style={{ flex:1, background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", padding:40, borderRadius:"0 0 0 48px" }}>
        <div style={{ width:"100%", maxWidth:400 }}>
          <h2 style={{ fontSize:26, fontWeight:700, color:"#0f172a", marginBottom:6 }}>Welcome back</h2>
          <p style={{ fontSize:13, color:"#64748b", marginBottom:32 }}>Sign in to your controller account</p>

          {error && (
            <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:8, padding:"10px 14px", marginBottom:20, fontSize:13, color:"#b91c1c" }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Official Email</label>
            <input type="email" placeholder="you@railways.gov.in" value={email}
              onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              style={inp}
              onFocus={e=>e.target.style.borderColor="#2563eb"}
              onBlur={e=>e.target.style.borderColor="#d1d5db"} />
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Password</label>
            <div style={{ position:"relative" }}>
              <input type={showPass?"text":"password"} placeholder="Enter your password" value={password}
                onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                style={{ ...inp, paddingRight:44 }}
                onFocus={e=>e.target.style.borderColor="#2563eb"}
                onBlur={e=>e.target.style.borderColor="#d1d5db"} />
              <button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#9ca3af" }}
                onMouseEnter={e=>e.currentTarget.style.color="#374151"}
  onMouseLeave={e=>e.currentTarget.style.color="#64748b"}>
                {showPass ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)}
              </button>
            </div>
          </div>

          <button onClick={handleLogin} disabled={loading} style={{ width:"100%", padding:"12px", background:loading?"#93c5fd":"#1d4ed8", border:"none", borderRadius:8, color:"white", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer" }}
            onMouseEnter={e=>{if(!loading)e.target.style.background="#1e40af"}}
            onMouseLeave={e=>{if(!loading)e.target.style.background="#1d4ed8"}}>
            {loading?"Signing in...":"Sign In →"}
          </button>

         <div style={{ textAlign:"center", marginTop:20 }}>
    <span style={{ fontSize:13, color:"#64748b" }}>New employee? </span>
    <button onClick={onGoSignup} style={{ background:"none", border:"none", color:"#2563eb", fontSize:13, fontWeight:600, cursor:"pointer" }}>
        Request Access
    </button>
</div>

{/* Forgot Password Link */}
<div style={{ textAlign:"center", marginTop:10 }}>
    <button onClick={onForgotPassword} style={{ background:"none", border:"none", color:"#64748b", fontSize:13, cursor:"pointer", textDecoration:"underline" }}>
        Forgot Password?
    </button>
</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  SIGNUP PAGE
// ══════════════════════════════════════════════════════════
function ForgotPasswordPage({ onGoLogin }) {
  const [step,        setStep]        = useState(1); // 1=verify, 2=reset, 3=done
  const [empId,       setEmpId]       = useState("");
  const [email,       setEmail]       = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);

  const inp = {
    width:"100%", padding:"11px 14px",
    border:"1.5px solid #d1d5db", borderRadius:8,
    fontSize:14, color:"#111827", outline:"none",
    background:"#fff", boxSizing:"border-box"
  };

  // Step 1 — Verify identity
  const handleVerify = async () => {
    setError("");
    if (!empId || !email) { setError("Please enter both Employee ID and Email."); return; }
    setLoading(true);
    try {
      // Just check if user exists by trying a dummy reset call
      const res  = await fetch(`${API}/auth/reset-password`, {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({ emp_id:empId, email, new_password:"tempcheck123" })
      });
      const data = await res.json();
      if (res.ok) {
        // Temporarily set — will be overwritten in step 2
        setStep(2);
      } else {
        setError(data.detail || "No account found with these details.");
      }
    } catch { setError("Cannot connect to server."); }
    setLoading(false);
  };

  // Step 2 — Set new password
  const handleReset = async () => {
    setError("");
    if (!newPassword) { setError("Please enter a new password."); return; }
   // NEW:
const pwdCheck = validatePassword(newPassword);
if (!pwdCheck.isValid) {
  setError(`Weak password! Missing: ${pwdCheck.failed.join(", ")}`); return;
}
    if (newPassword !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({ emp_id:empId, email, new_password:newPassword })
      });
      const data = await res.json();
      if (res.ok) { setStep(3); }
      else        { setError(data.detail || "Reset failed. Try again."); }
    } catch { setError("Cannot connect to server."); }
    setLoading(false);
  };

  // Step 3 — Success screen
  if (step === 3) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f8fafc" }}>
      <div style={{ textAlign:"center", maxWidth:420, padding:40 }}>
        <div style={{ fontSize:64, marginBottom:20 }}>🎉</div>
        <h2 style={{ fontSize:24, fontWeight:700, color:"#0f172a", marginBottom:10 }}>
          Password Reset Successfully!
        </h2>
        <p style={{ fontSize:14, color:"#64748b", lineHeight:1.7, marginBottom:28 }}>
          Your password has been updated. You can now login with your new password.
        </p>
        <button onClick={onGoLogin} style={{ padding:"12px 32px", background:"#1d4ed8", border:"none", borderRadius:8, color:"white", fontSize:14, fontWeight:700, cursor:"pointer" }}>
          → Go to Login
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"linear-gradient(135deg,#1e3a5f 0%,#0f2540 100%)" }}>
      {/* Left Panel */}
      <div style={{ width:"45%", padding:"60px 48px", display:"flex", flexDirection:"column", justifyContent:"center", color:"white" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:48 }}>
          <div style={{ width:44, height:44, background:"rgba(255,255,255,0.15)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🚆</div>
          <div style={{ fontSize:16, fontWeight:700 }}>Railway Control System</div>
        </div>
        <div style={{ fontSize:64, marginBottom:20 }}>🔑</div>
        <h1 style={{ fontSize:32, fontWeight:800, lineHeight:1.2, marginBottom:16 }}>
          Reset Your<br/>Password
        </h1>
        <p style={{ fontSize:14, opacity:0.7, lineHeight:1.8, maxWidth:320 }}>
          {step === 1
            ? "Enter your Employee ID and registered email to verify your identity."
            : "Create a strong new password for your account."}
        </p>

        {/* Steps indicator */}
        <div style={{ marginTop:40, display:"flex", flexDirection:"column", gap:16 }}>
          {[
            { n:1, label:"Verify Identity",   desc:"Enter Employee ID + Email" },
            { n:2, label:"Set New Password",  desc:"Choose a strong password" },
            { n:3, label:"Done!",             desc:"Login with new password" },
          ].map(s=>(
            <div key={s.n} style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background: step>=s.n ? "#2563eb":"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, flexShrink:0 }}>
                {step>s.n ? "✓" : s.n}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, opacity: step>=s.n?1:0.5 }}>{s.label}</div>
                <div style={{ fontSize:11, opacity:0.5 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ flex:1, background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", padding:40, borderRadius:"0 0 0 48px" }}>
        <div style={{ width:"100%", maxWidth:400 }}>

          {/* Step 1 — Verify */}
          {step===1 && (
            <>
              <h2 style={{ fontSize:24, fontWeight:700, color:"#0f172a", marginBottom:6 }}>Verify Your Identity</h2>
              <p style={{ fontSize:13, color:"#64748b", marginBottom:32 }}>Enter your registered details to continue</p>

              {error && <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:8, padding:"10px 14px", marginBottom:20, fontSize:13, color:"#b91c1c" }}>⚠️ {error}</div>}

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Employee ID</label>
                <input placeholder="RC001" value={empId} onChange={e=>setEmpId(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleVerify()}
                  style={inp}
                  onFocus={e=>e.target.style.borderColor="#2563eb"}
                  onBlur={e=>e.target.style.borderColor="#d1d5db"} />
              </div>

              <div style={{ marginBottom:28 }}>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Registered Email</label>
                <input type="email" placeholder="you@railways.gov.in" value={email} onChange={e=>setEmail(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleVerify()}
                  style={inp}
                  onFocus={e=>e.target.style.borderColor="#2563eb"}
                  onBlur={e=>e.target.style.borderColor="#d1d5db"} />
              </div>

              <button onClick={handleVerify} disabled={loading} style={{ width:"100%", padding:"12px", background:loading?"#93c5fd":"#1d4ed8", border:"none", borderRadius:8, color:"white", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer" }}
                onMouseEnter={e=>{if(!loading)e.target.style.background="#1e40af"}}
                onMouseLeave={e=>{if(!loading)e.target.style.background="#1d4ed8"}}>
                {loading?"Verifying...":"Verify Identity →"}
              </button>

              <div style={{ textAlign:"center", marginTop:20 }}>
                <button onClick={onGoLogin} style={{ background:"none", border:"none", color:"#2563eb", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  ← Back to Login
                </button>
              </div>
            </>
          )}

          {/* Step 2 — New Password */}
          {step===2 && (
            <>
              <h2 style={{ fontSize:24, fontWeight:700, color:"#0f172a", marginBottom:6 }}>Set New Password</h2>
              <p style={{ fontSize:13, color:"#64748b", marginBottom:8 }}>Identity verified for <strong>{empId}</strong></p>

              <div style={{ background:"#dcfce7", border:"1px solid #86efac", borderRadius:8, padding:"8px 14px", marginBottom:24, fontSize:12, color:"#15803d" }}>
                ✅ Identity verified successfully!
              </div>

              {error && <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:8, padding:"10px 14px", marginBottom:20, fontSize:13, color:"#b91c1c" }}>⚠️ {error}</div>}

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>New Password</label>
                <input type="password" placeholder="Min 6 characters" value={newPassword} onChange={e=>setNewPassword(e.target.value)}
                  style={inp}
                  onFocus={e=>e.target.style.borderColor="#2563eb"}
                  onBlur={e=>e.target.style.borderColor="#d1d5db"} />
                {/* Password strength */}
                <input type="password" 
  placeholder="Min 8 characters" 
  value={newPassword} 
  onChange={e=>setNewPassword(e.target.value)}
  style={inp}
  onFocus={e=>e.target.style.borderColor="#2563eb"}
  onBlur={e=>e.target.style.borderColor="#d1d5db"} />

{/* ← ADD THIS LINE RIGHT HERE */}
<PasswordStrengthBar password={newPassword} />

                {newPassword.length>0 && (
                  <div style={{ marginTop:6 }}>
                    <div style={{ height:4, background:"#f1f5f9", borderRadius:2, overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:2, transition:"width 0.3s",
                        width: newPassword.length<6?"30%":newPassword.length<10?"60%":"100%",
                        background: newPassword.length<6?"#ef4444":newPassword.length<10?"#f59e0b":"#16a34a"
                      }} />
                    </div>
                    <span style={{ fontSize:11, color: newPassword.length<6?"#ef4444":newPassword.length<10?"#f59e0b":"#16a34a" }}>
                      {newPassword.length<6?"Weak":newPassword.length<10?"Medium":"Strong"} password
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom:28 }}>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Confirm New Password</label>
                <input type="password" placeholder="Repeat new password" value={confirm} onChange={e=>setConfirm(e.target.value)}
                  style={{ ...inp, borderColor: confirm && confirm!==newPassword?"#ef4444":"#d1d5db" }}
                  onFocus={e=>e.target.style.borderColor="#2563eb"}
                  onBlur={e=>e.target.style.borderColor= confirm!==newPassword?"#ef4444":"#d1d5db"} />
                {confirm && confirm!==newPassword && (
                  <p style={{ fontSize:11, color:"#ef4444", marginTop:4 }}>Passwords do not match</p>
                )}
              </div>

              <button onClick={handleReset} disabled={loading} style={{ width:"100%", padding:"12px", background:loading?"#93c5fd":"#1d4ed8", border:"none", borderRadius:8, color:"white", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer" }}
                onMouseEnter={e=>{if(!loading)e.target.style.background="#1e40af"}}
                onMouseLeave={e=>{if(!loading)e.target.style.background="#1d4ed8"}}>
                {loading?"Resetting...":"Reset Password →"}
              </button>

              <div style={{ textAlign:"center", marginTop:16 }}>
                <button onClick={()=>setStep(1)} style={{ background:"none", border:"none", color:"#64748b", fontSize:13, cursor:"pointer" }}>
                  ← Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function SignupPage({ onGoLogin }) {
  const [name,      setName]      = useState("");
  const [empId,     setEmpId]     = useState("");
  const [email,     setEmail]     = useState("");
  const [division,  setDivision]  = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!name || !empId || !email || !password) {
      setError("Please fill all required fields."); return;
    }
    if (password !== confirm) {
      setError("Passwords do not match."); return;
    }
   // NEW:
const pwdCheck = validatePassword(password);
if (!pwdCheck.isValid) {
  setError(`Weak password! Missing: ${pwdCheck.failed.join(", ")}`); return;
}
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/signup`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ emp_id:empId, name, email, password, division:division||"Southern Railway" })
      });
      const data = await res.json();
      if (res.ok) { setSubmitted(true); }
      else        { setError(data.detail || "Signup failed. Try again."); }
    } catch { setError("Cannot connect to server. Is backend running?"); }
    setLoading(false);
  };

  const inp = {
    width:"100%", padding:"10px 13px",
    border:"1.5px solid #d1d5db", borderRadius:8,
    fontSize:13, color:"#111827", outline:"none",
    background:"#fff", boxSizing:"border-box"
  };

  if (submitted) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f8fafc" }}>
      <div style={{ textAlign:"center", maxWidth:420, padding:40 }}>
        <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
        <h2 style={{ fontSize:22, fontWeight:700, color:"#0f172a", marginBottom:10 }}>Request Submitted!</h2>
        <p style={{ fontSize:14, color:"#64748b", lineHeight:1.7, marginBottom:12 }}>
          Your request has been saved. Admin will review and approve your account.
        </p>
        <div style={{ background:"#fef9c3", border:"1px solid #fbbf24", borderRadius:8, padding:"12px 16px", marginBottom:24, fontSize:13, color:"#92400e" }}>
          ⏳ Please wait for admin approval before trying to login.
        </div>
        <button onClick={onGoLogin} style={{ padding:"11px 28px", background:"#1d4ed8", border:"none", borderRadius:8, color:"white", fontSize:14, fontWeight:600, cursor:"pointer" }}>
          ← Back to Login
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:500 }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🛂</div>
          <h1 style={{ fontSize:22, fontWeight:700, color:"#0f172a", marginBottom:4 }}>Request System Access</h1>
          <p style={{ fontSize:13, color:"#64748b" }}>Submit your details — admin will assign your role</p>
        </div>

        <Card style={{ padding:28 }}>
          {error && (
            <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:8, padding:"10px 14px", marginBottom:18, fontSize:13, color:"#b91c1c" }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"10px 14px", marginBottom:18, fontSize:12, color:"#1d4ed8" }}>
            ℹ️ Your role will be assigned by the Divisional Manager after review.
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>Full Name *</label>
              <input placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>Employee ID *</label>
              <input placeholder="RC004" value={empId} onChange={e=>setEmpId(e.target.value)} style={inp} />
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>Official Email *</label>
            <input type="email" placeholder="you@railways.gov.in" value={email} onChange={e=>setEmail(e.target.value)} style={inp} />
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>Railway Division</label>
            <select value={division} onChange={e=>setDivision(e.target.value)} style={{ ...inp, appearance:"none" }}>
              <option value="">Select division</option>
              <option>Southern</option>
              <option>Central</option>
              <option>Western</option>
              <option>Northern</option>
              <option>Eastern</option>
            </select>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:24 }}>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>Password *</label>
             <input type="password" placeholder="Min 8 characters" value={password} onChange={e=>setPassword(e.target.value)} style={inp} />
<PasswordStrengthBar password={password} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>Confirm Password *</label>
              <input type="password" placeholder="Repeat password" value={confirm} onChange={e=>setConfirm(e.target.value)} style={inp} />
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading} style={{ width:"100%", padding:"12px", background:loading?"#93c5fd":"#1d4ed8", border:"none", borderRadius:8, color:"white", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer" }}>
            {loading?"Submitting...":"Submit Request →"}
          </button>

          <div style={{ textAlign:"center", marginTop:14 }}>
            <span style={{ fontSize:13, color:"#64748b" }}>Already have access? </span>
            <button onClick={onGoLogin} style={{ background:"none", border:"none", color:"#2563eb", fontSize:13, fontWeight:600, cursor:"pointer" }}>Sign In</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  ADMIN PORTAL
// ══════════════════════════════════════════════════════════
function AdminPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [users,     setUsers]     = useState([]);
  const [pending,   setPending]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [approving, setApproving] = useState("");

  const fetchData = async () => {
    try {
      const [u,p] = await Promise.all([
        fetch(`${API}/admin/users`).then(r=>r.json()),
        fetch(`${API}/admin/pending`).then(r=>r.json()),
      ]);
      setUsers(u.users||[]); setPending(p.pending_users||[]);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(()=>{ fetchData(); const iv=setInterval(fetchData,10000); return()=>clearInterval(iv); },[]);

  const handleApprove = async (emp_id) => {
    const role     = document.getElementById(`role-${emp_id}`)?.value || "Section Controller";
    const division = document.getElementById(`div-${emp_id}`)?.value  || "Southern Railway";
    setApproving(emp_id);
    try {
      const res  = await fetch(`${API}/admin/approve`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({emp_id,role,division}) });
      const data = await res.json();
      if (res.ok) { setActionMsg(`✅ ${emp_id} approved as ${role}`); fetchData(); }
      else        { setActionMsg(`❌ ${data.detail}`); }
    } catch { setActionMsg("❌ Cannot connect."); }
    setApproving(""); setTimeout(()=>setActionMsg(""),3000);
  };

  const handleReject = async (emp_id) => {
    if (!window.confirm(`Reject ${emp_id}?`)) return;
    try {
      const res  = await fetch(`${API}/admin/reject`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({emp_id}) });
      const data = await res.json();
      if (res.ok) { setActionMsg(`❌ ${emp_id} rejected.`); fetchData(); }
    } catch { setActionMsg("❌ Error."); }
    setTimeout(()=>setActionMsg(""),3000);
  };

  const approved = users.filter(u=>u.status==="approved");
  const rejected = users.filter(u=>u.status==="rejected");

  const navItems = [
    { key:"overview", icon:"⊞", label:"Overview" },
    { key:"pending",  icon:"🕐", label:"Pending Approvals", badge:pending.length },
    { key:"users",    icon:"👥", label:"All Users" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f1f5f9" }}>
      {/* Sidebar */}
      <div style={{ width:220, minHeight:"100vh", background:"#1e1b4b", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, background:"#4f46e5", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🛡️</div>
            <div>
              <div style={{ color:"white", fontSize:13, fontWeight:700 }}>Admin Portal</div>
              <div style={{ color:"rgba(255,255,255,0.4)", fontSize:10 }}>Railway Control</div>
            </div>
          </div>
        </div>
        <nav style={{ padding:"16px 12px", flex:1 }}>
          {navItems.map(item=>(
            <button key={item.key} onClick={()=>setActiveTab(item.key)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, border:"none", background:activeTab===item.key?"rgba(99,102,241,0.3)":"transparent", color:activeTab===item.key?"#a5b4fc":"rgba(255,255,255,0.55)", fontSize:13, fontWeight:activeTab===item.key?600:400, cursor:"pointer", marginBottom:2, textAlign:"left", borderLeft:activeTab===item.key?"3px solid #6366f1":"3px solid transparent", position:"relative" }}>
              <span style={{ fontSize:15 }}>{item.icon}</span>{item.label}
              {item.badge>0&&<span style={{ marginLeft:"auto", background:"#ef4444", color:"white", borderRadius:"50%", width:18, height:18, fontSize:10, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding:"16px 12px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"rgba(255,255,255,0.05)", borderRadius:8, marginBottom:8 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"#4f46e5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>👑</div>
            <div>
              <div style={{ color:"white", fontSize:12, fontWeight:600 }}>{user.name}</div>
              <div style={{ color:"rgba(255,255,255,0.4)", fontSize:10 }}>Divisional Manager</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ width:"100%", padding:"9px", background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:8, color:"#fca5a5", fontSize:12, fontWeight:600, cursor:"pointer" }}>Sign Out</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        <div style={{ height:56, background:"#fff", borderBottom:"1px solid #e5e7eb", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px" }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, color:"#0f172a" }}>{activeTab==="overview"?"Admin Overview":activeTab==="pending"?"Pending Approvals":"All Users"}</h2>
            <p style={{ fontSize:11, color:"#94a3b8" }}>Railway Control System · Admin Panel</p>
          </div>
          {pending.length>0&&<div style={{ background:"#fef9c3", padding:"5px 12px", borderRadius:20, border:"1px solid #fbbf24" }}><span style={{ fontSize:12, fontWeight:600, color:"#92400e" }}>⏳ {pending.length} pending</span></div>}
        </div>

        <main style={{ flex:1, padding:"24px", overflowY:"auto" }}>
          {actionMsg&&<div style={{ background:actionMsg.startsWith("✅")?"#dcfce7":"#fee2e2", border:`1px solid ${actionMsg.startsWith("✅")?"#86efac":"#fca5a5"}`, borderRadius:8, padding:"10px 16px", marginBottom:16, fontSize:13, color:actionMsg.startsWith("✅")?"#15803d":"#b91c1c", fontWeight:600 }}>{actionMsg}</div>}

          {loading?<Card style={{ padding:40, textAlign:"center" }}><p style={{ color:"#64748b" }}>Loading...</p></Card>:(
            <>
              {/* Overview */}
              {activeTab==="overview"&&(
                <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
                    {[{label:"Total Users",value:users.length,icon:"👥",color:"#1d4ed8",bg:"#dbeafe"},{label:"Approved",value:approved.length,icon:"✅",color:"#16a34a",bg:"#dcfce7"},{label:"Pending",value:pending.length,icon:"⏳",color:"#d97706",bg:"#fef9c3"},{label:"Rejected",value:rejected.length,icon:"❌",color:"#dc2626",bg:"#fee2e2"}].map(s=>(
                      <Card key={s.label} style={{ padding:"20px 22px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div><p style={{ fontSize:11, color:"#64748b", fontWeight:500, marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>{s.label}</p><p style={{ fontSize:32, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</p></div>
                          <div style={{ width:42, height:42, borderRadius:10, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{s.icon}</div>
                        </div>
                      </Card>
                    ))}
                  </div>
                  {pending.length>0&&(
                    <Card style={{ border:"2px solid #fbbf24" }}>
                      <div style={{ padding:"14px 20px", background:"#fffbeb", borderRadius:"12px 12px 0 0", borderBottom:"1px solid #fef9c3", display:"flex", justifyContent:"space-between" }}>
                        <h3 style={{ fontSize:14, fontWeight:700, color:"#92400e" }}>⏳ Needs Attention</h3>
                        <button onClick={()=>setActiveTab("pending")} style={{ background:"none", border:"1px solid #f59e0b", borderRadius:6, padding:"4px 12px", color:"#d97706", fontSize:12, fontWeight:600, cursor:"pointer" }}>View All →</button>
                      </div>
                      <div style={{ padding:"0 20px" }}>
                        {pending.slice(0,3).map((u,i)=>(
                          <div key={u.emp_id} style={{ padding:"12px 0", borderBottom:i<Math.min(pending.length,3)-1?"1px solid #f1f5f9":"none", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <div><div style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>{u.name}</div><div style={{ fontSize:12, color:"#64748b" }}>{u.email}</div></div>
                            <Badge text="Pending" color="yellow" />
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* Pending */}
              {activeTab==="pending"&&(
                pending.length===0
                  ?<Card style={{ padding:"60px 20px", textAlign:"center" }}><div style={{ fontSize:48, marginBottom:16 }}>🎉</div><h3 style={{ fontSize:18, fontWeight:700, color:"#0f172a" }}>All Caught Up!</h3><p style={{ fontSize:14, color:"#64748b", marginTop:8 }}>No pending requests.</p></Card>
                  :<div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    {pending.map(u=>(
                      <Card key={u.emp_id} style={{ padding:"20px 24px", border:"1.5px solid #fbbf24" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
                          <div style={{ display:"flex", gap:14 }}>
                            <div style={{ width:44, height:44, borderRadius:"50%", background:"#fef9c3", border:"2px solid #fbbf24", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>👤</div>
                            <div>
                              <div style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>{u.name}</div>
                              <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{u.email}</div>
                              <div style={{ display:"flex", gap:8, marginTop:6 }}>
                                <span style={{ fontSize:11, padding:"2px 8px", background:"#f1f5f9", borderRadius:4, color:"#475569", fontWeight:600 }}>{u.emp_id}</span>
                                <span style={{ fontSize:11, padding:"2px 8px", background:"#f1f5f9", borderRadius:4, color:"#475569" }}>Requested: {u.created_at?.split(" ")[0]}</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                            <div>
                              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#64748b", marginBottom:4 }}>Assign Role</label>
                              <select id={`role-${u.emp_id}`} defaultValue="Section Controller" style={{ padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, color:"#374151", outline:"none", background:"#fff" }}>
                                {["Section Controller","Traffic Controller","Station Master"].map(r=><option key={r}>{r}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#64748b", marginBottom:4 }}>Division</label>
                              <select id={`div-${u.emp_id}`} defaultValue="Southern Railway" style={{ padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, color:"#374151", outline:"none", background:"#fff" }}>
                                {["Southern Railway","Central Railway","Western Railway","Northern Railway","Eastern Railway"].map(d=><option key={d}>{d}</option>)}
                              </select>
                            </div>
                            <div style={{ display:"flex", gap:8, alignItems:"flex-end", paddingBottom:1 }}>
                              <button onClick={()=>handleApprove(u.emp_id)} disabled={approving===u.emp_id} style={{ padding:"8px 16px", background:"#16a34a", border:"none", borderRadius:8, color:"white", fontSize:13, fontWeight:600, cursor:"pointer" }}>{approving===u.emp_id?"...":"✅ Approve"}</button>
                              <button onClick={()=>handleReject(u.emp_id)} style={{ padding:"8px 16px", background:"#dc2626", border:"none", borderRadius:8, color:"white", fontSize:13, fontWeight:600, cursor:"pointer" }}>❌ Reject</button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
              )}

              {/* All Users */}
              {activeTab==="users"&&(
                <Card>
                  <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <h3 style={{ fontSize:14, fontWeight:700, color:"#0f172a" }}>👥 All Registered Users</h3>
                    <Badge text={`${users.length} Total`} color="blue" />
                  </div>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead><tr style={{ background:"#f8fafc" }}>
                        {["#","Emp ID","Name","Email","Role","Division","Status","Joined"].map(h=>(
                          <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5, whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {users.map((u,i)=>(
                          <tr key={u.emp_id} style={{ borderTop:"1px solid #f1f5f9" }}>
                            <td style={{ padding:"12px 16px", fontSize:13, color:"#94a3b8" }}>{i+1}</td>
                            <td style={{ padding:"12px 16px" }}><span style={{ fontSize:13, fontWeight:700, color:"#1d4ed8", fontFamily:"monospace" }}>{u.emp_id}</span></td>
                            <td style={{ padding:"12px 16px" }}><div style={{ display:"flex", alignItems:"center", gap:8 }}><div style={{ width:30, height:30, borderRadius:"50%", background:"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>👤</div><span style={{ fontSize:13, fontWeight:600 }}>{u.name}</span></div></td>
                            <td style={{ padding:"12px 16px", fontSize:13, color:"#475569" }}>{u.email}</td>
                            <td style={{ padding:"12px 16px" }}><Badge text={u.role} color={u.role==="Divisional Manager"?"purple":u.role==="Section Controller"?"blue":u.role==="Traffic Controller"?"green":"yellow"} /></td>
                            <td style={{ padding:"12px 16px", fontSize:13, color:"#475569" }}>{u.division}</td>
                            <td style={{ padding:"12px 16px" }}><Badge text={u.status||"approved"} color={u.status==="pending"?"yellow":u.status==="rejected"?"red":"green"} /></td>
                            <td style={{ padding:"12px 16px", fontSize:12, color:"#94a3b8" }}>{u.created_at?.split(" ")[0]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  DASHBOARD COMPONENTS
// ══════════════════════════════════════════════════════════
function StatCard({ label, value, sub, icon, accent }) {
  return (
    <Card style={{ padding:"20px 22px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <p style={{ fontSize:11, color:"#64748b", fontWeight:500, marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</p>
          <p style={{ fontSize:30, fontWeight:800, color:accent||"#0f172a", lineHeight:1 }}>{value}</p>
          {sub&&<p style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>{sub}</p>}
        </div>
        <div style={{ width:42, height:42, borderRadius:10, background:`${accent}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{icon}</div>
      </div>
    </Card>
  );
}

function TrackMap({ trains, conflicts }) {
  const cids    = new Set(conflicts.flatMap(c=>[c.train_a,c.train_b]));
  const [hovered, setHovered] = useState(null);
  return (
    <Card style={{ padding:"20px 24px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:"#0f172a" }}>🗺️ Live Track Map</h3>
        <span style={{ fontSize:12, color:"#64748b" }}>Chennai Central → Trichy Junction (336 km)</span>
      </div>
      <div style={{ position:"relative", padding:"44px 12px 52px", background:"#f8fafc", borderRadius:8, border:"1px solid #f1f5f9" }}>
        <div style={{ position:"absolute", left:12, right:12, top:"50%", height:4, background:"linear-gradient(90deg,#1d4ed8,#3b82f6,#1d4ed8)", borderRadius:2, transform:"translateY(-50%)" }} />
        {STATIONS.map(s=>(
          <div key={s.name} style={{ position:"absolute", left:`calc(${(s.km/336)*100}% + 12px)`, top:"50%", transform:"translate(-50%,-50%)", display:"flex", flexDirection:"column", alignItems:"center", zIndex:2 }}>
            <div style={{ fontSize:10, color:"#1d4ed8", fontWeight:700, whiteSpace:"nowrap", marginBottom:30, background:"#eff6ff", padding:"3px 8px", borderRadius:6, border:"1px solid #bfdbfe" }}>{s.short}</div>
            <div style={{ width:14, height:14, borderRadius:"50%", background:"#fff", border:"3px solid #1d4ed8", boxShadow:"0 0 0 3px #dbeafe" }} />
            <div style={{ fontSize:9, color:"#94a3b8", marginTop:28 }}>{s.km}km</div>
          </div>
        ))}
        {trains.map((train,i)=>{
          const isC=cids.has(train.id); const col=isC?"#dc2626":TRAIN_COLORS[i];
          return (
            <div key={train.id} style={{ position:"absolute", left:`calc(${(train.position_km/336)*100}% + 12px)`, top:"50%", transform:"translate(-50%,-50%)", zIndex:10, transition:"left 1.2s ease", cursor:"pointer" }}
              onMouseEnter={()=>setHovered(train.id)} onMouseLeave={()=>setHovered(null)}>
              {isC&&<div style={{ position:"absolute", inset:-8, borderRadius:"50%", border:`2px solid ${col}`, animation:"ping 1.2s ease infinite", opacity:0.5 }} />}
              <div style={{ width:28, height:28, borderRadius:"50%", background:col, border:"3px solid #fff", boxShadow:`0 3px 10px ${col}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, position:"relative" }}>
                🚂
                <div style={{ position:"absolute", bottom:32, left:"50%", transform:"translateX(-50%)", background:"#0f172a", color:"#fff", fontSize:9, padding:"2px 6px", borderRadius:4, whiteSpace:"nowrap", fontWeight:700 }}>{train.id}</div>
              </div>
              {hovered===train.id&&(
                <div style={{ position:"absolute", bottom:52, left:"50%", transform:"translateX(-50%)", background:"#0f172a", color:"white", borderRadius:8, padding:"10px 14px", whiteSpace:"nowrap", zIndex:20, boxShadow:"0 4px 12px rgba(0,0,0,0.3)", minWidth:170 }}>
                  <div style={{ fontSize:12, fontWeight:700, marginBottom:6, borderBottom:"1px solid rgba(255,255,255,0.1)", paddingBottom:6 }}>{train.name}</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginBottom:3 }}>📍 {train.current_station}</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginBottom:3 }}>⚡ {train.speed_kmh} km/h</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginBottom:3 }}>📏 {train.position_km} km</div>
                  {train.train_number&&<div style={{ fontSize:11, color:"#60a5fa", marginBottom:3 }}>🚂 Train #{train.train_number}</div>}
                  <div style={{ fontSize:11, color:train.delay_minutes>5?"#fbbf24":"#34d399" }}>{train.delay_minutes>5?`⚠ +${train.delay_minutes}m delay`:"✅ On time"}</div>
                  {train.source&&<div style={{ fontSize:10, color:"#6b7280", marginTop:4 }}>{train.source}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:16, flexWrap:"wrap", paddingTop:12, marginTop:8, borderTop:"1px solid #f1f5f9" }}>
        {trains.map((t,i)=>{ const isC=cids.has(t.id); const col=isC?"#dc2626":TRAIN_COLORS[i]; return (
          <div key={t.id} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:col }} />
            <span style={{ fontSize:11, color:"#475569" }}>{t.name}</span>
          </div>
        ); })}
      </div>
    </Card>
  );
}

function ThroughputChart({ analytics }) {
  if (!analytics) return (
    <Card style={{ padding:"20px 24px", display:"flex", alignItems:"center", justifyContent:"center", minHeight:200 }}>
      <p style={{ color:"#94a3b8", fontSize:13 }}>Loading analytics...</p>
    </Card>
  );
  const { without_ai, with_ai, labels } = analytics.throughput;
  const maxVal = Math.max(...with_ai, ...without_ai, 1);
  return (
    <Card style={{ padding:"20px 24px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <h3 style={{ fontSize:14, fontWeight:700, color:"#0f172a" }}>📊 Throughput: Before vs After AI</h3>
          <p style={{ fontSize:12, color:"#64748b", marginTop:2 }}>Trains per hour on section</p>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:22, fontWeight:800, color:"#16a34a" }}>+{analytics.summary.improvement_pct}%</div>
          <div style={{ fontSize:11, color:"#64748b" }}>AI Improvement</div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:140, padding:"0 4px" }}>
        {labels.map((label,i)=>(
          <div key={label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <div style={{ width:"100%", display:"flex", gap:2, alignItems:"flex-end", height:120 }}>
              <div style={{ flex:1, background:"#fca5a5", borderRadius:"3px 3px 0 0", height:`${(without_ai[i]/maxVal)*100}%`, minHeight:4 }} />
              <div style={{ flex:1, background:"#4ade80", borderRadius:"3px 3px 0 0", height:`${(with_ai[i]/maxVal)*100}%`, minHeight:4 }} />
            </div>
            <div style={{ fontSize:8, color:"#94a3b8", whiteSpace:"nowrap" }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:16, marginTop:12, justifyContent:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:12, height:12, background:"#fca5a5", borderRadius:2 }} /><span style={{ fontSize:12, color:"#64748b" }}>Without AI ({analytics.summary.avg_without_ai}/hr)</span></div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:12, height:12, background:"#4ade80", borderRadius:2 }} /><span style={{ fontSize:12, color:"#64748b" }}>With AI ({analytics.summary.avg_with_ai}/hr)</span></div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:16 }}>
        <div style={{ background:"#fee2e2", borderRadius:8, padding:"12px 16px", textAlign:"center" }}>
          <div style={{ fontSize:20, fontWeight:800, color:"#dc2626" }}>{analytics.summary.avg_without_ai}</div>
          <div style={{ fontSize:11, color:"#64748b" }}>Avg/hr (Manual)</div>
        </div>
        <div style={{ background:"#dcfce7", borderRadius:8, padding:"12px 16px", textAlign:"center" }}>
          <div style={{ fontSize:20, fontWeight:800, color:"#16a34a" }}>{analytics.summary.avg_with_ai}</div>
          <div style={{ fontSize:11, color:"#64748b" }}>Avg/hr (AI)</div>
        </div>
      </div>
    </Card>
  );
}

function SpeedDelayChart({ trains }) {
  if (!trains.length) return null;
  const maxSpeed = Math.max(...trains.map(t=>t.speed_kmh), 100);
  return (
    <Card style={{ padding:"20px 24px" }}>
      <h3 style={{ fontSize:14, fontWeight:700, color:"#0f172a", marginBottom:4 }}>📈 Train Speed & Delay</h3>
      <p style={{ fontSize:12, color:"#64748b", marginBottom:16 }}>Current status per train</p>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {trains.map((train,i)=>(
          <div key={train.id}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:12, color:"#374151", fontWeight:600 }}>{train.name.split(" ")[0]}</span>
              <div style={{ display:"flex", gap:8 }}>
                <span style={{ fontSize:11, color:"#2563eb", fontWeight:600 }}>{train.speed_kmh} km/h</span>
                <span style={{ fontSize:11, color:train.delay_minutes>5?"#d97706":"#16a34a", fontWeight:600 }}>
                  {train.delay_minutes>5?`+${train.delay_minutes}m`:"On time"}
                </span>
              </div>
            </div>
            <div style={{ height:8, background:"#f1f5f9", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${(train.speed_kmh/maxSpeed)*100}%`, background:TRAIN_COLORS[i], borderRadius:4, transition:"width 1s ease" }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TrainTable({ trains, conflicts }) {
  const cids = new Set(conflicts.flatMap(c=>[c.train_a,c.train_b]));
  return (
    <Card>
      <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:"#0f172a" }}>🚂 Live Train Status</h3>
        <Badge text={`${trains.length} Active`} color="blue" />
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ background:"#f8fafc" }}>
            {["Train ID","Train No.","Name","Station","Position","Speed","Delay","Source","Status"].map(h=>(
              <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5, whiteSpace:"nowrap" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {trains.map((train,i)=>{ const isC=cids.has(train.id); const col=isC?"#dc2626":TRAIN_COLORS[i]; return (
              <tr key={train.id} style={{ borderTop:"1px solid #f1f5f9", background:isC?"#fff5f5":"transparent" }}>
                <td style={{ padding:"12px 16px" }}><div style={{ display:"flex", alignItems:"center", gap:8 }}><div style={{ width:10, height:10, borderRadius:"50%", background:col }} /><span style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{train.id}</span></div></td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"#1d4ed8", fontFamily:"monospace", fontWeight:600 }}>{train.train_number||"—"}</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"#374151" }}>{train.name}</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"#374151" }}>{train.current_station}</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"#374151" }}>
                  <div>{train.position_km} km</div>
                  <div style={{ height:3, background:"#e2e8f0", borderRadius:2, marginTop:4, width:60 }}><div style={{ height:"100%", width:`${(train.position_km/336)*100}%`, background:col, borderRadius:2 }} /></div>
                </td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"#374151" }}>{train.speed_kmh} km/h</td>
                <td style={{ padding:"12px 16px" }}><Badge text={train.delay_minutes>5?`+${train.delay_minutes}m`:"On Time"} color={train.delay_minutes>5?"yellow":"green"} /></td>
                <td style={{ padding:"12px 16px" }}><Badge text={train.source==="REAL_API ✅"?"Real API":"Simulated"} color={train.source==="REAL_API ✅"?"green":"yellow"} /></td>
                <td style={{ padding:"12px 16px" }}>{isC?<Badge text="⚠ Conflict" color="red"/>:<Badge text="Normal" color="green"/>}</td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Sidebar({ activeTab, setActiveTab, user, onLogout, conflictCount }) {
  const navItems = [
    { key:"overview",  icon:"⊞",  label:"Overview" },
    { key:"trains",    icon:"🚂", label:"Live Trains" },
    { key:"map",       icon:"🗺️", label:"Track Map" },
    { key:"analytics", icon:"📊", label:"Analytics" },
    { key:"conflicts", icon:"⚠️", label:"Conflicts", badge:conflictCount },
    { key:"ai",        icon:"🤖", label:"AI Suggestions" },
    { key:"profile",   icon:"👤", label:"My Profile" },
  ];
  return (
    <div style={{ width:220, minHeight:"100vh", background:"#0f2540", display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, background:"#1d4ed8", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🚆</div>
          <div style={{ color:"white", fontSize:13, fontWeight:700 }}>Railway Control</div>
        </div>
      </div>
      <nav style={{ padding:"16px 12px", flex:1 }}>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:1.5, textTransform:"uppercase", padding:"0 8px", marginBottom:8 }}>Main Menu</div>
        {navItems.map(item=>(
          <button key={item.key} onClick={()=>setActiveTab(item.key)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, border:"none", background:activeTab===item.key?"rgba(37,99,235,0.25)":"transparent", color:activeTab===item.key?"#93c5fd":"rgba(255,255,255,0.55)", fontSize:13, fontWeight:activeTab===item.key?600:400, cursor:"pointer", marginBottom:2, textAlign:"left", borderLeft:activeTab===item.key?"3px solid #3b82f6":"3px solid transparent", position:"relative" }}>
            <span style={{ fontSize:15 }}>{item.icon}</span>{item.label}
            {item.badge>0&&<span style={{ marginLeft:"auto", background:"#ef4444", color:"white", borderRadius:"50%", width:18, height:18, fontSize:10, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{item.badge}</span>}
          </button>
        ))}
      </nav>
      <div style={{ padding:"16px 12px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"rgba(255,255,255,0.05)", borderRadius:8, marginBottom:8 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"#1d4ed8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>👤</div>
          <div style={{ overflow:"hidden" }}>
            <div style={{ color:"white", fontSize:12, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user.name}</div>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:10 }}>{user.role}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width:"100%", padding:"9px", background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:8, color:"#fca5a5", fontSize:12, fontWeight:600, cursor:"pointer" }}>Sign Out</button>
      </div>
    </div>
  );
}
function ChangePasswordSection({ empId }) {
  const [open,        setOpen]        = useState(false);
  const [oldPass,     setOldPass]     = useState("");
  const [newPass,     setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");
  const [loading,     setLoading]     = useState(false);

  const inp = {
    width:"100%", padding:"10px 13px",
    border:"1.5px solid #d1d5db", borderRadius:8,
    fontSize:13, color:"#111827", outline:"none",
    background:"#fff", boxSizing:"border-box"
  };

  const handleChange = async () => {
    setError(""); setSuccess("");
    if (!oldPass || !newPass || !confirmPass) {
      setError("Please fill all fields."); return;
    }
    if (newPass !== confirmPass) {
      setError("New passwords do not match."); return;
    }
    if (newPass.length < 6) {
      setError("New password must be at least 6 characters."); return;
    }
    if (oldPass === newPass) {
      setError("New password must be different from current password."); return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/change-password`, {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({
          emp_id:       empId,
          old_password: oldPass,
          new_password: newPass
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("✅ Password changed successfully!");
        setOldPass(""); setNewPass(""); setConfirmPass("");
        setOpen(false);
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError(data.detail || "Failed to change password.");
      }
    } catch { setError("Cannot connect to server."); }
    setLoading(false);
  };

  return (
    <div>
      {/* Success message */}
      {success && (
        <div style={{ background:"#dcfce7", border:"1px solid #86efac", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#15803d", fontWeight:600 }}>
          {success}
        </div>
      )}

      {/* Password row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", background:"#f8fafc", borderRadius:10, border:"1px solid #f1f5f9", marginBottom: open?12:0 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>Password</div>
          <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>Keep your account secure</div>
        </div>
        <button
          onClick={() => { setOpen(!open); setError(""); }}
          style={{ padding:"7px 16px", background: open?"#f1f5f9":"#1d4ed8", border:`1px solid ${open?"#e2e8f0":"#1d4ed8"}`, borderRadius:8, color: open?"#64748b":"white", fontSize:12, fontWeight:600, cursor:"pointer" }}>
          {open ? "Cancel" : "🔒 Change Password"}
        </button>
      </div>

      {/* Change Password Form */}
      {open && (
        <div style={{ padding:"20px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0" }}>
          {error && (
            <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:8, padding:"8px 12px", marginBottom:14, fontSize:12, color:"#b91c1c" }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom:12 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:5 }}>Current Password</label>
            <input type="password" placeholder="Enter current password" value={oldPass} onChange={e=>setOldPass(e.target.value)} style={inp} />
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:5 }}>New Password</label>
            <input type="password" placeholder="Min 6 characters" value={newPass} onChange={e=>setNewPass(e.target.value)} style={inp} />
            {/* Strength bar */}
            {newPass.length>0&&(
              <div style={{ marginTop:5 }}>
                <div style={{ height:3, background:"#e2e8f0", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:2, transition:"width 0.3s",
                    width:  newPass.length<6?"30%":newPass.length<10?"65%":"100%",
                    background: newPass.length<6?"#ef4444":newPass.length<10?"#f59e0b":"#16a34a"
                  }} />
                </div>
                <span style={{ fontSize:10, color:newPass.length<6?"#ef4444":newPass.length<10?"#f59e0b":"#16a34a" }}>
                  {newPass.length<6?"Weak":newPass.length<10?"Medium":"Strong"}
                </span>
              </div>
            )}
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:5 }}>Confirm New Password</label>
            <input type="password" placeholder="Repeat new password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)}
              style={{ ...inp, borderColor: confirmPass&&confirmPass!==newPass?"#ef4444":"#d1d5db" }} />
            {confirmPass&&confirmPass!==newPass&&(
              <span style={{ fontSize:10, color:"#ef4444" }}>Passwords do not match</span>
            )}
          </div>

          <button onClick={handleChange} disabled={loading} style={{ width:"100%", padding:"10px", background:loading?"#93c5fd":"#1d4ed8", border:"none", borderRadius:8, color:"white", fontSize:13, fontWeight:700, cursor:loading?"not-allowed":"pointer" }}>
            {loading?"Changing...":"💾 Update Password"}
          </button>
        </div>
      )}
    </div>
  );
}
function ProfilePage({ user, onProfileUpdate }) {
  const [profile,  setProfile]  = useState(null);
  const [editing,  setEditing]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [message,  setMessage]  = useState("");

  // Form fields
  const [name,     setName]     = useState("");
  const [phone,    setPhone]    = useState("");
  const [division, setDivision] = useState("");

  useEffect(() => {
    fetch(`${API}/profile/${user.id}`)
      .then(r => r.json())
      .then(data => {
        setProfile(data.profile);
        setName(data.profile.name);
        setPhone(data.profile.phone || "");
        setDivision(data.profile.division);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/profile/update`, {
        method:  "PUT",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({
          emp_id:   user.id,
          name,
          phone,
          division
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Profile updated successfully!");
        setEditing(false);
        setProfile(p => ({ ...p, name, phone, division }));
        if (onProfileUpdate) onProfileUpdate(name);
      } else {
        setMessage("❌ Failed to update profile.");
      }
    } catch {
      setMessage("❌ Cannot connect to server.");
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const inp = {
    width:"100%", padding:"10px 14px",
    border:"1.5px solid #d1d5db", borderRadius:8,
    fontSize:14, color:"#111827", outline:"none",
    background:"#fff", boxSizing:"border-box"
  };

  if (loading) return (
    <Card style={{ padding:40, textAlign:"center" }}>
      <p style={{ color:"#64748b" }}>Loading profile...</p>
    </Card>
  );

  if (!profile) return (
    <Card style={{ padding:40, textAlign:"center" }}>
      <p style={{ color:"#dc2626" }}>Profile not found.</p>
    </Card>
  );

  const roleColors = {
    "Divisional Manager":  { bg:"#f3e8ff", color:"#7c3aed" },
    "Section Controller":  { bg:"#dbeafe", color:"#1d4ed8" },
    "Traffic Controller":  { bg:"#dcfce7", color:"#16a34a" },
    "Station Master":      { bg:"#fef9c3", color:"#92400e" },
  };
  const roleStyle = roleColors[profile.role] || { bg:"#f3f4f6", color:"#374151" };

  return (
    <div style={{ maxWidth:680, margin:"0 auto", display:"flex", flexDirection:"column", gap:20 }}>

      {/* Profile Header Card */}
      <Card style={{ padding:"32px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:24, marginBottom:24 }}>
          {/* Avatar */}
          <div style={{ width:80, height:80, borderRadius:"50%", background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, flexShrink:0, boxShadow:"0 4px 14px rgba(29,78,216,0.3)" }}>
            👤
          </div>
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, color:"#0f172a", marginBottom:4 }}>{profile.name}</h2>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:12, padding:"3px 12px", borderRadius:20, background:roleStyle.bg, color:roleStyle.color, fontWeight:600 }}>
                {profile.role}
              </span>
              <span style={{ fontSize:12, color:"#64748b" }}>•</span>
              <span style={{ fontSize:12, color:"#64748b" }}>{profile.division}</span>
            </div>
            <div style={{ fontSize:12, color:"#94a3b8", marginTop:4, fontFamily:"monospace" }}>
              ID: {profile.emp_id}
            </div>
          </div>
          {/* Edit Button */}
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ marginLeft:"auto", padding:"8px 20px", background:"#1d4ed8", border:"none", borderRadius:8, color:"white", fontSize:13, fontWeight:600, cursor:"pointer" }}>
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {/* Status message */}
        {message && (
          <div style={{ background:message.startsWith("✅")?"#dcfce7":"#fee2e2", border:`1px solid ${message.startsWith("✅")?"#86efac":"#fca5a5"}`, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:message.startsWith("✅")?"#15803d":"#b91c1c", fontWeight:600 }}>
            {message}
          </div>
        )}

        {/* Profile Details */}
        {!editing ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {[
              { label:"Full Name",      value:profile.name,     icon:"👤" },
              { label:"Employee ID",    value:profile.emp_id,   icon:"🪪" },
              { label:"Email Address",  value:profile.email,    icon:"📧" },
              { label:"Phone Number",   value:profile.phone||"Not set", icon:"📱" },
              { label:"Division",       value:profile.division, icon:"🏢" },
              { label:"Role",           value:profile.role,     icon:"🎯" },
              { label:"Account Status", value:profile.status?.toUpperCase()||"APPROVED", icon:"✅" },
              { label:"Member Since",   value:profile.created_at?.split(" ")[0]||"—", icon:"📅" },
            ].map(item=>(
              <div key={item.label} style={{ padding:"14px 16px", background:"#f8fafc", borderRadius:10, border:"1px solid #f1f5f9" }}>
                <div style={{ fontSize:11, color:"#94a3b8", textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>
                  {item.icon} {item.label}
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:"#0f172a" }}>{item.value}</div>
              </div>
            ))}
          </div>
        ) : (
          /* Edit Form */
          <div>
            <h3 style={{ fontSize:15, fontWeight:700, color:"#0f172a", marginBottom:16 }}>Edit Your Details</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>Full Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} style={inp} placeholder="Your full name" />
              </div>
              <div>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>Phone Number</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} style={inp} placeholder="+91 9876543210" />
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>Division</label>
              <select value={division} onChange={e=>setDivision(e.target.value)} style={{ ...inp, appearance:"none" }}>
                {["Southern Railway","Central Railway","Western Railway","Northern Railway","Eastern Railway"].map(d=>(
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Read-only fields notice */}
            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"10px 14px", marginBottom:20, fontSize:12, color:"#1d4ed8" }}>
              ℹ️ Email, Employee ID and Role can only be changed by Admin.
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={handleSave} disabled={saving} style={{ padding:"10px 24px", background:saving?"#93c5fd":"#1d4ed8", border:"none", borderRadius:8, color:"white", fontSize:13, fontWeight:600, cursor:saving?"not-allowed":"pointer" }}>
                {saving?"Saving...":"💾 Save Changes"}
              </button>
              <button onClick={()=>{ setEditing(false); setName(profile.name); setPhone(profile.phone||""); setDivision(profile.division); }} style={{ padding:"10px 24px", background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:8, color:"#64748b", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>

      
      {/* Account Security Card */}
      <Card style={{ padding:"20px 24px" }}>
      <h3 style={{ fontSize:14, fontWeight:700, color:"#0f172a", marginBottom:16 }}>🔐 Account Security</h3>
      <ChangePasswordSection empId={user.id} />
      </Card>

        

    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ══════════════════════════════════════════════════════════
function Dashboard({ user, onLogout }) {
  const [trains,        setTrains]        = useState([]);
  const [conflicts,     setConflicts]     = useState([]);
  const [suggestions,   setSuggestions]   = useState([]);
  const [analytics,     setAnalytics]     = useState(null);
  const [lastUpdated,   setLastUpdated]   = useState("--:--:--");
  const [activeTab,     setActiveTab]     = useState("overview");
  const [selectedRoute, setSelectedRoute] = useState("Chennai → Trichy");

  useAlertSound(conflicts.length);

  const fetchData = async () => {
    try {
      const encodedRoute = encodeURIComponent(selectedRoute);
      const [t,c,s] = await Promise.all([
        fetch(`${API}/trains/real?route=${encodedRoute}`).then(r=>r.json()),
        fetch(`${API}/conflicts`).then(r=>r.json()),
        fetch(`${API}/suggestions`).then(r=>r.json()),
      ]);
      setTrains(t.trains||[]);
      setConflicts(c.conflicts||[]);
      setSuggestions(s.suggestions||[]);
      setLastUpdated(new Date().toLocaleTimeString());
      fetch(`${API}/analytics`).then(r=>r.json()).then(setAnalytics).catch(()=>{});
    } catch(e) { console.error(e); }
  };

  useEffect(()=>{
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [selectedRoute]);

  const cids       = new Set(conflicts.flatMap(c=>[c.train_a,c.train_b]));
  const throughput = Math.round((trains.reduce((a,t)=>a+t.speed_kmh,0)/(trains.length||1)/336)*60*trains.length);
  const onTime     = trains.filter(t=>t.delay_minutes<=5).length;

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f1f5f9" }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={onLogout} conflictCount={conflicts.length} />

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Top Bar */}
        <div style={{ height:64, background:"#fff", borderBottom:"1px solid #e5e7eb", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", flexShrink:0 }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, color:"#0f172a" }}>Railway Traffic Control Dashboard</h2>
            <p style={{ fontSize:11, color:"#94a3b8" }}>{selectedRoute} Section</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>

            {/* Route Selector */}
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M3 17l6-6 4 4 8-8"/>
</svg>
              <select value={selectedRoute} onChange={e=>setSelectedRoute(e.target.value)}
                style={{ padding:"6px 10px", border:"1px solid #d1d5db", borderRadius:8, fontSize:12, color:"#374151", outline:"none", background:"#fff", cursor:"pointer" }}>
                {ROUTES.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>

            {conflicts.length>0&&(
              <div style={{ display:"flex", alignItems:"center", gap:6, background:"#fee2e2", padding:"5px 12px", borderRadius:20, border:"1px solid #fca5a5" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#dc2626" }} />
                <span style={{ fontSize:12, fontWeight:600, color:"#b91c1c" }}>🔔 {conflicts.length} Conflict{conflicts.length>1?"s":""}</span>
              </div>
            )}

            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#16a34a" }} />
              <span style={{ fontSize:12, color:"#64748b" }}>Live · {lastUpdated}</span>
            </div>
          </div>
        </div>

        <main style={{ flex:1, padding:"24px", overflowY:"auto" }}>

          {/* OVERVIEW */}
          {activeTab==="overview"&&(
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
                <StatCard label="Active Trains" value={trains.length}                icon="🚂" sub="On section"    accent="#1d4ed8" />
                <StatCard label="Conflicts"     value={conflicts.length}             icon="⚠️" sub={conflicts.length>0?"Alert!":"All clear"} accent={conflicts.length>0?"#dc2626":"#16a34a"} />
                <StatCard label="On Time"       value={`${onTime}/${trains.length}`} icon="✅" sub="On schedule"   accent="#16a34a" />
                <StatCard label="Throughput"    value={throughput}                   icon="📊" sub="Trains/hour"   accent="#7c3aed" />
              </div>
              <TrackMap trains={trains} conflicts={conflicts} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <ThroughputChart analytics={analytics} />
                <SpeedDelayChart trains={trains} />
              </div>
            </div>
          )}

          {/* TRAINS */}
          {activeTab==="trains"&&<TrainTable trains={trains} conflicts={conflicts} />}

          {/* MAP */}
          {activeTab==="map"&&<TrackMap trains={trains} conflicts={conflicts} />}

          {/* ANALYTICS */}
          {activeTab==="analytics"&&(
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                <ThroughputChart analytics={analytics} />
                <SpeedDelayChart trains={trains} />
              </div>
              {analytics&&(
                <Card style={{ padding:"20px 24px" }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:"#0f172a", marginBottom:16 }}>📋 Performance Summary</h3>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
                    {[
                      { label:"Without AI",  value:`${analytics.summary.avg_without_ai} trains/hr`, color:"#dc2626", bg:"#fee2e2" },
                      { label:"With AI",     value:`${analytics.summary.avg_with_ai} trains/hr`,    color:"#16a34a", bg:"#dcfce7" },
                      { label:"Improvement", value:`+${analytics.summary.improvement_pct}%`,         color:"#7c3aed", bg:"#f3e8ff" },
                    ].map(s=>(
                      <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:"16px 20px", textAlign:"center" }}>
                        <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* CONFLICTS */}
          {activeTab==="conflicts"&&(
            conflicts.length===0
              ?<Card style={{ padding:"40px", textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                <h3 style={{ color:"#15803d", fontSize:16, fontWeight:700 }}>All Clear</h3>
                <p style={{ color:"#64748b", fontSize:13, marginTop:6 }}>No conflicts detected on section.</p>
              </Card>
              :<div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {conflicts.map((c,i)=>{ const isCrit=c.severity==="CRITICAL"; return (
                  <Card key={i} style={{ padding:"16px 20px", borderLeft:`4px solid ${isCrit?"#dc2626":"#d97706"}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:20 }}>{isCrit?"🔴":"🟡"}</span>
                        <div><div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{c.severity} ALERT</div><div style={{ fontSize:12, color:"#64748b" }}>Distance: {c.distance_km} km</div></div>
                      </div>
                      <Badge text={c.severity} color={isCrit?"red":"yellow"} />
                    </div>
                    <p style={{ fontSize:13, color:"#374151", marginBottom:10 }}>{c.message}</p>
                    <div style={{ display:"flex", gap:8 }}>{[c.train_a,c.train_b].map(id=><span key={id} style={{ fontSize:11, padding:"3px 10px", background:"#f1f5f9", borderRadius:6, color:"#475569", fontWeight:600 }}>{id}</span>)}</div>
                  </Card>
                ); })}
              </div>
          )}

          {/* AI SUGGESTIONS */}
          {activeTab==="profile"&&(
  <ProfilePage user={user} onProfileUpdate={(newName) => {
    // Update displayed name if needed
    console.log("Profile updated:", newName);
  }} />
)}
          {activeTab==="ai"&&(
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {suggestions.map((s,i)=>{ const cfg={HIGH:{border:"#dc2626",bg:"#fff5f5",icon:"🚨",badge:"red"},MEDIUM:{border:"#d97706",bg:"#fffbeb",icon:"⚡",badge:"yellow"},LOW:{border:"#16a34a",bg:"#f0fdf4",icon:"✅",badge:"green"}}[s.priority]||{border:"#16a34a",bg:"#f0fdf4",icon:"✅",badge:"green"}; return (
                <Card key={i} style={{ padding:"16px 20px", borderLeft:`4px solid ${cfg.border}`, background:cfg.bg }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}><span style={{ fontSize:20 }}>{cfg.icon}</span><span style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{s.action}</span></div>
                    <Badge text={`Priority: ${s.priority}`} color={cfg.badge} />
                  </div>
                  <p style={{ fontSize:12, color:"#64748b", marginLeft:30 }}>{s.reason}</p>
                </Card>
              ); })}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════════════════
export default function App() {
  const [page,        setPage]        = useState("login");
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin  = (user) => {
    setCurrentUser(user);
    setPage(user.role === "Divisional Manager" ? "admin" : "dashboard");
  };
  const handleLogout = () => {
    setCurrentUser(null);
    setPage("login");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',sans-serif; background:#f1f5f9; color:#0f172a; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
        input, select { font-family:'DM Sans',sans-serif; }
        @keyframes ping  { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.4);opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>

      {page==="login"     && <LoginPage      onLogin={handleLogin} onGoSignup={()=>setPage("signup")} onForgotPassword={()=>setPage("forgot")} />}
      {page==="signup"    && <SignupPage      onGoLogin={()=>setPage("login")} />}
      {page==="forgot"    && <ForgotPasswordPage onGoLogin={()=>setPage("login")} />}
      {page==="admin"     && currentUser && <AdminPortal user={currentUser} onLogout={handleLogout} />}
      {page==="dashboard" && currentUser && <Dashboard   user={currentUser} onLogout={handleLogout} />}
    </>
  );
}