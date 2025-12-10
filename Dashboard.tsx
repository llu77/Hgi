import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Building2, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBranch } from "@/contexts/BranchContext";

export default function Dashboard() {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  
  // For managers: use their branchId, for admins: use selected branch
  const effectiveBranchId = user?.role === "manager" ? user.branchId : selectedBranchId;
  const { data: branches, isLoading: branchesLoading } = trpc.branches.list.useQuery();
  const { data: employees, isLoading: employeesLoading } = trpc.employees.listByBranch.useQuery(
    { branchId: effectiveBranchId || 0 },
    { enabled: !!effectiveBranchId }
  );

  // Fetch real dashboard statistics
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery(
    { branchId: effectiveBranchId || undefined },
    { enabled: true }
  );

  // Fetch recent revenues for activity log
  const { data: recentRevenues, isLoading: recentLoading } = trpc.revenues.getRecent.useQuery(
    { branchId: effectiveBranchId || undefined, limit: 5 },
    { enabled: true }
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-navy mb-2">لوحة التحكم</h1>
          <p className="text-navy/60">مرحباً بك، {user?.name}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="card-geometric">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy">
                إجمالي الإيرادات
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy">
                {statsLoading ? "..." : (stats?.totalRevenue || 0).toLocaleString()} ر.س
              </div>
              <p className="text-xs text-navy/60 mt-1">
                <TrendingUp className="inline h-3 w-3 ml-1" />
                +12% عن الشهر الماضي
              </p>
            </CardContent>
          </Card>

          <Card className="card-geometric">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy">
                إجمالي المصروفات
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy">
                {statsLoading ? "..." : (stats?.totalExpenses || 0).toLocaleString()} ر.س
              </div>
              <p className="text-xs text-navy/60 mt-1">
                <TrendingDown className="inline h-3 w-3 ml-1" />
                +5% عن الشهر الماضي
              </p>
            </CardContent>
          </Card>

          <Card className="card-geometric">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy">
                صافي الربح
              </CardTitle>
              <Wallet className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy">
                {statsLoading ? "..." : (stats?.netProfit || 0).toLocaleString()} ر.س
              </div>
              <p className="text-xs text-navy/60 mt-1">
                <TrendingUp className="inline h-3 w-3 ml-1" />
                +18% عن الشهر الماضي
              </p>
            </CardContent>
          </Card>

          <Card className="card-geometric">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy">
                الرصيد النقدي
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy">
                {statsLoading ? "..." : (stats?.cashBalance || 0).toLocaleString()} ر.س
              </div>
              <p className="text-xs text-navy/60 mt-1">
                متوفر حالياً
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="card-geometric">
            <CardHeader>
              <CardTitle className="text-navy">الفروع</CardTitle>
              <CardDescription>إدارة الفروع المتاحة</CardDescription>
            </CardHeader>
            <CardContent>
              {branchesLoading ? (
                <p className="text-navy/60">جاري التحميل...</p>
              ) : (
                <div className="space-y-2">
                  {branches?.map((branch) => (
                    <div key={branch.id} className="flex items-center gap-3 p-3 bg-gold/5 rounded-lg">
                      <Building2 className="h-5 w-5 text-gold" />
                      <div>
                        <p className="font-semibold text-navy">{branch.nameAr}</p>
                        <p className="text-sm text-navy/60">{branch.code}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-geometric">
            <CardHeader>
              <CardTitle className="text-navy">الموظفون</CardTitle>
              <CardDescription>الموظفون النشطون في الفرع</CardDescription>
            </CardHeader>
            <CardContent>
              {employeesLoading ? (
                <p className="text-navy/60">جاري التحميل...</p>
              ) : (
                <div className="space-y-2">
                  {employees?.slice(0, 5).map((employee) => (
                    <div key={employee.id} className="flex items-center gap-3 p-3 bg-gold/5 rounded-lg">
                      <Users className="h-5 w-5 text-gold" />
                      <div>
                        <p className="font-semibold text-navy">{employee.name}</p>
                        <p className="text-sm text-navy/60">{employee.position || "موظف"}</p>
                      </div>
                    </div>
                  ))}
                  {!employees || employees.length === 0 && (
                    <p className="text-navy/60 text-center py-4">لا يوجد موظفون</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="card-geometric">
          <CardHeader>
            <CardTitle className="text-navy">النشاط الأخير</CardTitle>
            <CardDescription>آخر الإيرادات المسجلة</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <p className="text-navy/60 text-center py-4">جاري التحميل...</p>
            ) : !recentRevenues || recentRevenues.length === 0 ? (
              <p className="text-navy/60 text-center py-8">
                لا توجد إيرادات مسجلة بعد
              </p>
            ) : (
              <div className="space-y-3">
                {recentRevenues.map((revenue) => {
                  const date = new Date(revenue.date);
                  const dateStr = date.toLocaleDateString('ar-SA', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  });
                  
                  return (
                    <div 
                      key={revenue.id} 
                      className="flex items-center justify-between p-3 bg-gold/5 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          revenue.isMatched 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-navy">{dateStr}</p>
                          <p className="text-sm text-navy/60">
                            {revenue.isMatched ? '✓ متطابق' : '✗ غير متطابق'}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-navy">
                          {Number(revenue.total).toLocaleString()} ر.س
                        </p>
                        <p className="text-xs text-navy/60">
                          نقد: {Number(revenue.cash).toLocaleString()} | 
                          شبكة: {Number(revenue.network).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
