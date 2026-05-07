"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  listRegistrationOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import { registerUser } from "@/lib/api/auth";

export default function RegisterScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgLoading, setOrgLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [nip, setNip] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [pangkat, setPangkat] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;

    listRegistrationOrganizations()
      .then((result) => {
        if (!cancelled) {
          setOrganizations(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Daftar organisasi belum berhasil dimuat.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOrgLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !name ||
      !email ||
      !phoneNumber ||
      !organizationId ||
      !nip ||
      !password ||
      !confirmPassword
    ) {
      setError("Lengkapi semua field wajib terlebih dahulu.");
      return;
    }

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password harus sama.");
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        name,
        email,
        phoneNumber,
        password,
        organizationId,
        nip,
        jabatan,
        pangkat,
      });
      setSuccess(
        "Registrasi berhasil. Akun sekarang menunggu approval sebelum bisa digunakan.",
      );
      setName("");
      setEmail("");
      setPhoneNumber("");
      setOrganizationId("");
      setNip("");
      setJabatan("");
      setPangkat("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Registrasi belum berhasil disimpan.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-[35%] -top-[30%] h-[70%] w-[70%] rounded-full bg-primary/5 blur-3xl animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-25%] right-[-25%] h-[60%] w-[60%] rounded-full bg-chart-2/5 blur-3xl animate-[pulse_12s_ease-in-out_infinite_2s]" />
      </div>

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 w-full max-w-3xl animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-medium tracking-tight">
            <span className="gradient-text">M A N R I S</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Registrasi mandiri untuk pengguna unit kerja
          </p>
        </div>

        <Card className="border-border/50 bg-card/85 shadow-2xl shadow-primary/5 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle>Buat akun baru</CardTitle>
            <CardDescription>
              Akun yang dibuat akan berstatus menunggu aktivasi sampai admin
              menyetujui registrasi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-5">
              {error && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md border border-success/20 bg-success/10 px-3 py-2 text-xs text-success">
                  {success}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-medium">
                    Nama lengkap
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Contoh: Dr. Andi Pratama, M.Kes"
                    className="h-10 border-border/50 bg-muted/30"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nama@kemenkes.go.id"
                    className="h-10 border-border/50 bg-muted/30"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-xs font-medium">
                    No HP
                  </Label>
                  <Input
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="h-10 border-border/50 bg-muted/30"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="organization" className="text-xs font-medium">
                    Unit kerja
                  </Label>
                  <Select
                    value={organizationId}
                    onValueChange={setOrganizationId}
                    disabled={orgLoading}
                  >
                    <SelectTrigger className="h-10 border-border/50 bg-muted/30">
                      <SelectValue
                        placeholder={
                          orgLoading
                            ? "Memuat organisasi..."
                            : "Pilih unit kerja"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((organization) => (
                        <SelectItem
                          key={organization.id}
                          value={organization.id}
                        >
                          {organization.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nip" className="text-xs font-medium">
                    NIP
                  </Label>
                  <Input
                    id="nip"
                    value={nip}
                    onChange={(event) => setNip(event.target.value)}
                    placeholder="Nomor induk pegawai"
                    className="h-10 border-border/50 bg-muted/30"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jabatan" className="text-xs font-medium">
                    Jabatan
                  </Label>
                  <Input
                    id="jabatan"
                    value={jabatan}
                    onChange={(event) => setJabatan(event.target.value)}
                    placeholder="Jabatan"
                    className="h-10 border-border/50 bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pangkat" className="text-xs font-medium">
                    Pangkat
                  </Label>
                  <Input
                    id="pangkat"
                    value={pangkat}
                    onChange={(event) => setPangkat(event.target.value)}
                    placeholder="Pangkat"
                    className="h-10 border-border/50 bg-muted/30"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Buat password sendiri"
                      className="h-10 border-border/50 bg-muted/30 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-xs font-medium"
                  >
                    Konfirmasi password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Ulangi password"
                      className="h-10 border-border/50 bg-muted/30 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((current) => !current)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1">
                <Button
                  type="submit"
                  className="h-10 gap-2 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                  disabled={loading || orgLoading}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Daftar sekarang
                      <ArrowRight data-icon="inline-end" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Sudah punya akun?</span>
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Masuk
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
