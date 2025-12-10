import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, TrendingUp, Users, DollarSign, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function BonusHistoryPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<string | "all">("all");

  // Queries
  const { data: historyData, isLoading } = trpc.bonuses.history.useQuery({
    year: selectedYear,
    month: selectedMonth === "all" ? undefined : selectedMonth,
    status: selectedStatus === "all" ? undefined : (selectedStatus as "pending" | "requested" | "approved" | "rejected"),
  });

  const history = historyData?.history || [];
  const stats = historyData?.stats || {
    totalPaid: 0,
    averagePerEmployee: 0,
    approvalRate: 0,
    pendingCount: 0,
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
            <History className="h-8 w-8 text-gold" />
            تاريخ حسابات البونص
          </h1>
          <p className="text-gray-600 mt-2">
            عرض وتحليل جميع حسابات البونص السابقة
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">إجمالي المدفوع</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {stats.totalPaid.toFixed(2)} ر.س
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-green-600" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">متوسط البونص</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {stats.averagePerEmployee.toFixed(2)} ر.س
              </p>
            </div>
            <Users className="h-10 w-10 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">معدل الموافقة</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {stats.approvalRate.toFixed(1)}%
              </p>
            </div>
            <CheckCircle className="h-10 w-10 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium">قيد الانتظار</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                {stats.pendingCount}
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              السنة
            </label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الشهر
            </label>
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) =>
                setSelectedMonth(value === "all" ? "all" : parseInt(value))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأشهر</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {format(new Date(2025, month - 1), "MMMM", { locale: ar })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحالة
            </label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="approved">موافق عليه</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* History Table */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-navy mb-4">سجل الحسابات</h2>
        
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            لا توجد حسابات بونص في الفترة المحددة
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الأسبوع</TableHead>
                  <TableHead className="text-right">الفرع</TableHead>
                  <TableHead className="text-right">المبلغ الإجمالي</TableHead>
                  <TableHead className="text-right">عدد الموظفين</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      الأسبوع {item.weekNumber} - {item.month}/{item.year}
                    </TableCell>
                    <TableCell>{item.branchName}</TableCell>
                    <TableCell className="font-bold text-green-700">
                      {parseFloat(item.totalAmount).toFixed(2)} ر.س
                    </TableCell>
                    <TableCell>{item.eligibleEmployees}</TableCell>
                    <TableCell>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : item.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : item.status === "paid"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.status === "pending"
                          ? "قيد الانتظار"
                          : item.status === "approved"
                          ? "موافق عليه"
                          : item.status === "rejected"
                          ? "مرفوض"
                          : "مدفوع"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.createdAt), "dd/MM/yyyy", {
                        locale: ar,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
