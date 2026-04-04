"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyParam = searchParams.get("verify");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(verifyParam === "true");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role;

    if (role === "OWNER") router.push("/owner/dashboard");
    else if (role === "MANAGER") router.push("/manager/dashboard");
    else if (role === "ADMIN") router.push("/admin/dashboard");
    else router.push("/login");
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    await signIn("email", {
      email: magicEmail,
      redirect: false,
      callbackUrl: "/",
    });

    setLoading(false);
    setMagicSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <Card className="w-full max-w-[400px] border-cream-300 shadow-md">
        <CardContent className="pt-8 pb-8 px-8">
          {/* Logo */}
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
              Sign in to your account
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Magic link sent confirmation */}
          {magicSent ? (
            <div className="rounded-md bg-teal-50 px-4 py-6 text-center">
              <p className="text-sm font-medium text-teal">
                Check your email
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                We sent a sign-in link to your email address.
              </p>
              <Button
                variant="ghost"
                className="mt-4 text-xs"
                onClick={() => setMagicSent(false)}
              >
                Back to login
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="password">
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="magic">Magic Link</TabsTrigger>
              </TabsList>

              <TabsContent value="password">
                <form
                  onSubmit={handleCredentialsSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="magic">
                <form
                  onSubmit={handleMagicLinkSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="magic-email">Email</Label>
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder="you@example.com"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-teal hover:bg-teal-600 text-white"
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Magic Link"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    We&apos;ll email you a secure sign-in link
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-cream" />}>
      <LoginForm />
    </Suspense>
  );
}
