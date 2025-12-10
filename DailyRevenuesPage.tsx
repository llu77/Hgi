import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { Calendar, DollarSign, TrendingUp, Calculator } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import Decimal from "decimal.js";
import BonusCalculationModal from "@/components/BonusCalculationModal";

export default function DailyRevenuesPage() {
  const { user } = useAuth();
  
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Bonus calculation state
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusResult, setBonusResult] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState(1);

  // Get effective branch ID
  const effectiveBranchId = user?.role === "admin" 
    ? selectedBranchId
    : user?.branchId;

  // Queries
  const { data: branchesData } = trpc.branches.list.useQuery();
  
  // Mutations
  const calculateBonusMutation = trpc.bonuses.calculate.useMutation();
  const { data: revenuesData, isLoading, refetch } = trpc.revenues.list.useQuery({
    branchId: effectiveBranchId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Calculate summary statistics
  const summary = revenuesData?.reduce(
    (acc: { totalCash: number; totalNetwork: number; grandTotal: number; count: number }, rev: any) => ({
      totalCash: new Decimal(acc.totalCash).add(rev.cash).toNumber(),
      totalNetwork: new Decimal(acc.totalNetwork).add(rev.network).toNumber(),
      grandTotal: new Decimal(acc.grandTotal).add(rev.cash).add(rev.network).toNumber(),
      count: acc.count + 1,
    }),
    { totalCash: 0, totalNetwork: 0, grandTotal: 0, count: 0 }
  ) || { totalCash: 0, totalNetwork: 0, grandTotal: 0, count: 0 };

  const handleReset = () => {
    setSelectedBranchId(null);
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="container py-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-navy">الإيرادات اليومية</h1>
          <p className="text-navy/60 mt-2">عرض وتحليل الإيرادات اليومية لجميع الفروع</p>
        </div>
        {user?.role === "manager" && (
          <Button
            onClick={() => setShowBonusModal(true)}
            className="bg-gold hover:bg-gold/90 text-navy"
          >
            <Calculator className="h-4 w-4 ml-2" />
            حساب البونص الأسبوعي
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-navy mb-4">الفلاتر</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Branch Filter (Admin only) */}
          {user?.role === "admin" && (
            <div>
              <Label>الفرع</Label>
              <Select
                value={selectedBranchId?.toString() || ""}
                onValueChange={(value) => setSelectedBranchId(value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="جميع الفروع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">جميع الفروع</SelectItem>
                  {branchesData?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.nameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Start Date */}
          <div>
            <Label>من تاريخ</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div>
            <Label>إلى تاريخ</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={() => refetch()} className="bg-navy hover:bg-navy/90">
            <TrendingUp className="w-4 h-4 ml-2" />
            تطبيق الفلاتر
          </Button>
          <Button onClick={handleReset} variant="outline">
            إعادة تعيين
          </Button>
        </div>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-navy/60">عدد السجلات</p>
              <p className="text-2xl font-bold text-navy">{summary.count}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-navy/60">إجمالي الكاش</p>
              <p className="text-2xl font-bold text-navy">{summary.totalCash.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-navy/60">إجمالي الشبكة</p>
              <p className="text-2xl font-bold text-navy">{summary.totalNetwork.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gold/20 rounded-lg">
              <Calculator className="w-6 h-6 text-gold" />
            </div>
            <div>
              <p className="text-sm text-navy/60">الإجمالي الكلي</p>
              <p className="text-2xl font-bold text-navy">{summary.grandTotal.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Revenues Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-navy mb-4">سجلات الإيرادات</h2>
        
        {isLoading ? (
          <div className="text-center py-8 text-navy/60">جاري التحميل...</div>
        ) : !revenuesData || revenuesData.length === 0 ? (
          <div className="text-center py-8 text-navy/60">
            لا توجد سجلات إيرادات
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الفرع</TableHead>
                  <TableHead className="text-right">الكاش (ريال)</TableHead>
                  <TableHead className="text-right">الشبكة (ريال)</TableHead>
                  <TableHead className="text-right">الإجمالي (ريال)</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenuesData.map((revenue: any, index: number) => {
                  const total = new Decimal(revenue.cash).add(revenue.network).toNumber();
                  return (
                    <TableRow key={revenue.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {format(new Date(revenue.date), "PPP", { locale: ar })}
                      </TableCell>
                      <TableCell>{revenue.branchName}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {Number(revenue.cash).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-semibold text-purple-600">
                        {Number(revenue.network).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-bold text-navy">
                        {total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-navy/60">
                        {format(new Date(revenue.createdAt), "PPp", { locale: ar })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Bonus Calculation Dialog */}
      {showBonusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBonusModal(false)}>
          <Card className="p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()} dir="rtl">
            <h2 className="text-2xl font-bold text-navy mb-4">حساب البونص الأسبوعي</h2>
            <p className="text-navy/60 mb-6">اختر الأسبوع لحساب البونص</p>

            <div className="space-y-4">
              {/* Year Selector */}
              <div>
                <Label>السنة</Label>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month Selector */}
              <div>
                <Label>الشهر</Label>
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { value: 1, label: "يناير" },
                      { value: 2, label: "فبراير" },
                      { value: 3, label: "مارس" },
                      { value: 4, label: "أبريل" },
                      { value: 5, label: "مايو" },
                      { value: 6, label: "يونيو" },
                      { value: 7, label: "يوليو" },
                      { value: 8, label: "أغسطس" },
                      { value: 9, label: "سبتمبر" },
                      { value: 10, label: "أكتوبر" },
                      { value: 11, label: "نوفمبر" },
                      { value: 12, label: "ديسمبر" },
                    ].map(month => (
                      <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Week Selector */}
              <div>
                <Label>الأسبوع</Label>
                <Select value={selectedWeek.toString()} onValueChange={(v) => setSelectedWeek(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { value: 1, label: "الأسبوع 1 (1-7)" },
                      { value: 2, label: "الأسبوع 2 (8-15)" },
                      { value: 3, label: "الأسبوع 3 (16-22)" },
                      { value: 4, label: "الأسبوع 4 (23-29)" },
                      { value: 5, label: "الأسبوع 5 (30-31)" },
                    ].map(week => (
                      <SelectItem key={week.value} value={week.value.toString()}>{week.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowBonusModal(false)} className="flex-1">
                إلغاء
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const result = await calculateBonusMutation.mutateAsync({
                      year: selectedYear,
                      month: selectedMonth,
                      weekNumber: selectedWeek,
                    });
                    setBonusResult(result);
                    setShowBonusModal(false);
                    toast.success("تم حساب البونص بنجاح");
                  } catch (error: any) {
                    toast.error(error.message || "فشل حساب البونص");
                  }
                }}
                disabled={calculateBonusMutation.isPending}
                className="bg-gold hover:bg-gold/90 text-navy flex-1"
              >
                <Calculator className="h-4 w-4 ml-2" />
                حساب
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Bonus Calculation Results Modal */}
      <BonusCalculationModal
        open={bonusResult !== null}
        onOpenChange={(open) => !open && setBonusResult(null)}
        result={bonusResult}
        year={selectedYear}
        month={selectedMonth}
        weekNumber={selectedWeek}
        onRequestBonus={() => {
          toast.success("تم إرسال طلب البونص للموافقة");
          setBonusResult(null);
        }}
      />
    </div>
  );
}
