import { useAuth } from "../context/AuthContext";

export default function Account() {
  const { user } = useAuth();
  return <section className="section container narrow"><span className="eyebrow">PROFILE</span><h1>Account</h1><div className="profile-card"><div><span>Email</span><strong>{user.email}</strong></div><div><span>Username</span><strong>{user.username}</strong></div><div><span>Telephone</span><strong>{user.telephone_no || "—"}</strong></div><div><span>Location</span><strong>{[user.city,user.country].filter(Boolean).join(", ") || "—"}</strong></div><div><span>Role</span><strong>{user.role}</strong></div></div></section>;
}