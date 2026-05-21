import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Member } from '@/lib/types'

type Props = {
  member: Member | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteDialog({ member, onOpenChange, onConfirm }: Props) {
  return (
    <AlertDialog open={!!member} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>회원을 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{member?.name}</strong> ({member?.loginId}) 회원을 삭제합니다.
            삭제 후에는 로그인이 불가하며, 이 작업은 되돌릴 수 없습니다.
            (변경 이력은 보존됩니다.)
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
