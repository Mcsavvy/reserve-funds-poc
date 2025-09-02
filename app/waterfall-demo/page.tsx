"use client"

import { WaterfallTimeline } from "@/components/ui/waterfall-timeline"
import { formatCurrency } from "@/lib/db-utils"

export default function WaterfallDemoPage() {
  // Sample data matching the image description
  const sampleData = [
    { year: 2029, value: 23000000 },
    { year: 2030, value: 18000000 },
    { year: 2031, value: 15000000 },
    { year: 2032, value: 12000000 },
    { year: 2033, value: 8000000 },
    { year: 2034, value: 5000000 },
    { year: 2035, value: 2000000 },
    { year: 2036, value: 23000000, overlayValue: 25000000 }, // With overlay
    { year: 2037, value: -4000000 },
    { year: 2038, value: -8000000 },
    { year: 2039, value: 23000000, overlayValue: 26000000 }, // With overlay
    { year: 2040, value: 20000000 },
    { year: 2041, value: 18000000 },
    { year: 2042, value: 15000000 },
    { year: 2043, value: 12000000 },
    { year: 2044, value: 10000000 },
    { year: 2045, value: -23543000 },
    { year: 2046, value: -20000000, overlayValue: -18000000 }, // With overlay
    { year: 2047, value: -15000000 },
    { year: 2048, value: -10000000 },
    { year: 2049, value: -5000000 },
    { year: 2050, value: 0 },
    { year: 2051, value: 5000000 },
    { year: 2052, value: 10000000 },
    { year: 2053, value: 15000000 },
    { year: 2054, value: 20000000 },
    { year: 2055, value: 23000000 },
    { year: 2057, value: 25000000 },
    { year: 2058, value: 28000000 },
    { year: 2059, value: 30000000 },
  ]

  // Custom formatter for currency display matching the image format
  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Waterfall Timeline Chart Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A custom SVG-based candlestick/waterfall timeline chart component that renders financial data over time with positive/negative values, stems, and optional overlays.
          </p>
        </div>

        {/* Main Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Financial Projections Timeline (2029-2059)
          </h2>
          <WaterfallTimeline
            data={sampleData}
            height={400}
            formatValue={currencyFormatter}
            showYearGrid={true}
          />
          <div className="mt-4 text-sm text-gray-500 text-center">
            Green bars: Positive values (surplus), Red bars: Negative values (deficit)
          </div>
        </div>

        {/* Alternative Formatting Examples */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Full Currency Format
            </h3>
            <WaterfallTimeline
              data={sampleData.slice(0, 10)}
              height={300}
              formatValue={(value) => formatCurrency(value)}
            />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Compact Display
            </h3>
            <WaterfallTimeline
              data={sampleData.slice(10, 20)}
              height={300}
              minColumnWidth={12}
            />
          </div>
        </div>

        {/* Component Features */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Component Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Visual Elements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Green bars for positive values (surplus)</li>
                <li>• Red bars for negative values (deficit)</li>
                <li>• Vertical stems connecting bars to baseline</li>
                <li>• Optional lighter overlays for planned values</li>
                <li>• Year labels below each bar</li>
                <li>• Value labels above/below bars</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Customization</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Custom value formatting (currency, percentages, etc.)</li>
                <li>• Configurable margins and dimensions</li>
                <li>• Optional year grid lines</li>
                <li>• Responsive width support</li>
                <li>• Custom column widths and spacing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
