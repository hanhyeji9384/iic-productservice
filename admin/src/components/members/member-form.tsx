import { useState, useEffect } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Member } from '@/lib/types'
import { ROLES, COUNTRIES, DEPARTMENTS } from '@/lib/mock-data'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: Member | null
  onSave: (data: Partial<Member>) => void
}

const EMPTY: Partial<Member> = {
  loginId: '', name: '', email: '', department: '', tel: '',
  country: 'KR', roleId: '', expiresAt: null, status: 'active',
}

export function MemberForm({ open, onOpenChange, member, onSave }: Props) {
  const isEdit = !!member
  const [form, setForm] = useState<Partial<Member>>(EMPTY)
  const [password, setPassword] = useState('')

  useEffect(() => {
    setForm(member ?? EMPTY)
    setPassword('')
  }, [member, open])

  function set(key: keyof Member, value: string | null) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(form)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:w-[440px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEdit ? '회원 수정' : '회원 등록'}</SheetTitle>
          <SheetDescription>
            {isEdit ? '회원 정보를 수정합니다.' : '새 회원을 등록합니다. 등록 후 최초 로그인 시 비밀번호 변경을 안내합니다.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">이름 <span className="text-destructive">*</span></Label>
              <Input
                id="name" required value={form.name ?? ''}
                onChange={e => set('name', e.target.value)}
                placeholder="홍길동"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loginId">로그인 ID <span className="text-destructive">*</span></Label>
              <Input
                id="loginId" required value={form.loginId ?? ''}
                onChange={e => set('loginId', e.target.value)}
                placeholder="monster001"
                disabled={isEdit}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">이메일 <span className="text-destructive">*</span></Label>
            <Input
              id="email" type="email" required value={form.email ?? ''}
              onChange={e => set('email', e.target.value)}
              placeholder="name@gentlemonster.com"
            />
          </div>

          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">초기 비밀번호 <span className="text-destructive">*</span></Label>
              <Input
                id="password" type="password" required={!isEdit}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="8자 이상, 특수문자 포함"
              />
              <p className="text-[11px] text-muted-foreground">
                최초 로그인 시 비밀번호 변경을 권장합니다.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department">부서</Label>
              <Select value={form.department ?? ''} onValueChange={v => set('department', v)}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="부서 선택" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="country">국가</Label>
              <Select value={form.country ?? 'KR'} onValueChange={v => set('country', v)}>
                <SelectTrigger id="country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tel">연락처</Label>
            <Input
              id="tel" value={form.tel ?? ''}
              onChange={e => set('tel', e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">역할 <span className="text-destructive">*</span></Label>
            <Select value={form.roleId ?? ''} onValueChange={v => set('roleId', v)} required>
              <SelectTrigger id="role">
                <SelectValue placeholder="역할 선택" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    <span>{r.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{r.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expiresAt">계정 유효기간</Label>
            <Input
              id="expiresAt" type="date"
              value={form.expiresAt ?? ''}
              onChange={e => set('expiresAt', e.target.value || null)}
            />
            <p className="text-[11px] text-muted-foreground">비워두면 무기한 적용됩니다.</p>
          </div>

          <SheetFooter className="mt-2 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit">{isEdit ? '저장' : '등록'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
