/**
 * Analytics Dashboard Page
 * Financial analytics with Chart.js visualizations
 */

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { formatCurrency } from "@/utils/formatters";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics() {
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>();

  // Fetch data
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery({ branchId: selectedBranchId });
  const { data: branches } = trpc.branches.list.useQuery();
  const { data: topExpenseCategories } = trpc.dashboard.getTopExpenseCategories.useQuery({
    branchId: selectedBranchId,
    limit: 5,
  });

  // Mock revenue trend data (last 30 days)
  // TODO: Add API endpoint for revenue trend
  const revenueTrendData = useMemo(() => {
    const labels = [];
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }));
      data.push(Math.random() * 5000 + 2000); // Mock data
    }
    return { labels, data };
  }, []);

  // KPI Cards
  const kpiCards = [
    {
      title: "صافي الربح",
      value: stats ? formatCurrency(stats.netProfit) : "...",
      icon: "💰",
      color: "bg-green-50 border-green-200",
      textColor: "text-green-700",
    },
    {
      title: "إجمالي الإيرادات",
      value: stats ? formatCurrency(stats.totalRevenue) : "...",
      icon: "📈",
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-700",
    },
    {
      title: "إجمالي المصروفات",
      value: stats ? formatCurrency(stats.totalExpenses) : "...",
      icon: "📉",
      color: "bg-red-50 border-red-200",
      textColor: "text-red-700",
    },
    {
      title: "الرصيد النقدي",
      value: stats ? formatCurrency(stats.cashBalance) : "...",
      icon: "💵",
      color: "bg-yellow-50 border-yellow-200",
      textColor: "text-yellow-700",
    },
  ];

  // Chart: Revenue Trend (Line)
  const revenueTrendChartData = {
    labels: revenueTrendData.labels,
    datasets: [
      {
        label: 'الإيرادات اليومية',
        data: revenueTrendData.data,
        borderColor: 'rgb(193, 154, 91)',
        backgroundColor: 'rgba(193, 154, 91, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Chart: Expense Categories (Pie)
  const expenseCategoriesChartData = {
    labels: topExpenseCategories?.map(cat => cat.categoryName) || [],
    datasets: [
      {
        label: 'المبلغ (ر.س)',
        data: topExpenseCategories?.map(cat => parseFloat(cat.total || '0')) || [],
        backgroundColor: [
          'rgba(217, 83, 79, 0.8)',
          'rgba(240, 173, 78, 0.8)',
          'rgba(91, 192, 222, 0.8)',
          'rgba(92, 184, 92, 0.8)',
          'rgba(193, 154, 91, 0.8)',
        ],
        borderColor: [
          'rgb(217, 83, 79)',
          'rgb(240, 173, 78)',
          'rgb(91, 192, 222)',
          'rgb(92, 184, 92)',
          'rgb(193, 154, 91)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Chart: Revenue vs Expenses (Bar)
  const revenueVsExpensesChartData = {
    labels: ['الإيرادات', 'المصروفات', 'صافي الربح'],
    datasets: [
      {
        label: 'المبلغ (ر.س)',
        data: [
          stats?.totalRevenue || 0,
          stats?.totalExpenses || 0,
          stats?.netProfit || 0,
        ],
        backgroundColor: [
          'rgba(92, 184, 92, 0.8)',
          'rgba(217, 83, 79, 0.8)',
          'rgba(193, 154, 91, 0.8)',
        ],
        borderColor: [
          'rgb(92, 184, 92)',
          'rgb(217, 83, 79)',
          'rgb(193, 154, 91)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        rtl: true,
        labels: {
          font: {
            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          },
        },
      },
      tooltip: {
        rtl: true,
        titleFont: {
          family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        },
        bodyFont: {
          family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          },
        },
      },
      x: {
        ticks: {
          font: {
            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          },
        },
      },
    },
  };

  if (statsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">📊 التحليلات المالية</h1>
            <p className="text-muted-foreground mt-1">
              تحليل شامل للأداء المالي مع مخططات تفاعلية
            </p>
          </div>

          {/* Branch Filter (for admins) */}
          <div className="w-64">
            <Select
              value={selectedBranchId?.toString() || "all"}
              onValueChange={(value) => setSelectedBranchId(value === "all" ? undefined : parseInt(value))}
            >
              <option value="all">جميع الفروع</option>
              {branches?.map((branch: any) => (
                <option key={branch.id} value={branch.id.toString()}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((kpi, index) => (
            <Card key={index} className={`p-6 border-2 ${kpi.color}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{kpi.title}</p>
                  <p className={`text-2xl font-bold ${kpi.textColor}`}>{kpi.value}</p>
                </div>
                <div className="text-4xl">{kpi.icon}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">📈 اتجاه الإيرادات (آخر 30 يوم)</h3>
            <div className="h-[300px]">
              <Line data={revenueTrendChartData} options={chartOptions} />
            </div>
          </Card>

          {/* Expense Categories Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">📂 توزيع المصروفات (أكبر 5 فئات)</h3>
            <div className="h-[300px] flex items-center justify-center">
              {topExpenseCategories && topExpenseCategories.length > 0 ? (
                <Pie data={expenseCategoriesChartData} options={chartOptions} />
              ) : (
                <p className="text-muted-foreground">لا توجد بيانات مصروفات</p>
              )}
            </div>
          </Card>

          {/* Revenue vs Expenses Chart */}
          <Card className="p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">⚖️ مقارنة الإيرادات والمصروفات</h3>
            <div className="h-[300px]">
              <Bar data={revenueVsExpensesChartData} options={chartOptions} />
            </div>
          </Card>
        </div>

        {/* Insights Section */}
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            💡 رؤى وتوصيات
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            {stats && stats.netProfit > 0 ? (
              <p>✅ <strong>أداء إيجابي:</strong> صافي الربح {formatCurrency(stats.netProfit)} يشير إلى صحة مالية جيدة.</p>
            ) : (
              <p>⚠️ <strong>تحذير:</strong> صافي الربح سلبي. يُرجى مراجعة المصروفات وتحسين الإيرادات.</p>
            )}
            {topExpenseCategories && topExpenseCategories.length > 0 && (
              <p>📊 <strong>أكبر فئة مصروفات:</strong> {topExpenseCategories[0].categoryName} بمبلغ {formatCurrency(parseFloat(topExpenseCategories[0].total || '0'))}</p>
            )}
            <p>💡 <strong>نصيحة:</strong> راجع التقارير الشهرية بانتظام لتحديد فرص التحسين.</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
