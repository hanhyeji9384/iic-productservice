import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { X, Printer } from 'lucide-react'

interface Props {
  ticketNo: string
  productName: string
  customerName: string
  onClose: () => void
  autoPrint?: boolean
}

export function BarcodePrintModal({ ticketNo, productName, customerName, onClose, autoPrint = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current) {
      JsBarcode(svgRef.current, ticketNo, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 11,
        margin: 8,
        background: '#ffffff',
        lineColor: '#000000',
      })
    }
    if (autoPrint) {
      const timer = setTimeout(() => window.print(), 500)
      return () => clearTimeout(timer)
    }
  }, [ticketNo, autoPrint])

  return (
    <>
      <style>{`
        @media print {
          body > * { visibility: hidden !important; }
          .barcode-print-area,
          .barcode-print-area * { visibility: visible !important; }
          .barcode-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 80mm !important;
            padding: 4mm !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 no-print"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between no-print">
            <h2 className="text-sm font-semibold text-gray-800">바코드 출력</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="barcode-print-area flex flex-col items-center gap-1.5 py-4 px-3 border border-gray-100 rounded-xl bg-white">
            <svg ref={svgRef} className="max-w-full" />
            <p className="text-xs text-gray-600 font-medium">{productName}</p>
            <p className="text-xs text-gray-400">{customerName}</p>
          </div>

          <button
            onClick={() => window.print()}
            className="no-print w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            출력
          </button>
        </div>
      </div>
    </>
  )
}
