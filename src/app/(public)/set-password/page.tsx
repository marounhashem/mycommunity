"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SessionProvider } from "next-auth/react";

function SetPasswordForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }

    const role = session?.user?.role;
    if (role === "OWNER") router.push("/owner/dashboard");
    else if (role === "MANAGER") router.push("/manager/dashboard");
    else if (role === "ADMIN") router.push("/admin/dashboard");
    else router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <Card className="w-full max-w-[400px] border-cream-300 shadow-md">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center bg-crimson">
                <span className="text-[7px] font-bold leading-tight text-white text-center">
                  TERRA
                  <br />
                  STATE
                </span>
              </div>
              <span className="font-heading text-[22px] font-bold text-foreground">
                MyCommunity
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Set your password to continue
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Setting password..." : "Set Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <SessionProvider>
      <SetPasswordForm />
    </SessionProvider>
  );
}
