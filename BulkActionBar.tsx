import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface BulkActionBarProps {
  selectedCount: number;
  onApprove: (response?: string) => void;
  onReject: (response: string) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function BulkActionBar({
  selectedCount,
  onApprove,
  onReject,
  onClear,
  isLoading = false,
}: BulkActionBarProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approveResponse, setApproveResponse] = useState("");
  const [rejectResponse, setRejectResponse] = useState("");

  const handleApproveConfirm = () => {
    onApprove(approveResponse || undefined);
    setShowApproveDialog(false);
    setApproveResponse("");
  };

  const handleRejectConfirm = () => {
    if (!rejectResponse.trim()) {
      return;
    }
    onReject(rejectResponse);
    setShowRejectDialog(false);
    setRejectResponse("");
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
        <div className="bg-navy text-cream rounded-lg shadow-2xl border-2 border-gold/30 px-6 py-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{selectedCount}</span>
            <span className="text-cream/80">طلب محدد</span>
          </div>

          <div className="h-8 w-px bg-gold/30" />

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowApproveDialog(true)}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="ml-2 h-4 w-4" />
              موافقة جماعية
            </Button>

            <Button
              onClick={() => setShowRejectDialog(true)}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle className="ml-2 h-4 w-4" />
              رفض جماعي
            </Button>

            <Button
              onClick={onClear}
              disabled={isLoading}
              variant="outline"
              className="border-gold/30 text-cream hover:bg-gold/10"
            >
              <X className="ml-2 h-4 w-4" />
              إلغاء التحديد
            </Button>
          </div>
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الموافقة الجماعية</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من الموافقة على {selectedCount} طلب؟
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approve-response">رد الإدارة (اختياري)</Label>
              <Textarea
                id="approve-response"
                value={approveResponse}
                onChange={(e) => setApproveResponse(e.target.value)}
                placeholder="أدخل رد الإدارة..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleApproveConfirm}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="ml-2 h-4 w-4" />
              تأكيد الموافقة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الرفض الجماعي</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رفض {selectedCount} طلب؟
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-response">
                سبب الرفض <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-response"
                value={rejectResponse}
                onChange={(e) => setRejectResponse(e.target.value)}
                placeholder="يجب إدخال سبب الرفض..."
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleRejectConfirm}
              disabled={!rejectResponse.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              <XCircle className="ml-2 h-4 w-4" />
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
