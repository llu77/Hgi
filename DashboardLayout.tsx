import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  DollarSign, 
  FileText, 
  Building2, 
  Users, 
  Settings,
  LogOut,
  Github,
  Cloud,
  Menu,
  X,
  BarChart3,
  Gift,
  CheckSquare,
  ClipboardList,
  ShoppingCart,
  TrendingUp,
  History
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useBranch } from "@/contexts/BranchContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logoutMutation = trpc.auth.logout.useMutation();
  const { selectedBranchId, setSelectedBranchId, isAdmin } = useBranch();
  
  // Fetch branches for admin dropdown
  const { data: branches } = trpc.branches.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream" dir="rtl">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center text-navy">
              تسجيل الدخول للمتابعة
            </h1>
            <p className="text-sm text-navy/60 text-center max-w-sm">
              الوصول إلى لوحة التحكم يتطلب المصادقة
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full bg-gold hover:bg-gold/90 text-navy"
          >
            تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      logout();
      window.location.href = "/";
    } catch (error) {
      toast.error("فشل تسجيل الخروج");
    }
  };

  const navigation = [
    { name: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "employee"] },
    { name: "التحليلات", href: "/analytics", icon: BarChart3, roles: ["admin", "manager"] },
    { name: "الإيرادات", href: "/revenues", icon: DollarSign, roles: ["admin", "manager", "employee"] },
    { name: "الإيرادات اليومية", href: "/daily-revenues", icon: TrendingUp, roles: ["admin", "manager"] },
    { name: "المصروفات", href: "/expenses", icon: FileText, roles: ["admin", "manager", "employee"] },
    { name: "البونص الأسبوعي", href: "/bonuses", icon: Gift, roles: ["manager"] },
    { name: "طلبات البونص", href: "/admin/bonuses", icon: CheckSquare, roles: ["admin"] },
    { name: "تاريخ البونص", href: "/bonus-history", icon: History, roles: ["admin", "manager"] },
    { name: "طلبات الموظفين", href: "/employee-requests", icon: ClipboardList, roles: ["admin", "manager"] },
    { name: "طلبات المنتجات", href: "/product-orders", icon: ShoppingCart, roles: ["admin", "manager"] },
    { name: "تحليلات الطلبات", href: "/analytics/requests", icon: BarChart3, roles: ["admin", "manager"] },
    { name: "الفروع", href: "/branches", icon: Building2, roles: ["admin"] },
    { name: "الموظفون", href: "/employees", icon: Users, roles: ["admin", "manager"] },
    { name: "إدارة المستخدمين", href: "/admin", icon: Settings, roles: ["admin"] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || "employee")
  );

  return (
    <div className="min-h-screen bg-cream" dir="rtl">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white" style={{backgroundColor: '#292929'}} style={{color: '#1a1a1a', backgroundColor: '#ffffff'}}
        >
          {sidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-40 h-screen w-64 bg-white border-l-2 border-gold/20 transition-transform ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b-2 border-gold/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold/10 rounded-lg">
                <Building2 className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h2 className="font-bold text-navy" style={{fontSize: '26px'}} style={{fontSize: '19px', fontWeight: '800'}}>Symbol AI</h2>
                <p className="text-sm text-navy/60">{user?.name}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-gold/10 text-gold font-semibold"
                        : "text-navy/70 hover:bg-gold/5 hover:text-navy"
                    }`}
                    onClick={() => setSidebarOpen(false)} style={{fontWeight: '500'}}
                  >
                    <item.icon className="h-5 w-5" />
                    <span style={{fontWeight: '800'}}>{item.name}</span>
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t-2 border-gold/20">
            <div className="mb-3 p-3 bg-gold/5 rounded-lg">
              <p className="text-sm text-navy/60" style={{fontWeight: '700'}}>صلاحياتك</p>
              <p className="font-semibold text-navy" style={{color: '#404040', fontWeight: '800'}}>
                {user?.role === "admin" ? "مدير" : user?.role === "manager" ? "مشرف" : "موظف"}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 border-gold/20 text-navy hover:bg-gold/5"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:mr-64 min-h-screen">
        {/* Branch selector for admin */}
        {isAdmin && (
          <div className="bg-white border-b-2 border-gold/20 p-4">
            <div className="container mx-auto flex items-center gap-4">
              <label className="text-sm font-medium text-navy" style={{fontWeight: '800'}}>اختر الفرع:</label>
              <Select
                value={selectedBranchId?.toString() || ""}
                onValueChange={(value) => setSelectedBranchId(value ? parseInt(value) : null)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="اختر فرعاً" />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
