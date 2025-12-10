import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function SyncMonitor() {
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Trigger manual sync
  const syncMutation = trpc.bonuses.triggerSync.useMutation({
    onSuccess: (data) => {
      setIsSyncing(false);
      if (data.success) {
        toast.success('تمت المزامنة بنجاح', {
          description: data.message,
        });
      } else {
        toast.warning('مزامنة جزئية', {
          description: data.message,
        });
      }
    },
    onError: (error) => {
      setIsSyncing(false);
      toast.error('فشلت المزامنة', {
        description: error.message,
      });
    },
  });

  const handleManualSync = () => {
    setIsSyncing(true);
    syncMutation.mutate();
  };

  // Get sync status icon and color
  const getSyncStatus = (result: any) => {
    if (!result) return { icon: Clock, color: 'text-gray-500', label: 'قيد الانتظار' };
    
    if (result.success) {
      return { icon: CheckCircle2, color: 'text-green-600', label: 'نجح' };
    } else if (result.results && result.results.some((r: any) => r.success)) {
      return { icon: AlertCircle, color: 'text-yellow-600', label: 'جزئي' };
    } else {
      return { icon: XCircle, color: 'text-red-600', label: 'فشل' };
    }
  };

  const syncResult = syncMutation.data;
  const status = getSyncStatus(syncResult);
  const StatusIcon = status.icon;

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">مراقبة المزامنة</h1>
          <p className="text-muted-foreground mt-2">
            مراقبة وإدارة مزامنة الإيرادات والبونص اليومية
          </p>
        </div>
        
        <Button
          onClick={handleManualSync}
          disabled={isSyncing}
          size="lg"
        >
          {isSyncing ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري المزامنة...
            </>
          ) : (
            <>
              <RefreshCw className="ml-2 h-4 w-4" />
              تشغيل المزامنة الآن
            </>
          )}
        </Button>
      </div>

      {/* Sync Status Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${status.color}`} />
            حالة المزامنة
          </CardTitle>
          <CardDescription>
            آخر عملية مزامنة تمت تنفيذها
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!syncResult ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لم يتم تشغيل المزامنة بعد</p>
              <p className="text-sm mt-2">اضغط على "تشغيل المزامنة الآن" لبدء المزامنة</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">النتيجة</p>
                  <p className="text-sm text-muted-foreground">{syncResult.message}</p>
                </div>
                <Badge variant={syncResult.success ? 'default' : 'destructive'}>
                  {status.label}
                </Badge>
              </div>

              {syncResult.results && syncResult.results.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-4">تفاصيل الفروع</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {syncResult.results.map((result: any) => (
                      <Card key={result.branchId} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{result.branchName}</CardTitle>
                            {result.success ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">الحالة:</span>
                              <Badge variant={result.success ? 'default' : 'destructive'} className="text-xs">
                                {result.success ? 'نجح' : 'فشل'}
                              </Badge>
                            </div>
                            
                            {result.success && result.data && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">الأسبوع:</span>
                                  <span className="font-medium">{result.data.weekNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">الإيرادات:</span>
                                  <span className="font-medium">{result.data.totalRevenue?.toLocaleString('ar-SA')} ريال</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">الموظفون:</span>
                                  <span className="font-medium">{result.data.employeeCount}</span>
                                </div>
                              </>
                            )}
                            
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground">{result.message}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cron Job Information */}
      <Card>
        <CardHeader>
          <CardTitle>المزامنة التلقائية</CardTitle>
          <CardDescription>
            معلومات حول المزامنة اليومية المجدولة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">الجدول الزمني</p>
                <p className="text-sm text-muted-foreground">تعمل تلقائياً كل يوم</p>
              </div>
              <Badge variant="outline" className="text-base">
                <Clock className="ml-2 h-4 w-4" />
                12:00 صباحاً
              </Badge>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">الوظيفة</p>
                <p className="text-sm text-muted-foreground">مزامنة الإيرادات وحساب البونص</p>
              </div>
              <Badge variant="outline">نشط</Badge>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">الفروع المشمولة</p>
                <p className="text-sm text-muted-foreground">جميع الفروع النشطة</p>
              </div>
              <Badge variant="outline">تلقائي</Badge>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">كيف تعمل المزامنة التلقائية؟</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>تعمل تلقائياً كل يوم عند منتصف الليل (12:00 صباحاً)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>تجمع بيانات الإيرادات اليومية من جدول daily_revenues</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>تحسب مساهمة كل موظف من جدول employee_revenues</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>تطبق نظام المستويات (Tiers) لحساب البونص الأسبوعي</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>تسجل جميع العمليات في سجل التدقيق (Audit Log)</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
