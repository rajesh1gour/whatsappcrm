"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    // company_name + full_name are read by the handle_new_user trigger,
    // which provisions the tenant + profile row automatically.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company_name: companyName, full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled in Supabase, we get a session now.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setCheckEmail(true);
    setLoading(false);
  }

  if (checkEmail) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <MailCheck className="mx-auto size-10 text-emerald-600" />
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              We sent a confirmation link to <strong>{email}</strong>. Click it
              to activate your account.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <MessageCircle className="size-6" />
          </div>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Start managing WhatsApp conversations in minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="company">Company name</Label>
              <Input
                id="company"
                placeholder="Acme Stores"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
