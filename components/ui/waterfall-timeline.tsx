"use client"

import React, { useMemo, useState, useRef } from "react"

type WaterfallDatum = {
  year: number | string
  value: number
  // Optional lighter overlay for planned/estimated portion of a positive bar
  overlayValue?: number
  // Optional label override, defaults to formatted value
  label?: string
}

export type WaterfallTimelineProps = {
  data: WaterfallDatum[]
  width?: number | string
  height?: number | string
  /** space around plot area */
  margin?: { top: number; right: number; bottom: number; left: number }
  /** number formatter for values (e.g., currency) */
  formatValue?: (n: number) => string
  /** min column width in px (incl. gap). Responsive if width is percentage */
  minColumnWidth?: number
  /** vertical grid at year ticks */
  showYearGrid?: boolean
  /** show tooltip on hover */
  showTooltip?: boolean
}

const defaultMargin = { top: 16, right: 24, bottom: 20, left: 24 }

const GREEN = "#12BF6C4D"
const GREEN_DARK = "#12BF6C"
const RED = "#FF00004D"
const RED_DARK = "#FF0000"
const MUTED = "#6b7280" // gray-500 for axis labels
const GRID = "#e5e7eb" // gray-200

export function WaterfallTimeline({
  data,
  width = "100%",
  height = 280,
  margin = defaultMargin,
  minColumnWidth = 10,
  showYearGrid = false,
  formatValue,
  showTooltip = true,
}: WaterfallTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    data: WaterfallDatum
    position: 'left' | 'right'
  } | null>(null)

  const formatted = useMemo(() => {
    const values = data.map((d) => d.value)
    const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)))
    const maxPos = Math.max(0, ...values)
    const maxNeg = Math.min(0, ...values)
    return { maxAbs, maxPos, maxNeg }
  }, [data])

  const innerHeight = (typeof height === "number" ? height : 280) - (margin.top + margin.bottom)
  const innerWidthNumeric = typeof width === "number" ? width : undefined

  // Compute dynamic scaling to fit all bars within container
  const totalGap = 64 + 20 // positive gap + negative gap
  const availableHeight = innerHeight - totalGap * 2 // Account for gaps above and below baseline
  const maxBarHeight = Math.min(availableHeight / 2, 100) // Limit max bar height to prevent overflow
  
  function barHeightFromValue(v: number) {
    if (v === 0) return 0
    const maxValue = Math.max(Math.abs(formatted.maxPos), Math.abs(formatted.maxNeg))
    if (maxValue === 0) return 0
    return (Math.abs(v) / maxValue) * maxBarHeight
  }

  // Render
  return (
    <div ref={containerRef} style={{ width, height, position: "relative" }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${innerWidthNumeric || 1000} ${typeof height === "number" ? height : 280}`} preserveAspectRatio="none">
        {(() => {
          const W = innerWidthNumeric || 1000
          const H = typeof height === "number" ? height : 280
          const plotX = margin.left
          const plotY = margin.top
          const plotW = W - margin.left - margin.right
          const plotH = H - margin.top - margin.bottom
          const baseY = plotY + plotH / 2 // Baseline centered in the chart area
          const yearTextY = baseY + 14 // Year labels directly on the baseline
          const gap = 64 // Gap between bars and baseline (4x longer wicks)
          const negativeGap = gap + 20 // Extra gap for negative bars to clear year labels
          const negativeWickEnd = yearTextY + 8 // Lower endpoint for negative wicks below year labels

          const count = data.length
          const columnGap = 10
          const columnWidth = Math.max(minColumnWidth - columnGap, Math.floor((plotW - columnGap * (count - 1)) / count))
          const step = columnWidth + columnGap

          // Optional vertical grid
          return (
            <g>
              <rect x={plotX} y={plotY} width={plotW} height={plotH} fill="#ffffff" />
              {showYearGrid && data.map((_, i) => (
                <line key={`grid-${i}`} x1={plotX + i * step + columnWidth / 2} x2={plotX + i * step + columnWidth / 2} y1={plotY} y2={plotY + plotH} stroke={GRID} strokeWidth={1} />
              ))}
              {/* Baseline axis */}
              <line x1={plotX} x2={plotX + plotW} y1={baseY} y2={baseY} stroke="transparent" strokeWidth={1} />
              {/* Bars */}
              {data.map((d, i) => {
                const x = plotX + i * step
                const isPos = d.value >= 0
                const h = barHeightFromValue(d.value)
                const y = isPos ? baseY - h - gap : baseY + negativeGap
                const color = isPos ? GREEN_DARK : RED_DARK
                const stemColor = isPos ? GREEN : RED
                const overlay = d.overlayValue && d.overlayValue > 0 ? Math.max(0, d.overlayValue - Math.max(0, d.value)) : 0
                const overlayHeight = overlay > 0 ? barHeightFromValue(overlay) : 0

                return (
                  <g key={`bar-${i}`}>
                    {/* wick split into two segments with alternating ratios */}
                    {(() => {
                      const splitRatio = (i % 2 === 0) ? 0.5 : 0.75 // 1:1 for even, 3:1 for odd
                      const wickStart = isPos ? y + h : y
                      const wickEnd = isPos ? baseY : negativeWickEnd
                      const wickLength = Math.abs(wickEnd - wickStart)
                      const splitPoint = isPos ? wickStart + (wickLength * splitRatio) : wickStart - (wickLength * splitRatio)
                      
                      return (
                        <>
                          {/* first wick segment */}
                          <line x1={x + columnWidth / 2} x2={x + columnWidth / 2} y1={wickStart} y2={isPos ? splitPoint - 8 : splitPoint + 8} stroke={stemColor} strokeWidth={2} />
                          {/* second wick segment */}
                          <line x1={x + columnWidth / 2} x2={x + columnWidth / 2} y1={isPos ? splitPoint + 8 : splitPoint - 8} y2={wickEnd} stroke={stemColor} strokeWidth={2} />
                          {/* value label at split point */}
                          <text x={x + columnWidth / 2} y={splitPoint + (isPos ? 4 : 4)} textAnchor="middle" fontSize={10} fill={isPos ? GREEN_DARK : RED_DARK}>
                            {d.label || (formatValue ? formatValue(Math.abs(d.value)) : String(Math.abs(d.value)))}
                          </text>
                        </>
                      )
                    })()}
                                          {/* body */}
                      <rect 
                        x={x} 
                        y={y} 
                        width={columnWidth} 
                        height={h} 
                        rx={2} 
                        fill={color}
                        onMouseEnter={(e) => {
                          if (showTooltip && containerRef.current) {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const containerRect = containerRef.current.getBoundingClientRect()
                            const barCenterX = rect.left - containerRect.left + rect.width / 2
                            const chartCenterX = containerRect.width / 2
                            
                            // Position tooltip to left or right based on bar position
                            const tooltipX = barCenterX < chartCenterX 
                              ? barCenterX + 20  // Right of bar if on left side
                              : barCenterX - 20  // Left of bar if on right side
                            
                            setTooltip({
                              visible: true,
                              x: tooltipX,
                              y: rect.top - containerRect.top - 10,
                              data: d,
                              position: barCenterX < chartCenterX ? 'right' : 'left'
                            })
                          }
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    {/* overlay (lighter top for positive) */}
                    {isPos && overlayHeight > 0 ? (
                      <rect x={x} y={y - overlayHeight} width={columnWidth} height={overlayHeight} rx={2} fill={GREEN} opacity={0.35} />
                    ) : null}
                    {/* value label near stem tip */}
                    {/* <text x={x + columnWidth / 2} y={isPos ? y - 6 : y + h + 14} textAnchor="middle" fontSize={10} fill={isPos ? GREEN_DARK : RED_DARK}>
                      {d.label || (formatValue ? formatValue(Math.abs(d.value)) : String(Math.abs(d.value)))}
                    </text> */}
                    {/* year label */}
                    <text x={x + columnWidth / 2} y={yearTextY} textAnchor="middle" fontSize={10} fill={MUTED}>
                      {String(d.year)}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })()}
      </svg>
      
      {/* Tooltip */}
      {tooltip && showTooltip && (
        <div
          className="absolute bg-white border border-gray-200 rounded-lg p-4 shadow-xl"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: tooltip.position === 'left' ? 'translateX(-100%)' : 'translateX(0)',
            zIndex: 1000,
            whiteSpace: 'nowrap'
          }}
        >
          <div className="font-semibold text-gray-900 mb-2">Year {tooltip.data.year}</div>
          <div className="text-sm">
            {tooltip.data.label || (formatValue ? formatValue(Math.abs(tooltip.data.value)) : String(Math.abs(tooltip.data.value)))}
          </div>
          {tooltip.data.overlayValue && (
            <div className="text-sm opacity-75">
              Planned: {formatValue ? formatValue(Math.abs(tooltip.data.overlayValue)) : String(Math.abs(tooltip.data.overlayValue))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WaterfallTimeline

/*
Usage example:

<WaterfallTimeline
  data={[
    { year: 2029, value: 23000000 },
    { year: 2030, value: 18000000 },
    { year: 2037, value: -4000000 },
  ]}
  height={320}
  formatValue={(n)=> `$${(n/1_000_000).toFixed(0)},000,000`}
  showYearGrid={false}
/>
*/


