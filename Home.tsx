import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, DollarSign, FileText, Github, Cloud, TrendingUp, Shield, Database } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen bg-cream" dir="rtl">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-block p-4 bg-gold/10 rounded-full mb-6">
            <Building2 className="h-16 w-16 text-gold" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-navy mb-6">
            نظام الإدارة المالية
          </h1>
          <p className="text-xl md:text-2xl text-navy/70 mb-8 max-w-3xl mx-auto">
            نظام متكامل لإدارة الإيرادات والمصروفات مع دعم الفروع المتعددة والنسخ الاحتياطي التلقائي
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              className="bg-gold hover:bg-gold/90 text-navy font-bold px-8"
              onClick={() => window.location.href = getLoginUrl()}
            >
              تسجيل الدخول
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-gold text-gold hover:bg-gold/10"
            >
              معرفة المزيد
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card className="card-geometric hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-gold" />
                </div>
                <CardTitle className="text-navy">إدارة الإيرادات</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-right">
                تسجيل الإيرادات اليومية مع التحقق التلقائي من التوازن المحاسبي بين النقد والشبكة
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="card-geometric hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <FileText className="h-6 w-6 text-gold" />
                </div>
                <CardTitle className="text-navy">إدارة المصروفات</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-right">
                15 فئة مصروفات محددة مسبقاً مع إمكانية ربط المصروف بالموظف عند الحاجة
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="card-geometric hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-gold" />
                </div>
                <CardTitle className="text-navy">دعم الفروع المتعددة</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-right">
                إدارة عدة فروع مع عزل البيانات وصلاحيات مخصصة لكل فرع
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="card-geometric hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <Github className="h-6 w-6 text-gold" />
                </div>
                <CardTitle className="text-navy">النسخ الاحتياطي التلقائي</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-right">
                نسخ احتياطي يومي وشهري تلقائي للبيانات المالية على GitHub
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="card-geometric hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <Cloud className="h-6 w-6 text-gold" />
                </div>
                <CardTitle className="text-navy">Cloudflare Integration</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-right">
                تكامل مع خدمات Cloudflare (D1, R2, KV) لتخزين البيانات والملفات
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="card-geometric hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <Shield className="h-6 w-6 text-gold" />
                </div>
                <CardTitle className="text-navy">صلاحيات متقدمة</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-right">
                نظام صلاحيات متعدد المستويات (مدير، مشرف، موظف) مع أمان عالي
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Technical Features */}
        <div className="bg-white/50 rounded-2xl p-8 border-2 border-gold/20">
          <h2 className="text-3xl font-bold text-navy mb-8 text-center">
            المزايا التقنية
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <Database className="h-8 w-8 text-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-navy mb-2">قاعدة بيانات قوية</h3>
                <p className="text-navy/70 text-right">
                  MySQL/TiDB مع فهرسة محسّنة للأداء العالي
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <TrendingUp className="h-8 w-8 text-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-navy mb-2">تقارير شهرية تلقائية</h3>
                <p className="text-navy/70 text-right">
                  توليد تقارير مالية شاملة تلقائياً في نهاية كل شهر
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 text-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-navy mb-2">أمان متقدم</h3>
                <p className="text-navy/70 text-right">
                  مصادقة JWT مع تشفير البيانات الحساسة
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <Cloud className="h-8 w-8 text-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-navy mb-2">سحابي بالكامل</h3>
                <p className="text-navy/70 text-right">
                  استضافة على Cloudflare Workers للأداء والموثوقية
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold text-navy mb-4">
            جاهز للبدء؟
          </h2>
          <p className="text-navy/70 mb-8">
            ابدأ في إدارة أموالك بشكل احترافي اليوم
          </p>
          <Button 
            size="lg" 
            className="bg-gold hover:bg-gold/90 text-navy font-bold px-12"
            onClick={() => window.location.href = getLoginUrl()}
          >
            ابدأ الآن
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-gold/20 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-navy/60">
          <p>© 2024 نظام الإدارة المالية. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
