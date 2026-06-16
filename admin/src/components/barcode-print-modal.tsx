import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { X, Printer } from 'lucide-react'

interface Props {
  ticketNo: string
  productName: string
  customerName: string
  onClose: () => void
  autoPrint?: boolean
  presentation?: 'modal' | 'silent'
}

export function BarcodePrintModal({
  ticketNo,
  productName,
  customerName,
  onClose,
  autoPrint = false,
  presentation = 'modal',
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const autoPrintedRef = useRef(false)
  const closeAfterPrintRef = useRef(false)

  function printBarcode() {
    closeAfterPrintRef.current = true
    requestAnimationFrame(() => {
      window.setTimeout(() => window.print(), 80)
    })
  }

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
  }, [ticketNo, presentation])

  useEffect(() => {
    function handleAfterPrint() {
      if (!closeAfterPrintRef.current) return
      closeAfterPrintRef.current = false
      onClose()
    }

    window.addEventListener('afterprint', handleAfterPrint)
    const mediaQuery = window.matchMedia('print')
    const handlePrintStateChange = (event: MediaQueryListEvent) => {
      if (!event.matches) handleAfterPrint()
    }
    mediaQuery.addEventListener('change', handlePrintStateChange)

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint)
      mediaQuery.removeEventListener('change', handlePrintStateChange)
    }
  }, [onClose])

  useEffect(() => {
    if (!autoPrint || autoPrintedRef.current) return
    autoPrintedRef.current = true
    const timer = window.setTimeout(printBarcode, 300)
    return () => window.clearTimeout(timer)
  }, [autoPrint])

  const printArea = (
    <div className="barcode-print-area flex flex-col items-center gap-1.5 py-4 px-3 border border-gray-100 rounded-xl bg-white">
      <svg ref={svgRef} className="max-w-full" />
      <p className="text-xs text-gray-600 font-medium">{productName}</p>
      <p className="text-xs text-gray-400">{customerName}</p>
    </div>
  )

  return (
    <>
      <style>{`
        @media screen {
          .barcode-print-silent-host {
            position: fixed !important;
            top: 0 !important;
            left: -10000px !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        }
        @media print {
          body > * { visibility: hidden !important; }
          .barcode-print-silent-host {
            position: static !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          .barcode-print-area,
          .barcode-print-area * { visibility: visible !important; }
          .barcode-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 80mm !important;
            padding: 4mm !important;
          }
          .barcode-print-controls { display: none !important; }
        }
      `}</style>

      {presentation === 'silent' ? (
        <div className="barcode-print-silent-host" aria-hidden="true">
          {printArea}
        </div>
      ) : (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="barcode-print-controls flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">바코드 출력</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {printArea}

          <button
            onClick={printBarcode}
            className="barcode-print-controls w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            출력
          </button>
        </div>
      </div>
      )}
    </>
  )
}
