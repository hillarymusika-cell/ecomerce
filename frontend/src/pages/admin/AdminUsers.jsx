import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUsers, updateUser } from "../../api/adminApi";
import Loading from "../../components/Loading";
import { getErrorMessage } from "../../utils/errors";

function roleOf(u) {
  if (u.role_label) return u.role_label;
  if (u.is_superuser || u.is_admin) return "admin";
  if (u.is_staff) return "staff";
  return "customer";
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    getUsers()
      .then(({ data }) => setUsers(data.results || data || []))
      .catch((err) => setError(getErrorMessage(err, "Failed to load users.")))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const setRole = async (id, role) => {
    try {
      await updateUser(id, { role });
      load();
    } catch (err) {
      alert(getErrorMessage(err, "Update failed."));
    }
  };

  const toggleActive = async (u) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      load();
    } catch (err) {
      alert(getErrorMessage(err, "Update failed."));
    }
  };

  return (
    <section className="section container">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SYSTEM ADMIN</span>
          <h1>Users</h1>
        </div>
        <Link className="button ghost small" to="/admin">
          Dashboard
        </Link>
      </div>
      {error && <div className="alert">{error}</div>}
      {loading ? (
        <Loading />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const role = roleOf(u);
                return (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`status ${role}`}>{role}</span>
                    </td>
                    <td>{u.is_active ? "Yes" : "No"}</td>
                    <td className="row-actions">
                      <select
                        value={role}
                        onChange={(e) => setRole(u.id, e.target.value)}
                        aria-label={`Role for ${u.email}`}
                      >
                        <option value="customer">Customer</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        type="button"
                        className="button ghost small"
                        onClick={() => toggleActive(u)}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!users.length && (
                <tr>
                  <td colSpan={5}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
