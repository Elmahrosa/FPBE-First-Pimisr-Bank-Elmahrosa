import React, { useState } from "react";

export default function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 24, border: "1px solid #ddd" }}>
      <h2>Admin Login</h2>
      <input placeholder="Username" value={user} onChange={e => setUser(e.target.value)} style={{ width: "100%", marginBottom: 8 }} />
      <input placeholder="Password" type="password" value={pass} onChange={e => setPass(e.target.value)} style={{ width: "100%", marginBottom: 16 }} />
      <button style={{ width: "100%" }}>Sign In</button>
    </div>
  );
}
