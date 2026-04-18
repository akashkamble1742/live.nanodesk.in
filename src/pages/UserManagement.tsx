import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { UserPlus, Shield, Trash2, Mail, BadgeCheck, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AppUser {
  id: string;
  email: string;
  role: 'admin' | 'editor';
  displayName?: string;
}

export default function UserManagement() {
  const { appUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'editor'>('editor');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "app_users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser)));
    });
    return unsub;
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail) return;

    // In a real app, you might want a more sophisticated invite system.
    // Here we just pre-allocate a role in the DB mapped by email (not UID yet, 
    // unless you want them to log in first. But standard practice is mapping UID upon first login).
    // Actually, our rules wait for the specific userId (UID). 
    // Let's assume the admin knows the user's UID or we check by email on first login.
    // For this simple demo, I'll allow adding by manually entering a UID if known, 
    // or we can use email as a lookup in a separate "invites" collection.
    // To keep it simple and safe for the AI Studio context where we don't have server actions for email lookup:
    alert("In this demo, user IDs are used for direct assignment. Please ensure the user has logged in once to get their ID, or use a lookup.");
  };

  const updateUserRole = async (id: string, newRole: 'admin' | 'editor') => {
    if (id === appUser?.uid) return alert("You cannot change your own role.");
    await updateDoc(doc(db, "app_users", id), { role: newRole });
  };

  const removeUser = async (id: string) => {
    if (id === appUser?.uid) return alert("You cannot remove yourself.");
    if (!confirm("Remove this user's access?")) return;
    await deleteDoc(doc(db, "app_users", id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
       <div className="flex items-center justify-between mb-12">
        <div className="space-y-1">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Access Control</h1>
          <p className="text-zinc-500 font-medium">Manage who can edit your broadcast channels</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" /> Authorized Personnel
            </h2>
            <span className="text-xs font-mono text-zinc-500 bg-black px-2 py-1 rounded">{users.length} Total Users</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {users.map((u) => (
            <div key={u.id} className="p-6 flex items-center justify-between group hover:bg-zinc-800/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                   <Mail className="w-5 h-5 text-zinc-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{u.displayName || "Authorized User"}</h3>
                    {u.role === 'admin' && <BadgeCheck className="w-4 h-4 text-red-500" />}
                  </div>
                  <p className="text-xs text-zinc-500 font-mono italic">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <select 
                  value={u.role}
                  onChange={(e) => updateUserRole(u.id, e.target.value as 'admin' | 'editor')}
                  disabled={u.id === appUser?.uid}
                  className="bg-black border border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-red-600 disabled:opacity-50"
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                </select>

                <button 
                  onClick={() => removeUser(u.id)}
                  disabled={u.id === appUser?.uid}
                  className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-0"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="p-12 text-center text-zinc-500 italic">
               Only the owner (bootstrap admin) currently has access.
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-6 bg-red-600/5 border border-red-600/20 rounded-2xl flex gap-4">
        <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
        <div className="space-y-2">
          <h4 className="font-bold text-red-500">Security Note</h4>
          <p className="text-sm text-zinc-400">
            Admins have full control over all channels and users. Editors can only manage videos in the channels they create or are assigned to. 
            Currently, adding users requires them to first log in; then their role can be upgraded here.
          </p>
        </div>
      </div>
    </div>
  );
}
