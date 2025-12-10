import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranch } from "@/contexts/BranchContext";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ShoppingCart,
  ClipboardList,
  Package
} from "lucide-react";

const COLORS = {
  approved: "#10b981",
  rejected: "#ef4444",
  pending: "#f59e0b",
  delivered: "#8b5cf6",
  primary: "#c9a961",
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  advance: "سلفة",
  leave: "إجازة",
  arrears: "صرف متأخرات",
  permission: "استئذان",
  violation_objection: "اعتراض على مخالفة",
  resignation: "استقالة",
};

export default function RequestAnalyticsPage() {
  const { selectedBranchId, isAdmin } = useBranch();
  const [timeRange, setTimeRange] = useState<string>("30");

  // Fetch branches for admin
  const { data: branches } = trpc.branches.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  // Fetch analytics data
  const { data: statistics, isLoading: statsLoading } = trpc.analytics.getRequestStatistics.useQuery({
    branchId: selectedBranchId || undefined,
  });

  const { data: trends, isLoading: trendsLoading } = trpc.analytics.getRequestTrends.useQuery({
    branchId: selectedBranchId || undefined,
    days: parseInt(timeRange),
  });

  const { data: approvalRates, isLoading: ratesLoading } = trpc.analytics.getApprovalRatesByType.useQuery({
    branchId: selectedBranchId || undefined,
  });

  const { data: topProducts, isLoading: productsLoading } = trpc.analytics.getTopProducts.useQuery({
    branchId: selectedBranchId || undefined,
    limit: 10,
  });

  const { data: processingTime, isLoading: timeLoading } = trpc.analytics.getAverageProcessingTime.useQuery({
    branchId: selectedBranchId || undefined,
  });

  const isLoading = statsLoading || trendsLoading || ratesLoading || productsLoading || timeLoading;

  // Prepare pie chart data for employee requests
  const requestsPieData = statistics?.employeeRequests ? [
    { name: "مقبول", value: statistics.employeeRequests.approved, color: COLORS.approved },
    { name: "مرفوض", value: statistics.employeeRequests.rejected, color: COLORS.rejected },
    { name: "تحت الإجراء", value: statistics.employeeRequests.pending, color: COLORS.pending },
  ].filter(item => item.value > 0) : [];

  // Prepare pie chart data for product orders
  const ordersPieData = statistics?.productOrders ? [
    { name: "مقبول", value: statistics.productOrders.approved, color: COLORS.approved },
    { name: "مرفوض", value: statistics.productOrders.rejected, color: COLORS.rejected },
    { name: "تحت الإجراء", value: statistics.productOrders.pending, color: COLORS.pending },
    { name: "تم التسليم", value: statistics.productOrders.delivered, color: COLORS.delivered },
  ].filter(item => item.value > 0) : [];

  // Prepare approval rates bar chart data
  const approvalRatesData = approvalRates?.map(item => ({
    name: REQUEST_TYPE_LABELS[item.requestType] || item.requestType,
    approved: item.approved,
    rejected: item.rejected,
    pending: item.pending,
    rate: parseFloat(item.approvalRate),
  })) || [];

  return (
    <DashboardLayout>
      <div className="container py-8" dir="rtl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-navy">تحليلات الطلبات</h1>
            <p className="text-navy/60 mt-2">إحصائيات شاملة لطلبات الموظفين والمنتجات</p>
          </div>
          
          <div className="flex gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">آخر 7 أيام</SelectItem>
                <SelectItem value="30">آخر 30 يوم</SelectItem>
                <SelectItem value="90">آخر 3 أشهر</SelectItem>
                <SelectItem value="365">آخر سنة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-gold/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-navy/60">
                    إجمالي طلبات الموظفين
                  </CardTitle>
                  <ClipboardList className="h-5 w-5 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-navy">
                    {statistics?.employeeRequests.total || 0}
                  </div>
                  <p className="text-sm text-navy/60 mt-2">
                    معدل الموافقة: {statistics?.employeeRequests.approvalRate}%
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gold/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-navy/60">
                    إجمالي طلبات المنتجات
                  </CardTitle>
                  <ShoppingCart className="h-5 w-5 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-navy">
                    {statistics?.productOrders.total || 0}
                  </div>
                  <p className="text-sm text-navy/60 mt-2">
                    معدل الموافقة: {statistics?.productOrders.approvalRate}%
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gold/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-navy/60">
                    قيمة الطلبات الإجمالية
                  </CardTitle>
                  <Package className="h-5 w-5 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-navy">
                    {statistics?.productOrders.totalValue?.toFixed(0) || 0}
                  </div>
                  <p className="text-sm text-navy/60 mt-2">ريال سعودي</p>
                </CardContent>
              </Card>

              <Card className="border-gold/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-navy/60">
                    متوسط وقت المعالجة
                  </CardTitle>
                  <Clock className="h-5 w-5 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-navy">
                    {processingTime?.averageProcessingDays || 0}
                  </div>
                  <p className="text-sm text-navy/60 mt-2">يوم</p>
                </CardContent>
              </Card>
            </div>

            {/* Status Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-gold/20">
                <CardHeader>
                  <CardTitle className="text-navy">توزيع حالات طلبات الموظفين</CardTitle>
                </CardHeader>
                <CardContent>
                  {requestsPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={requestsPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {requestsPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-navy/60">
                      لا توجد بيانات
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-gold/20">
                <CardHeader>
                  <CardTitle className="text-navy">توزيع حالات طلبات المنتجات</CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={ordersPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {ordersPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-navy/60">
                      لا توجد بيانات
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Trends Chart */}
            <Card className="border-gold/20">
              <CardHeader>
                <CardTitle className="text-navy">اتجاهات الطلبات - آخر {timeRange} يوم</CardTitle>
              </CardHeader>
              <CardContent>
                {trends?.employeeRequests && trends.employeeRequests.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={trends.employeeRequests}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" stroke="#c9a961" name="الإجمالي" strokeWidth={2} />
                      <Line type="monotone" dataKey="approved" stroke="#10b981" name="مقبول" strokeWidth={2} />
                      <Line type="monotone" dataKey="rejected" stroke="#ef4444" name="مرفوض" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-navy/60">
                    لا توجد بيانات للفترة المحددة
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approval Rates by Type */}
            <Card className="border-gold/20">
              <CardHeader>
                <CardTitle className="text-navy">معدلات الموافقة حسب نوع الطلب</CardTitle>
              </CardHeader>
              <CardContent>
                {approvalRatesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={approvalRatesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="approved" fill={COLORS.approved} name="مقبول" />
                      <Bar dataKey="rejected" fill={COLORS.rejected} name="مرفوض" />
                      <Bar dataKey="pending" fill={COLORS.pending} name="تحت الإجراء" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-navy/60">
                    لا توجد بيانات
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card className="border-gold/20">
              <CardHeader>
                <CardTitle className="text-navy">أكثر المنتجات طلباً</CardTitle>
              </CardHeader>
              <CardContent>
                {topProducts && topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-cream/30 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-gold/20 rounded-full text-gold font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-navy">{product.name}</p>
                            <p className="text-sm text-navy/60">{product.totalOrders} طلب</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-2xl font-bold text-navy">{product.totalQuantity}</p>
                          <p className="text-sm text-navy/60">إجمالي الكمية</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-navy/60">
                    لا توجد بيانات
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Processing Time Details */}
            <Card className="border-gold/20">
              <CardHeader>
                <CardTitle className="text-navy">تفاصيل وقت المعالجة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-cream/30 rounded-lg">
                    <p className="text-sm text-navy/60 mb-2">إجمالي الطلبات</p>
                    <p className="text-3xl font-bold text-navy">{processingTime?.totalRequests || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-cream/30 rounded-lg">
                    <p className="text-sm text-navy/60 mb-2">الطلبات المعالجة</p>
                    <p className="text-3xl font-bold text-green-600">{processingTime?.processedRequests || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-cream/30 rounded-lg">
                    <p className="text-sm text-navy/60 mb-2">الطلبات المعلقة</p>
                    <p className="text-3xl font-bold text-orange-500">{processingTime?.pendingRequests || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-cream/30 rounded-lg">
                    <p className="text-sm text-navy/60 mb-2">متوسط الوقت (ساعات)</p>
                    <p className="text-3xl font-bold text-navy">{processingTime?.averageProcessingHours || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
