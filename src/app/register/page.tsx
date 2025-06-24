'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import bcrypt from "bcryptjs";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm_password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDirty, setConfirmDirty] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === "confirm_password") setConfirmDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      // Check if email already exists in admins collection
      const adminsRef = collection(db, "admins");
      const q = query(adminsRef, where("email", "==", form.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setError("An account with this email already exists.");
        setLoading(false);
        return;
      }
      // Create new admin
      const hashedPassword = await bcrypt.hash(form.password, 10);
      const newAdminRef = doc(adminsRef);
      await setDoc(newAdminRef, {
        uid: newAdminRef.id,
        name: form.name,
        email: form.email,
        password: hashedPassword, // Store hashed password
        createdAt: new Date().toISOString(),
      });
      setSuccess("Registration successful! You can now log in.");
      setForm({ name: "", email: "", password: "", confirm_password: "" });
    } catch (err: unknown) {
      setError((err instanceof Error && err.message) ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const confirmPasswordError =
    confirmDirty && form.confirm_password && form.password !== form.confirm_password
      ? "Passwords do not match"
      : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-md space-y-2" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-center">Register</h1>
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
          <Input id="name" name="name" type="text" autoComplete="name" required value={form.name} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
          <Input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
          <div className="relative">
            <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={form.password} onChange={handleChange} />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="confirm_password" className="block text-sm font-medium mb-1">Confirm Password</label>
          <div className="relative">
            <Input id="confirm_password" name="confirm_password" type={showConfirmPassword ? "text" : "password"} autoComplete="confirm-password" required value={form.confirm_password} onChange={handleChange} />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" onClick={() => setShowConfirmPassword(v => !v)} tabIndex={-1}>
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirmPasswordError && (
            <div className="text-red-600 text-xs mt-1">{confirmPasswordError}</div>
          )}
        </div>
        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center">{success}</div>}
        <Button type="submit" className="w-full mt-4" disabled={loading || !!confirmPasswordError}>{loading ? "Registering..." : "Register"}</Button>
      </form>
    </div>
  );
} 