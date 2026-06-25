import { Wrench } from 'lucide-react'
import { I18nText } from '@/lib/i18n-inspector'

export function HomePage() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
      <div className="text-center">
        <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Wrench className="w-7 h-7 text-gray-400" />
        </div>
        <h2 className="text-[22px] font-semibold text-gray-900 mb-2 tracking-[-0.02em]">
          Product Service Admin
        </h2>
        <p className="text-sm text-gray-400">
          <I18nText i18nKey="home.copy.select_menu">
            왼쪽 메뉴에서 관리할 항목을 선택해주세요.
          </I18nText>
        </p>
      </div>
    </div>
  )
}
