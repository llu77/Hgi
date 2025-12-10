import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBranch } from "@/contexts/BranchContext";
import { useState, useMemo } from "react";
import { formatDate, toDateInputValue, getTodayMidnight } from "@/utils/dateUtils";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "sonner";
import { FileText, Download, FileSpreadsheet } from "lucide-react";
import { exportExpensesToExcel } from "@/utils/excelExporter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Expenses() {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  
  // For managers: use their branchId, for admins: use selected branch
  const effectiveBranchId = user?.role === "manager" ? user.branchId : selectedBranchId;
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date>(getTodayMidnight());
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "network">("cash");
  const [description, setDescription] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");

  // Filter state
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  const { data: categories } = trpc.expenses.categories.useQuery();
  const { data: employees } = trpc.employees.listByBranch.useQuery(
    { branchId: effectiveBranchId || 0 },
    { enabled: !!effectiveBranchId }
  );
  const { data: expenses, refetch } = trpc.expenses.list.useQuery(
    { 
      branchId: effectiveBranchId || 0,
      startDate: filterStartDate || new Date(new Date().setDate(1)).toISOString(),
      endDate: filterEndDate || new Date().toISOString(),
    },
    { enabled: !!effectiveBranchId }
  );

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    if (filterCategoryId === "all") return expenses;
    return expenses.filter(e => e.categoryId.toString() === filterCategoryId);
  }, [expenses, filterCategoryId]);

  // Calculate total
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  }, [filteredExpenses]);

  const createExpenseMutation = trpc.expenses.create.useMutation();

  const selectedCategory = categories?.find((c: any) => c.id.toString() === categoryId);
  const requiresEmployee = selectedCategory?.requiresEmployee || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!effectiveBranchId) {
      toast.error("يرجى اختيار الفرع أولاً");
      return;
    }

    if (requiresEmployee && !employeeId) {
      toast.error("يرجى اختيار الموظف");
      return;
    }

    try {
      await createExpenseMutation.mutateAsync({
        branchId: effectiveBranchId,
        categoryId: parseInt(categoryId),
        date: selectedDate.toISOString(),
        amount,
        paymentType,
        description: description || undefined,
        employeeId: employeeId ? parseInt(employeeId) : undefined,
        receiptNumber: receiptNumber || undefined,
      });

      toast.success("تم تسجيل المصروف بنجاح");
      
      // Reset form
      setSelectedDate(getTodayMidnight());
      setCategoryId("");
      setAmount("");
      setPaymentType("cash");
      setDescription("");
      setEmployeeId("");
      setReceiptNumber("");
      
      refetch();
    } catch (error: any) {
      toast.error(error.message || "فشل تسجيل المصروف");
    }
  };

  const handleResetFilters = () => {
    setFilterCategoryId("all");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-navy mb-2" style={{fontWeight: '900'}}>المصروفات</h1>
          <p className="text-navy/60" style={{fontWeight: '900'}}>إدارة المصروفات اليومية</p>
        </div>

        {/* Add Expense Form */}
        <form onSubmit={handleSubmit}>
          <Card className="card-geometric">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <FileText className="h-5 w-5 text-gold" />
                إضافة مصروف جديد
              </CardTitle>
              <CardDescription>
                أدخل تفاصيل المصروف
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">التاريخ *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={toDateInputValue(selectedDate)}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    max={toDateInputValue(new Date())}
                    required
                  />
                </div>
                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">الصنف *</Label>
                  <Select value={categoryId} onValueChange={setCategoryId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الصنف" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.nameAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Payment Type */}
              <div className="space-y-2">
                <Label>نوع الدفع *</Label>
                <RadioGroup value={paymentType} onValueChange={(value: "cash" | "network") => setPaymentType(value)}>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="cursor-pointer">كاش (نقدي)</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="network" id="network" />
                    <Label htmlFor="network" className="cursor-pointer">شبكة (بطاقة)</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Employee (conditional) */}
              {requiresEmployee && (
                <div className="space-y-2">
                  <Label htmlFor="employee">الموظف * (مطلوب لهذا الصنف)</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الموظف" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Receipt Number */}
              <div className="space-y-2">
                <Label htmlFor="receipt">رقم الإيصال (اختياري)</Label>
                <Input
                  id="receipt"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="رقم الإيصال"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">ملاحظات (اختياري)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="أي ملاحظات إضافية"
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gold hover:bg-gold/90 text-navy"
                disabled={createExpenseMutation.isPending}
              >
                {createExpenseMutation.isPending ? "جاري الحفظ..." : "حفظ المصروف"}
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* Filters */}
        <Card className="card-geometric">
          <CardHeader>
            <CardTitle className="text-navy">البحث والتصفية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {categories?.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={filterStartDate ? toDateInputValue(new Date(filterStartDate)) : ""}
                  onChange={(e) => setFilterStartDate(e.target.value ? new Date(e.target.value).toISOString() : "")}
                />
              </div>
              <div className="space-y-2">
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={filterEndDate ? toDateInputValue(new Date(filterEndDate)) : ""}
                  onChange={(e) => setFilterEndDate(e.target.value ? new Date(e.target.value).toISOString() : "")}
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="w-full"
                >
                  إعادة تعيين
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses List */}
        <Card className="card-geometric">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-navy">المصروفات المسجلة</CardTitle>
                <CardDescription>آخر المصروفات المسجلة</CardDescription>
              </div>
              {filteredExpenses.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const branchName = user?.role === "admin" 
                        ? "" 
                        : user?.branchId?.toString() || "";
                      exportExpensesToExcel(filteredExpenses as any, {
                        startDate: filterStartDate,
                        endDate: filterEndDate,
                        branchName,
                      });
                      toast.success("تم تصدير Excel بنجاح");
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4 ml-2" />
                    تصدير Excel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!expenses || expenses.length === 0 ? (
              <p className="text-navy/60 text-center py-8">لا توجد مصروفات مسجلة</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">الفئة</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">نوع الدفع</TableHead>
                      <TableHead className="text-right">الوصف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {new Date(expense.date).toLocaleDateString("ar-SA")}
                        </TableCell>
                        <TableCell>{categories?.find((c: any) => c.id === expense.categoryId)?.nameAr || "-"}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(parseFloat(expense.amount))}
                        </TableCell>
                        <TableCell>
                          {expense.paymentType === "cash" ? "كاش" : "شبكة"}
                        </TableCell>
                        <TableCell className="text-sm text-navy/70">
                          {expense.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {filteredExpenses.length > 0 && (
              <div className="mt-4 pt-4 border-t border-navy/10">
                <div className="flex justify-between items-center">
                  <span className="text-navy font-semibold">إجمالي المصروفات:</span>
                  <span className="text-2xl font-bold text-gold">
                    {formatCurrency(totalExpenses)}
                  </span>
                </div>
                <p className="text-sm text-navy/60 mt-1">
                  عدد المصروفات: {filteredExpenses.length}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
