import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertCircle, TrendingUp, Users, DollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface BonusCalculationResult {
  weeklyBonusId: number;
  totalAmount: number;
  employeeCount: number;
  eligibleCount: number;
}

interface BonusCalculationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: BonusCalculationResult | null;
  year: number;
  month: number;
  weekNumber: number;
  onRequestBonus?: () => void;
}

export default function BonusCalculationModal({
  open,
  onOpenChange,
  result,
  year,
  month,
  weekNumber,
  onRequestBonus,
}: BonusCalculationModalProps) {
  const utils = trpc.useUtils();

  // Fetch bonus details if we have a weeklyBonusId
  const { data: bonusDetails, isLoading } = trpc.bonuses.getWeek.useQuery(
    { year, month, weekNumber },
    { enabled: open && result !== null }
  );

  const requestMutation = trpc.bonuses.request.useMutation({
    onSuccess: () => {
      utils.bonuses.pending.invalidate();
      onRequestBonus?.();
    },
  });

  const handleRequestBonus = async () => {
    if (!result) return;
    
    try {
      await requestMutation.mutateAsync({
        weeklyBonusId: result.weeklyBonusId,
      });
    } catch (error) {
      console.error('Failed to request bonus:', error);
    }
  };

  if (!result) return null;

  const weekRanges: Record<number, string> = {
    1: "1-7",
    2: "8-15",
    3: "16-22",
    4: "23-29",
    5: "30-31",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            نتائج حساب البونص الأسبوعي
          </DialogTitle>
          <DialogDescription className="text-base">
            الأسبوع {weekNumber} ({weekRanges[weekNumber]}) - {month}/{year}
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <DollarSign className="h-5 w-5" />
              <span className="font-semibold">إجمالي البونص</span>
            </div>
            <p className="text-3xl font-bold text-green-900">
              {result.totalAmount.toFixed(2)} <span className="text-lg">ر.س</span>
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Users className="h-5 w-5" />
              <span className="font-semibold">الموظفون المؤهلون</span>
            </div>
            <p className="text-3xl font-bold text-blue-900">
              {result.eligibleCount} <span className="text-lg">من {result.employeeCount}</span>
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 text-purple-700 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="font-semibold">نسبة التأهيل</span>
            </div>
            <p className="text-3xl font-bold text-purple-900">
              {result.employeeCount > 0 
                ? ((result.eligibleCount / result.employeeCount) * 100).toFixed(0)
                : 0}%
            </p>
          </div>
        </div>

        {/* Employee Details Table */}
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
          </div>
        ) : bonusDetails && bonusDetails.employees && bonusDetails.employees.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-navy/5">
                  <TableHead className="text-right font-bold">الموظف</TableHead>
                  <TableHead className="text-right font-bold">الإيراد الأسبوعي</TableHead>
                  <TableHead className="text-right font-bold">المستوى</TableHead>
                  <TableHead className="text-right font-bold">البونص</TableHead>
                  <TableHead className="text-right font-bold">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonusDetails.employees.map((emp) => {
                  const tierLabels: Record<string, string> = {
                    tier_1: "المستوى 1",
                    tier_2: "المستوى 2",
                    tier_3: "المستوى 3",
                    tier_4: "المستوى 4",
                    tier_5: "المستوى 5",
                    none: "غير مؤهل",
                  };

                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">
                        {emp.employeeName}
                        <span className="text-sm text-muted-foreground mr-2">
                          ({emp.employeeCode})
                        </span>
                      </TableCell>
                      <TableCell>{Number(emp.weeklyRevenue).toFixed(2)} ر.س</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-sm ${
                          emp.bonusTier === 'none' 
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-gold/20 text-gold-dark'
                        }`}>
                          {tierLabels[emp.bonusTier]}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {Number(emp.bonusAmount).toFixed(2)} ر.س
                      </TableCell>
                      <TableCell>
                        {emp.isEligible ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            مؤهل
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500">
                            <AlertCircle className="h-4 w-4" />
                            غير مؤهل
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد بيانات تفصيلية متاحة
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            إغلاق
          </Button>
          {bonusDetails && bonusDetails.status === 'pending' && (
            <Button
              onClick={handleRequestBonus}
              disabled={requestMutation.isPending}
              className="bg-gold hover:bg-gold/90 text-navy"
            >
              {requestMutation.isPending ? "جاري الإرسال..." : "إرسال للموافقة"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
