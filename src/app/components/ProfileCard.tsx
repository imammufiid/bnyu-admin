"use client";
import { useState } from "react";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type ProfileCardProps = {
  user: { name: string; email: string };
  setUser: (user: { name: string; email: string }) => void;
};

export default function ProfileCard({ user, setUser }: ProfileCardProps) {
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; email: string }>({ name: user.name, email: user.email });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  return (
    <div className="bg-white p-8 rounded-lg shadow w-full max-w-md mx-auto text-center">
      <h2 className="text-2xl font-bold mb-4">Profile</h2>
      <div className="flex flex-col items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600">
          {user.name ? user.name.charAt(0).toUpperCase() : "A"}
        </div>
        {editingProfile ? (
          <form
            className="flex flex-col gap-4 w-full max-w-xs mx-auto"
            onSubmit={async e => {
              e.preventDefault();
              setLoading(true);
              setError("");
              setSuccess("");
              try {
                // Find admin doc by email
                const adminsRef = collection(db, "admins");
                const q = query(adminsRef, where("email", "==", editForm.email));
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) {
                  setError("Admin not found.");
                  setLoading(false);
                  return;
                }
                const adminDoc = querySnapshot.docs[0].ref;
                await updateDoc(adminDoc, { name: editForm.name });
                setUser(editForm);
                localStorage.setItem("user", JSON.stringify(editForm));
                setSuccess("Profile updated successfully.");
                setEditingProfile(false);
              } catch (err: any) {
                setError(err.message || "Failed to update profile");
              } finally {
                setLoading(false);
              }
            }}
          >
            <input
              className="border rounded px-3 py-2"
              type="text"
              value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Name"
              required
            />
            <input
              className="border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
              type="email"
              value={editForm.email}
              disabled
              placeholder="Email"
              required
            />
            <div className="flex gap-2 justify-center mt-2">
              <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
              <button type="button" className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-semibold" onClick={() => setEditingProfile(false)} disabled={loading}>Cancel</button>
            </div>
            {error && <div className="text-red-600 text-xs text-center mt-2">{error}</div>}
            {success && <div className="text-green-600 text-xs text-center mt-2">{success}</div>}
          </form>
        ) : (
          <div>
            <div className="text-lg font-semibold">{user.name}</div>
            <div className="text-gray-500">{user.email}</div>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
              onClick={() => {
                setEditForm({ name: user.name, email: user.email });
                setEditingProfile(true);
              }}
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 