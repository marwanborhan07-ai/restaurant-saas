"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Account created successfully! Check your email to confirm your account."
    );

    setLoading(false);
  }

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-gray-50">
      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        
        <h1 className="text-3xl font-bold">
          Start your free trial
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Create your Restaurant Growth OS account.
        </p>

        <form
          onSubmit={handleSignup}
          className="mt-6 space-y-4"
        >
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border p-3"
            required
          />

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border p-3"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border p-3"
            required
            minLength={6}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          {message && (
            <p className="text-center text-sm text-gray-600">
              {message}
            </p>
          )}
        </form>

        <button
          onClick={() => router.push("/login")}
          className="mt-4 w-full text-sm text-blue-600"
        >
          Already have an account? Log in
        </button>

      </section>
    </main>
  );
}