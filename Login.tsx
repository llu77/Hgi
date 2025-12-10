import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      // Redirect to dashboard after successful login
      setLocation("/dashboard");
    },
    onError: (err) => {
      setError(err.message || "فشل تسجيل الدخول. يرجى التحقق من اسم المستخدم وكلمة المرور.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F1E8] via-[#FBF8F3] to-[#F0EBE3] p-4" dir="rtl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="sacred-grid" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="50" cy="50" r="30" fill="none" stroke="#C9A961" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="20" fill="none" stroke="#C9A961" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="10" fill="none" stroke="#C9A961" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sacred-grid)" />
        </svg>
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-[#C9A961]/20">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-[#C9A961] to-[#B8935A] flex items-center justify-center mb-2">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold text-[#1A1D2E]" style={{fontSize: '27px', marginBottom: '7px', width: '330px', height: 'px'}}>
            Branches Management
          </CardTitle>
          <CardDescription className="text-[#C9A961] text-lg">
            تسجيل الدخول إلى حسابك
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800 text-right">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#1A1D2E] font-semibold text-right block">
                اسم المستخدم
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="text-right border-[#C9A961]/30 focus:border-[#C9A961] h-12"
                disabled={loginMutation.isPending}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1A1D2E] font-semibold text-right block">
                كلمة المرور
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="text-right border-[#C9A961]/30 focus:border-[#C9A961] h-12"
                disabled={loginMutation.isPending}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-[#C9A961] to-[#B8935A] hover:from-[#B8935A] hover:to-[#A87D4A] text-white font-bold text-lg shadow-lg"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#C9A961]/20">
            <p className="text-center text-sm text-gray-600">
              نظام إدارة الفروع المتكامل
            </p>
            <p className="text-center text-xs text-gray-400 mt-2">
              All Rights Reserved to Symbol AI
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
