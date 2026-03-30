"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(username, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login gagal. Periksa kredensial Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-[40%] -top-[40%] h-[80%] w-[80%] rounded-full bg-primary/5 blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-[30%] -right-[30%] h-[70%] w-[70%] rounded-full bg-chart-4/5 blur-3xl animate-[pulse_10s_ease-in-out_infinite_2s]" />
        <div className="absolute left-[20%] top-[60%] h-[40%] w-[40%] rounded-full bg-chart-2/5 blur-3xl animate-[pulse_12s_ease-in-out_infinite_4s]" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4 animate-fade-in">
        {/* Logo & title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 shadow-lg shadow-primary/5 p-2">
            <Image src="/logo.png" alt="MANRIS Logo" width={64} height={64} className="object-contain drop-shadow-sm" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="gradient-text">MANRIS</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-Driven Risk & Incident Management
          </p>
        </div>

        {/* Login card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/5">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold">Masuk ke Akun Anda</h2>
            <p className="text-sm text-muted-foreground">
              Gunakan kredensial yang telah diberikan administrator
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-medium">
                  Username atau Email
                </Label>
                <Input
                  id="username"
                  placeholder="masukkan username atau email"
                  className="h-10 bg-muted/30 border-border/50 focus-visible:ring-primary/30"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium">
                    Password
                  </Label>
                  <button
                    type="button"
                    className="text-[11px] text-primary hover:underline"
                  >
                    Lupa password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="masukkan password"
                    className="h-10 pr-10 bg-muted/30 border-border/50 focus-visible:ring-primary/30"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 gap-2 font-semibold text-sm shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground/60">
            Kementerian Kesehatan RI · Ditjen P2P
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/40">
            MANRIS v2.0 · Powered by AI
          </p>
        </div>
      </div>
    </div>
  );
}
