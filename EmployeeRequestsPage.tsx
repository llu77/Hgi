import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBranch } from "@/contexts/BranchContext";
import { FileText, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const REQUEST_TYPES = [
  { value: "advance", label: "سلفة", icon: "💰" },
  { value: "leave", label: "إجازة", icon: "🏖️" },
  { value: "late_payment", label: "صرف متأخرات", icon: "💵" },
  { value: "permission", label: "استئذان", icon: "⏰" },
  { value: "violation_appeal", label: "اعتراض على مخالفة", icon: "⚖️" },
  { value: "resignation", label: "استقالة", icon: "👋" },
];

const STATUS_LABELS = {
  "تحت الإجراء": { label: "قيد المراجعة", icon: Clock, color: "text-yellow-600" },
  "مقبول": { label: "موافق عليه", icon: CheckCircle, color: "text-green-600" },
  "مرفوض": { label: "مرفوض", icon: XCircle, color: "text-red-600" },
};

export default function EmployeeRequestsPage() {
  const { user } = useAuth();
  const { selectedBranchId, setSelectedBranchId } = useBranch();

  const [showForm, setShowForm] = useState(false);
  const [localBranchId, setLocalBranchId] = useState<number | null>(null);
  const [showBranchError, setShowBranchError] = useState(false);
  const [requestType, setRequestType] = useState<string>("");
  const [employeeName, setEmployeeName] = useState("");
  const [amount, setAmount] = useState("");
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveDays, setLeaveDays] = useState("");
  const [permissionHours, setPermissionHours] = useState("");
  const [violationDetails, setViolationDetails] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [reason, setReason] = useState("");

  // Get effective branch ID
  // Admin: uses manually selected branch (localBranchId or selectedBranchId)
  // Manager/Employee: automatically uses their assigned branch (user.branchId)
  const effectiveBranchId = user?.role === "admin" 
    ? (localBranchId || selectedBranchId)
    : user?.branchId;

  // Queries
  const { data: branchesData } = trpc.branches.list.useQuery();
  const { data: requestsData, refetch } = trpc.employeeRequests.list.useQuery({
    branchId: effectiveBranchId || undefined,
  });

  // Mutations
  const createRequest = trpc.employeeRequests.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الطلب بنجاح");
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const updateStatus = trpc.employeeRequests.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الطلب");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setRequestType("");
    setEmployeeName("");
    setAmount("");
    setLeaveDate("");
    setLeaveDays("");
    setPermissionHours("");
    setViolationDetails("");
    setIdNumber("");
    setReason("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate branch selection for admin users
    if (user?.role === "admin" && !effectiveBranchId) {
      toast.error("يجب اختيار الفرع أولاً");
      setShowBranchError(true);
      return;
    }

    if (!effectiveBranchId) {
      toast.error("يرجى اختيار الفرع");
      return;
    }

    setShowBranchError(false);

    const branch = branchesData?.find((b) => b.id === effectiveBranchId);
    if (!branch) {
      toast.error("الفرع غير موجود");
      return;
    }

    // Build request data based on type
    const requestData: any = {
      branchId: effectiveBranchId,
      branchName: branch.name,
      employeeName,
      requestType,
      reason,
    };

    // Type-specific data
    switch (requestType) {
      case "advance":
        requestData.amount = parseFloat(amount);
        break;
      case "leave":
        requestData.leaveDate = new Date(leaveDate);
        requestData.leaveDays = parseInt(leaveDays);
        break;
      case "permission":
        requestData.permissionHours = parseFloat(permissionHours);
        break;
      case "violation_appeal":
        requestData.violationDetails = violationDetails;
        break;
      case "resignation":
        requestData.idNumber = idNumber;
        break;
    }

    createRequest.mutate(requestData);
  };

  const handleStatusChange = (id: number, status: "مقبول" | "مرفوض", adminResponse?: string) => {
    updateStatus.mutate({ id, status, adminResponse });
  };

  return (
    <div className="container py-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-navy">طلبات الموظفين</h1>
            <p className="text-navy/60 mt-2">
              إدارة طلبات الموظفين (سلف، إجازات، استئذان، اعتراضات، استقالات)
            </p>
          </div>

          <Button onClick={() => setShowForm(!showForm)} className="bg-gold hover:bg-gold/90">
            {showForm ? "إلغاء" : "+ إنشاء طلب جديد"}
          </Button>
        </div>

        {/* Branch Selector for Admin */}
        {user?.role === "admin" && (
          <Card className={`p-4 ${showBranchError ? 'bg-red-50 border-2 border-red-500' : 'bg-cream/30'}`}>
            <div className="flex items-center gap-4">
              <Label className="text-navy font-semibold min-w-[100px]">اختر الفرع: {showBranchError && <span className="text-red-600">*</span>}</Label>
              <Select
                value={localBranchId?.toString() || ""}
                onValueChange={(value) => {
                  setLocalBranchId(value ? parseInt(value) : null);
                  setShowBranchError(false);
                }}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="اختر الفرع لعرض الطلبات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">جميع الفروع</SelectItem>
                  {branchesData?.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.nameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {localBranchId && (
                <span className="text-sm text-navy/60">
                  الفرع المحدد: {branchesData?.find((b: any) => b.id === localBranchId)?.nameAr || "جميع الفروع"}
                </span>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">إنشاء طلب جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Request Type */}
            <div>
              <Label>نوع الطلب *</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الطلب" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Name */}
            <div>
              <Label>اسم الموظف *</Label>
              <Input
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="أدخل اسم الموظف"
                required
              />
            </div>

            {/* Type-specific fields */}
            {requestType === "advance" && (
              <div>
                <Label>المبلغ (ريال) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  max="50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1 - 50,000 ريال"
                  required
                />
              </div>
            )}

            {requestType === "leave" && (
              <>
                <div>
                  <Label>تاريخ الإجازة *</Label>
                  <Input
                    type="date"
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>عدد الأيام *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={leaveDays}
                    onChange={(e) => setLeaveDays(e.target.value)}
                    placeholder="عدد أيام الإجازة"
                    required
                  />
                </div>
              </>
            )}

            {requestType === "permission" && (
              <div>
                <Label>عدد الساعات *</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="7.5"
                  value={permissionHours}
                  onChange={(e) => setPermissionHours(e.target.value)}
                  placeholder="أقل من 8 ساعات"
                  required
                />
              </div>
            )}

            {requestType === "violation_appeal" && (
              <div>
                <Label>تفاصيل المخالفة *</Label>
                <Textarea
                  value={violationDetails}
                  onChange={(e) => setViolationDetails(e.target.value)}
                  placeholder="اشرح تفاصيل المخالفة التي تعترض عليها"
                  rows={3}
                  required
                />
              </div>
            )}

            {requestType === "resignation" && (
              <div>
                <Label>رقم الهوية *</Label>
                <Input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="رقم الهوية الوطنية"
                  pattern="[0-9]{10}"
                  title="رقم الهوية يجب أن يكون 10 أرقام"
                  required
                />
              </div>
            )}

            {/* Reason */}
            <div>
              <Label>السبب / التفاصيل *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="اكتب السبب أو التفاصيل"
                rows={3}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                إلغاء
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Requests List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          قائمة الطلبات
        </h2>

        {!requestsData?.requests.length ? (
          <p className="text-center text-muted-foreground py-8">لا توجد طلبات</p>
        ) : (
          <div className="space-y-4">
            {requestsData.requests.map((request) => {
              const StatusIcon = STATUS_LABELS[request.status].icon;
              const typeLabel = REQUEST_TYPES.find((t) => t.value === request.requestType)?.label;

              return (
                <Card key={request.id} className="p-4 border-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">
                          {REQUEST_TYPES.find((t) => t.value === request.requestType)?.icon}
                        </span>
                        <h3 className="font-semibold text-lg">{typeLabel}</h3>
                        <span className={`flex items-center gap-1 text-sm ${STATUS_LABELS[request.status].color}`}>
                          <StatusIcon className="w-4 h-4" />
                          {STATUS_LABELS[request.status].label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <p>
                          <strong>الموظف:</strong> {request.employeeName}
                        </p>
                        <p>
                          <strong>الفرع:</strong> {request.branchName}
                        </p>
                        <p>
                          <strong>التاريخ:</strong> {format(new Date(request.createdAt), "dd/MM/yyyy")}
                        </p>
                        {request.requestData && (
                          <>
                            {request.requestData.amount && (
                              <p>
                                <strong>المبلغ:</strong> {request.requestData.amount} ريال
                              </p>
                            )}
                            {request.requestData.leaveDate && (
                              <p>
                                <strong>تاريخ الإجازة:</strong>{" "}
                                {format(new Date(request.requestData.leaveDate), "dd/MM/yyyy")}
                              </p>
                            )}
                            {request.requestData.leaveDays && (
                              <p>
                                <strong>عدد الأيام:</strong> {request.requestData.leaveDays}
                              </p>
                            )}
                            {request.requestData.permissionHours && (
                              <p>
                                <strong>عدد الساعات:</strong> {request.requestData.permissionHours}
                              </p>
                            )}
                            {request.requestData.idNumber && (
                              <p>
                                <strong>رقم الهوية:</strong> {request.requestData.idNumber}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {request.requestData?.reason && (
                        <p className="text-sm text-muted-foreground">
                          <strong>السبب:</strong> {request.requestData.reason}
                        </p>
                      )}

                      {request.adminResponse && (
                        <p className="text-sm text-blue-600 mt-2">
                          <strong>رد الإدارة:</strong> {request.adminResponse}
                        </p>
                      )}
                    </div>

                    {/* Admin Actions */}
                    {user?.role === "admin" && request.status === "تحت الإجراء" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleStatusChange(request.id, "مقبول", "تمت الموافقة")}
                          disabled={updateStatus.isPending}
                        >
                          موافقة
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusChange(request.id, "مرفوض", "تم الرفض")}
                          disabled={updateStatus.isPending}
                        >
                          رفض
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
