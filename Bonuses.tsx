import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Calendar, TrendingUp, Users, DollarSign, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function Bonuses() {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedBonusId, setSelectedBonusId] = useState<number | null>(null);

  // Fetch current week bonus
  const { data: currentBonus, isLoading, refetch } = trpc.bonuses.current.useQuery();

  // Fetch bonus history
  const currentYear = new Date().getFullYear();
  const { data: historyData, isLoading: historyLoading } = trpc.bonuses.history.useQuery({
    year: currentYear,
  });
  const history = historyData?.history || [];

  // Request bonus mutation
  const requestMutation = trpc.bonuses.request.useMutation({
    onSuccess: () => {
      toast.success('تم إرسال طلب صرف البونص بنجاح');
      setShowRequestDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'فشل إرسال الطلب');
    },
  });

  const handleRequestBonus = () => {
    if (selectedBonusId) {
      requestMutation.mutate({ weeklyBonusId: selectedBonusId });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            قيد الانتظار
          </Badge>
        );
      case 'requested':
        return (
          <Badge variant="default" className="gap-1 bg-blue-500">
            <Clock className="h-3 w-3" />
            تم الطلب
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle2 className="h-3 w-3" />
            تمت الموافقة
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            مرفوض
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    const tierLabels: Record<string, string> = {
      tier_5: 'المستوى 5',
      tier_4: 'المستوى 4',
      tier_3: 'المستوى 3',
      tier_2: 'المستوى 2',
      tier_1: 'المستوى 1',
      none: 'غير مؤهل',
    };

    const tierColors: Record<string, string> = {
      tier_5: 'bg-purple-500',
      tier_4: 'bg-blue-500',
      tier_3: 'bg-green-500',
      tier_2: 'bg-yellow-500',
      tier_1: 'bg-orange-500',
      none: 'bg-gray-400',
    };

    return (
      <Badge className={`${tierColors[tier] || 'bg-gray-400'} text-white`}>
        {tierLabels[tier] || tier}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">البونص الأسبوعي</h1>
        <p className="text-muted-foreground">
          متابعة وإدارة بونصات الموظفين الأسبوعية
        </p>
      </div>

      {/* Current Week Bonus */}
      {currentBonus ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  الأسبوع {currentBonus.weekNumber} - {currentBonus.month}/{currentBonus.year}
                </CardTitle>
                <CardDescription>
                  {new Date(currentBonus.weekStart).toLocaleDateString('ar-SA')} -{' '}
                  {new Date(currentBonus.weekEnd).toLocaleDateString('ar-SA')}
                </CardDescription>
              </div>
              <div>{getStatusBadge(currentBonus.status)}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">إجمالي البونص</p>
                      <p className="text-2xl font-bold">{Number(currentBonus.totalAmount).toFixed(2)} ر.س</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الموظفون المؤهلون</p>
                      <p className="text-2xl font-bold">{currentBonus.eligibleCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">إجمالي الموظفين</p>
                      <p className="text-2xl font-bold">{currentBonus.employees?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Employee Bonus Table */}
            <div>
              <h3 className="text-lg font-semibold mb-4">تفاصيل بونص الموظفين</h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>الكود</TableHead>
                      <TableHead className="text-right">الإيراد الأسبوعي</TableHead>
                      <TableHead>المستوى</TableHead>
                      <TableHead className="text-right">البونص</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentBonus.employees && currentBonus.employees.length > 0 ? (
                      currentBonus.employees.map((emp: any) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.employeeName}</TableCell>
                          <TableCell>{emp.employeeCode}</TableCell>
                          <TableCell className="text-right">
                            {Number(emp.weeklyRevenue).toFixed(2)} ر.س
                          </TableCell>
                          <TableCell>{getTierBadge(emp.bonusTier)}</TableCell>
                          <TableCell className="text-right font-bold">
                            {Number(emp.bonusAmount).toFixed(2)} ر.س
                          </TableCell>
                          <TableCell>
                            {emp.isEligible ? (
                              <Badge variant="default" className="bg-green-500">مؤهل</Badge>
                            ) : (
                              <Badge variant="secondary">غير مؤهل</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          لا توجد بيانات للموظفين
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Request Button */}
            {currentBonus.status === 'pending' && Number(currentBonus.totalAmount) > 0 && (
              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={() => {
                    setSelectedBonusId(currentBonus.id);
                    setShowRequestDialog(true);
                  }}
                >
                  طلب صرف البونص
                </Button>
              </div>
            )}

            {currentBonus.status === 'requested' && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-blue-900 dark:text-blue-100">
                  تم إرسال طلب صرف البونص. في انتظار موافقة الإدارة.
                </p>
              </div>
            )}

            {currentBonus.status === 'approved' && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-900 dark:text-green-100">
                  تمت الموافقة على البونص بتاريخ{' '}
                  {currentBonus.approvedAt
                    ? new Date(currentBonus.approvedAt).toLocaleDateString('ar-SA')
                    : ''}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد بيانات بونص للأسبوع الحالي</p>
          </CardContent>
        </Card>
      )}

      {/* Bonus History */}
      <Card>
        <CardHeader>
          <CardTitle>سجل البونصات السابقة</CardTitle>
          <CardDescription>آخر 10 أسابيع</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : history && history.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الأسبوع</TableHead>
                    <TableHead>الفترة</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                    <TableHead>المؤهلون</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        الأسبوع {item.weekNumber}
                      </TableCell>
                      <TableCell>
                        {new Date(item.weekStart).toLocaleDateString('ar-SA', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        -{' '}
                        {new Date(item.weekEnd).toLocaleDateString('ar-SA', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {Number(item.totalAmount).toFixed(2)} ر.س
                      </TableCell>
                      <TableCell>{item.eligibleCount}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        {item.approvedAt
                          ? new Date(item.approvedAt).toLocaleDateString('ar-SA')
                          : item.requestedAt
                          ? new Date(item.requestedAt).toLocaleDateString('ar-SA')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              لا يوجد سجل بونصات سابقة
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Confirmation Dialog */}
      <AlertDialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد طلب صرف البونص</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من طلب صرف البونص الأسبوعي؟ سيتم إرسال الطلب إلى الإدارة للموافقة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequestBonus} disabled={requestMutation.isPending}>
              {requestMutation.isPending ? 'جاري الإرسال...' : 'تأكيد الطلب'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
