'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import bcrypt from "bcryptjs";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const adminsRef = collection(db, "admins");
      const q = query(adminsRef, where("email", "==", form.email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setError("No account found with this email.");
        setLoading(false);
        return;
      }
      const adminDoc = querySnapshot.docs[0];
      const adminData = adminDoc.data();
      const passwordMatch = await bcrypt.compare(form.password, adminData.password);
      if (!passwordMatch) {
        setError("Incorrect password.");
        setLoading(false);
        return;
      }
      setSuccess("Login successful!");
      if (typeof window !== "undefined") {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("user", JSON.stringify({
          uid: adminData.uid,
          name: adminData.name,
          email: adminData.email
        }));
      }
      router.push("/");
    } catch (err: unknown) {
      setError((err instanceof Error && err.message) ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-md space-y-2" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-center">Login</h1>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
          <Input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
          <div className="relative">
            <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={form.password} onChange={handleChange} />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center">{success}</div>}
        <Button type="submit" className="w-full mt-4" disabled={loading}>{loading ? "Logging in..." : "Login"}</Button>
      </form>
    </div>
  );
} 