import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBranch } from "@/contexts/BranchContext";
import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, DollarSign, Printer, FileDown, Calendar } from "lucide-react";
import { RevenueReport } from "@/components/RevenueReport";
import { generateAndDownloadRevenuePDF } from "@/utils/pdfGenerator";
import { exportRevenuesToExcel } from "@/utils/excelExporter";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { formatDate, toISOString, getTodayMidnight, toDateInputValue, fromDateInputValue } from "@/utils/dateUtils";
import { calculateTotal, calculateBalance, validateRevenueMatching, formatCurrency, sum } from "@/utils/calculations";

export default function Revenues() {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Local branch selection for admins
  const [localBranchId, setLocalBranchId] = useState<number | null>(null);
  
  // For managers: use their branchId, for admins: use local selection or context
  const effectiveBranchId = user?.role === "manager" 
    ? user.branchId 
    : (localBranchId || selectedBranchId);
  
  // Debug: log effective branch ID
  useEffect(() => {
    console.log("[Revenues] effectiveBranchId changed:", effectiveBranchId);
    console.log("[Revenues] localBranchId:", localBranchId);
    console.log("[Revenues] selectedBranchId:", selectedBranchId);
    console.log("[Revenues] user.role:", user?.role);
  }, [effectiveBranchId, localBranchId, selectedBranchId, user?.role]);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date>(getTodayMidnight());
  const [cash, setCash] = useState("");
  const [network, setNetwork] = useState("");
  const [balance, setBalance] = useState("");
  const [total, setTotal] = useState("");
  const [unmatchReason, setUnmatchReason] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([0, 0, 0, 0, 0]);
  const [employeeRevenues, setEmployeeRevenues] = useState<number[]>([0, 0, 0, 0, 0]);
  
  // Report state
  const [startDate, setStartDate] = useState<Date>(getTodayMidnight());
  const [endDate, setEndDate] = useState<Date>(getTodayMidnight());
  const [showReport, setShowReport] = useState(false);

  const { data: employees, isLoading: isLoadingEmployees } = trpc.employees.listByBranch.useQuery(
    { branchId: effectiveBranchId || 0 },
    { enabled: !!effectiveBranchId }
  );
  
  // Fetch recent revenues for history log
  const recentRevenuesQuery = trpc.revenues.getRecent.useQuery(
    { branchId: effectiveBranchId || undefined, limit: 10 },
    { enabled: !!effectiveBranchId }
  );
  
  // Debug: log employees data
  useEffect(() => {
    if (employees) {
      console.log('الموظفين المحملين:', employees);
    }
  }, [employees]);
  
  const { data: branches } = trpc.branches.list.useQuery();
  const currentBranch = branches?.find(b => b.id === effectiveBranchId);

  const utils = trpc.useUtils();
  const createRevenueMutation = trpc.revenues.createDaily.useMutation({
    onSuccess: () => {
      // Invalidate recent revenues to refresh the history log
      utils.revenues.getRecent.invalidate();
      utils.dashboard.getStats.invalidate();
    },
  });
  
  // Memoize query parameters to ensure stable references for React Query
  const queryParams = useMemo(() => ({
    branchId: effectiveBranchId || 0,
    startDate: toISOString(startDate),
    endDate: toISOString(endDate),
  }), [effectiveBranchId, startDate, endDate]);
  
  // Fetch real revenue data by date range
  const { data: revenueData, isLoading: isLoadingRevenues, refetch: refetchRevenues } = trpc.revenues.getByDateRange.useQuery(
    queryParams,
    { enabled: !!effectiveBranchId && showReport }
  );
  
  // Debug: log revenue query state
  useEffect(() => {
    console.log("[Revenue Query] State:", {
      effectiveBranchId,
      showReport,
      enabled: !!effectiveBranchId && showReport,
      startDate: toISOString(startDate),
      endDate: toISOString(endDate),
      isLoading: isLoadingRevenues,
      dataCount: revenueData?.length || 0
    });
  }, [effectiveBranchId, showReport, startDate, endDate, isLoadingRevenues, revenueData]);

  // Calculate totals and check if matched (using Decimal.js for precision)
  const cashNum = parseFloat(cash) || 0;
  const networkNum = parseFloat(network) || 0;
  const employeeTotalRevenue = sum(employeeRevenues);
  
  // Auto-calculated values (read-only) - using Decimal.js
  const totalNum = calculateTotal(cashNum, networkNum); // المجموع = الكاش + الشبكة
  const balanceNum = calculateBalance(employeeTotalRevenue, cashNum); // الموازنة = إيرادات الموظفين - الكاش
  
  // Accounting validation logic (using validateRevenueMatching)
  const validationResult = validateRevenueMatching(balanceNum, networkNum, totalNum, cashNum, employeeTotalRevenue);
  const isFullyMatched = validationResult.isMatched;

  // Auto-update total and balance display (for form submission)
  useEffect(() => {
    setTotal(totalNum.toFixed(2));
  }, [totalNum]);

  useEffect(() => {
    setBalance(balanceNum.toFixed(2));
  }, [balanceNum]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation 1: Branch selection
    if (!effectiveBranchId) {
      toast.error("يرجى اختيار الفرع أولاً");
      return;
    }

    // Validation 2: Cash and Network must be positive
    if (cashNum < 0 || networkNum < 0) {
      toast.error("الكاش والشبكة يجب أن تكون أرقام موجبة");
      return;
    }

    // Validation 3: At least one value must be entered
    if (cashNum === 0 && networkNum === 0) {
      toast.error("يجب إدخال قيمة للكاش أو الشبكة على الأقل");
      return;
    }

    // Validation 4: Employee revenues must be entered
    if (employeeTotalRevenue === 0) {
      toast.error("يجب إدخال إيرادات الموظفين");
      return;
    }

    // Validation 5: Unmatch reason required if not matched
    if (!isFullyMatched && !unmatchReason.trim()) {
      toast.error("يرجى إدخال سبب عدم التطابق");
      return;
    }

    try {
      await createRevenueMutation.mutateAsync({
        branchId: effectiveBranchId,
        date: toISOString(selectedDate),
        cash: cashNum.toString(),
        network: networkNum.toString(),
        balance: balanceNum.toString(),
        total: totalNum.toString(),
        isMatched: isFullyMatched,
        unmatchReason: isFullyMatched ? undefined : unmatchReason,
        employeeRevenues: selectedEmployees
          .map((empId, idx) => ({
            employeeId: empId,
            cash: employeeRevenues[idx].toString(),
            network: "0",
            total: employeeRevenues[idx].toString(),
          }))
          .filter((er) => er.employeeId > 0 && parseFloat(er.cash) > 0),
      });

      toast.success("تم حفظ الإيراد اليومي بنجاح");
      
      // Reset form
      setCash("");
      setNetwork("");
      setBalance("");
      setTotal("");
      setUnmatchReason("");
      setSelectedEmployees([0, 0, 0, 0, 0]);
      setEmployeeRevenues([0, 0, 0, 0, 0]);
    } catch (error) {
      toast.error("فشل حفظ الإيراد");
      console.error(error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    console.log("[PDF Export] Starting...");
    console.log("[PDF Export] revenueData:", revenueData);
    console.log("[PDF Export] currentBranch:", currentBranch);
    console.log("[PDF Export] user:", user);
    console.log("[PDF Export] startDate:", startDate);
    console.log("[PDF Export] endDate:", endDate);
    
    if (!revenueData || revenueData.length === 0) {
      toast.error("لا توجد بيانات لتصديرها");
      return;
    }

    try {
      toast.info("جاري إنشاء ملف PDF...");
      
      const pdfOptions = {
        branchName: currentBranch?.nameAr || "غير محدد",
        managerName: user?.name || "غير محدد",
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        revenues: revenueData.map(rev => ({
          date: typeof rev.date === 'string' ? rev.date : rev.date.toISOString(),
          cash: parseFloat(rev.cash),
          network: parseFloat(rev.network),
          total: parseFloat(rev.total),
          balance: parseFloat(rev.balance),
        })),
      };
      
      console.log("[PDF Export] Options:", pdfOptions);
      
      await generateAndDownloadRevenuePDF(pdfOptions);
      
      toast.success("تم تصدير التقرير بنجاح");
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("فشل تصدير التقرير");
    }
  };

  const handleExportExcel = () => {
    if (!revenueData || revenueData.length === 0) {
      toast.error("لا توجد بيانات لتصديرها");
      return;
    }

    try {
      toast.info("جاري إنشاء ملف Excel...");
      
      exportRevenuesToExcel(
        revenueData.map(rev => ({
          date: typeof rev.date === 'string' ? rev.date : rev.date.toISOString(),
          cash: parseFloat(rev.cash),
          network: parseFloat(rev.network),
          total: parseFloat(rev.total),
          balance: parseFloat(rev.balance),
          isMatched: rev.isMatched,
          branchName: currentBranch?.nameAr,
        })),
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          branchName: currentBranch?.nameAr,
        }
      );
      
      toast.success("تم تصدير التقرير بنجاح");
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error("فشل تصدير التقرير");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Branch Selector for Admins */}
        {user?.role === "admin" && (
          <Card className="card-geometric">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Label className="text-navy font-semibold whitespace-nowrap">
                  اختر الفرع:
                </Label>
                <Select
                  value={localBranchId?.toString() || ""}
                  onValueChange={(value) => {
                    const branchId = value ? Number(value) : null;
                    console.log("Branch selected:", branchId);
                    setLocalBranchId(branchId);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر فرعاً" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-navy mb-2">الإيرادات</h1>
            <p className="text-navy/60">إدخال الإيراد اليومي</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReport(!showReport)}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {showReport ? "إخفاء التقرير" : "عرض التقرير"}
            </Button>
          </div>
        </div>

        {showReport && (
          <Card className="card-geometric">
            <CardHeader>
              <CardTitle className="text-navy">تقرير الإيرادات</CardTitle>
              <CardDescription>اختر الفترة الزمنية للتقرير</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>من تاريخ</Label>
                  <Input
                    type="date"
                    autoComplete="off"
                    value={toDateInputValue(startDate)}
                    onChange={(e) => {
                      console.log("[Start Date Change]", e.target.value);
                      const newDate = fromDateInputValue(e.target.value);
                      console.log("[Start Date Parsed]", newDate);
                      setStartDate(newDate);
                    }}
                  />
                </div>
                <div>
                  <Label>إلى تاريخ</Label>
                  <Input
                    type="date"
                    autoComplete="off"
                    value={toDateInputValue(endDate)}
                    onChange={(e) => {
                      console.log("[End Date Change]", e.target.value);
                      const newDate = fromDateInputValue(e.target.value);
                      console.log("[End Date Parsed]", newDate);
                      setEndDate(newDate);
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handlePrint} className="gap-2">
                  <Printer className="h-4 w-4" />
                  طباعة
                </Button>
                <Button onClick={handleExportPDF} variant="outline" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  تصدير PDF
                </Button>
                <Button onClick={handleExportExcel} variant="outline" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  تصدير Excel
                </Button>
              </div>

              {isLoadingRevenues && (
                <div className="text-center py-4">
                  <p className="text-navy/60">جاري تحميل البيانات...</p>
                </div>
              )}
              
              {!isLoadingRevenues && revenueData && revenueData.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-navy/60">لا توجد بيانات في هذه الفترة</p>
                </div>
              )}
              
              {!isLoadingRevenues && revenueData && revenueData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-golden text-white">
                        <th className="p-2 text-right">التاريخ</th>
                        <th className="p-2 text-right">الكاش</th>
                        <th className="p-2 text-right">الشبكة</th>
                        <th className="p-2 text-right">الإجمالي</th>
                        <th className="p-2 text-right">الرصيد</th>
                        <th className="p-2 text-right">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueData.map((rev, idx) => (
                        <tr key={rev.id} className={idx % 2 === 0 ? 'bg-cream/30' : ''}>
                          <td className="p-2">{format(new Date(rev.date), "dd/MM/yyyy")}</td>
                          <td className="p-2">{parseFloat(rev.cash).toLocaleString('ar-SA', {minimumFractionDigits: 2})}</td>
                          <td className="p-2">{parseFloat(rev.network).toLocaleString('ar-SA', {minimumFractionDigits: 2})}</td>
                          <td className="p-2">{parseFloat(rev.total).toLocaleString('ar-SA', {minimumFractionDigits: 2})}</td>
                          <td className="p-2">{parseFloat(rev.balance).toLocaleString('ar-SA', {minimumFractionDigits: 2})}</td>
                          <td className="p-2">
                            {rev.isMatched ? (
                              <span className="text-green-600">✓ متطابق</span>
                            ) : (
                              <span className="text-red-600">✗ غير متطابق</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-golden text-white font-bold">
                        <td className="p-2">الإجمالي</td>
                        <td className="p-2">{revenueData.reduce((sum, r) => sum + parseFloat(r.cash), 0).toLocaleString('ar-SA', {minimumFractionDigits: 2})}</td>
                        <td className="p-2">{revenueData.reduce((sum, r) => sum + parseFloat(r.network), 0).toLocaleString('ar-SA', {minimumFractionDigits: 2})}</td>
                        <td className="p-2">{revenueData.reduce((sum, r) => sum + parseFloat(r.total), 0).toLocaleString('ar-SA', {minimumFractionDigits: 2})}</td>
                        <td className="p-2">{revenueData.reduce((sum, r) => sum + parseFloat(r.balance), 0).toLocaleString('ar-SA', {minimumFractionDigits: 2})}</td>
                        <td className="p-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
              }
              
              <div ref={reportRef} className="hidden print:block">
                {revenueData && revenueData.length > 0 && (
                  <RevenueReport
                    branchName={currentBranch?.nameAr || "غير محدد"}
                    managerName={user?.name || "غير محدد"}
                    startDate={formatDate(startDate)}
                    endDate={formatDate(endDate)}
                    revenues={revenueData.map(rev => ({
                      date: typeof rev.date === 'string' ? rev.date : rev.date.toISOString(),
                      cash: parseFloat(rev.cash),
                      network: parseFloat(rev.network),
                      total: parseFloat(rev.total),
                      balance: parseFloat(rev.balance),
                    }))}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="card-geometric">
          <CardHeader>
            <CardTitle className="text-navy">إدخال الإيراد اليومي</CardTitle>
            <CardDescription>
              اختر التاريخ وأدخل بيانات الإيراد
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date Picker */}
              <div className="max-w-xs">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={toDateInputValue(selectedDate)}
                  onChange={(e) => setSelectedDate(fromDateInputValue(e.target.value))}
                  max={toDateInputValue(getTodayMidnight())}
                  className="text-right"
                />
                <p className="text-xs text-navy/60 mt-1" dir="rtl">
                  {formatDate(selectedDate)}
                </p>
              </div>

              {/* Financial Inputs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>الكاش</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label>الشبكة</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label>المجموع (تلقائي)</Label>
                  <Input
                    type="text"
                    value={totalNum.toFixed(2)}
                    readOnly
                    disabled
                    className="bg-cream/50 cursor-not-allowed font-semibold"
                  />
                </div>
                <div>
                  <Label>الموازنة (تلقائي)</Label>
                  <Input
                    type="text"
                    value={balanceNum.toFixed(2)}
                    readOnly
                    disabled
                    className="bg-cream/50 cursor-not-allowed font-semibold"
                  />
                </div>
              </div>

              {/* Employee Revenue Inputs */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">إيرادات الموظفين</Label>
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>الموظف {idx + 1}</Label>
                      <Select
                        value={selectedEmployees[idx]?.toString() || "0"}
                        onValueChange={(value) => {
                          const newSelected = [...selectedEmployees];
                          newSelected[idx] = parseInt(value);
                          setSelectedEmployees(newSelected);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الموظف" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">-- اختر الموظف --</SelectItem>
                          {isLoadingEmployees && (
                            <SelectItem value="-1" disabled>جاري التحميل...</SelectItem>
                          )}
                          {!isLoadingEmployees && employees && employees.length === 0 && (
                            <SelectItem value="-1" disabled>لا يوجد موظفين</SelectItem>
                          )}
                          {employees?.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>المبلغ</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={employeeRevenues[idx] || ""}
                        onChange={(e) => {
                          const newRevenues = [...employeeRevenues];
                          newRevenues[idx] = parseFloat(e.target.value) || 0;
                          setEmployeeRevenues(newRevenues);
                        }}
                        placeholder="0.00"
                        disabled={!selectedEmployees[idx]}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Validation Indicator */}
              <div className="p-4 rounded-lg border-2" style={{
                borderColor: isFullyMatched ? "#10b981" : "#ef4444",
                backgroundColor: isFullyMatched ? "#10b98110" : "#ef444410"
              }}>
                <div className="flex items-center gap-2 mb-2">
                  {isFullyMatched ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-700">الحسابات متطابقة ✓</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-semibold text-red-700">الحسابات غير متطابقة ✗</span>
                    </>
                  )}
                </div>
                <div className="text-sm space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <p>إجمالي إيرادات الموظفين: <strong>{employeeTotalRevenue.toFixed(2)}</strong> ر.س</p>
                    <p>المجموع المحسوب: <strong>{totalNum.toFixed(2)}</strong> ر.س</p>
                    <p>الموازنة المحسوبة: <strong>{balanceNum.toFixed(2)}</strong> ر.س</p>
                    <p>الشبكة: <strong>{networkNum.toFixed(2)}</strong> ر.س</p>
                  </div>
                  <div className="pt-2 border-t border-navy/10">
                    {validationResult.isMatched ? (
                      <p className="text-green-600">✓ جميع الحسابات متطابقة</p>
                    ) : (
                      <div className="space-y-1">
                        {validationResult.reasons.map((reason, idx) => (
                          <p key={idx} className="text-red-600 text-sm">✗ {reason}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Unmatch Reason */}
              {!isFullyMatched && (
                <div>
                  <Label>سبب عدم التطابق (مطلوب)</Label>
                  <Textarea
                    value={unmatchReason}
                    onChange={(e) => setUnmatchReason(e.target.value)}
                    placeholder="اكتب سبب عدم تطابق الحسابات..."
                    rows={3}
                    required
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={createRevenueMutation.isPending || (!isFullyMatched && !unmatchReason.trim())}
              >
                {createRevenueMutation.isPending ? "جاري الحفظ..." : "حفظ الإيراد اليومي"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Revenue History Log */}
        <Card className="card-geometric">
          <CardHeader>
            <CardTitle className="text-navy">سجل الإيرادات</CardTitle>
            <CardDescription>آخر الإيرادات المسجلة</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRevenuesQuery.isLoading ? (
              <p className="text-navy/60 text-center py-4">جاري التحميل...</p>
            ) : !recentRevenuesQuery.data || recentRevenuesQuery.data.length === 0 ? (
              <p className="text-navy/60 text-center py-8">
                لا توجد إيرادات مسجلة بعد
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy/10">
                      <th className="text-right py-3 px-2 text-sm font-semibold text-navy">التاريخ</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-navy">الكاش</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-navy">الشبكة</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-navy">المجموع</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-navy">الموازنة</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-navy">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRevenuesQuery.data.map((revenue) => {
                      const dateStr = formatDate(revenue.date);
                      
                      return (
                        <tr key={revenue.id} className="border-b border-navy/5 hover:bg-gold/5">
                          <td className="py-3 px-2 text-sm text-navy">{dateStr}</td>
                          <td className="py-3 px-2 text-sm text-navy">
                            {Number(revenue.cash).toLocaleString()} ر.س
                          </td>
                          <td className="py-3 px-2 text-sm text-navy">
                            {Number(revenue.network).toLocaleString()} ر.س
                          </td>
                          <td className="py-3 px-2 text-sm font-semibold text-navy">
                            {Number(revenue.total).toLocaleString()} ر.س
                          </td>
                          <td className="py-3 px-2 text-sm text-navy">
                            {Number(revenue.balance).toLocaleString()} ر.س
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              revenue.isMatched 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {revenue.isMatched ? '✓ متطابق' : '✗ غير متطابق'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
