#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const [desktopOutput, mobileOutput] = process.argv.slice(2)
const repository = process.env.GITHUB_REPOSITORY || 'seorooficial/whatsapp-duo'
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN

if (!desktopOutput || !mobileOutput) {
  throw new Error('Usage: generate-star-history.mjs <desktop.svg> <mobile.svg>')
}

if (!token) {
  throw new Error('GITHUB_TOKEN or GH_TOKEN is required')
}

const apiHeaders = {
  Accept: 'application/vnd.github.star+json',
  Authorization: `Bearer ${token}`,
  'User-Agent': 'whatsapp-duo-star-history',
  'X-GitHub-Api-Version': '2026-03-10'
}

async function githubJson (url) {
  const response = await fetch(url, { headers: apiHeaders })
  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status} for ${url}`)
  }
  return response.json()
}

async function getStargazers () {
  const stargazers = []

  for (let pageNumber = 1; ; pageNumber += 1) {
    const page = await githubJson(
      `https://api.github.com/repos/${repository}/stargazers?per_page=100&page=${pageNumber}`
    )
    stargazers.push(...page)
    if (page.length < 100) break
  }

  return stargazers
}

function startOfUtcDay (value) {
  const date = new Date(value)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function escapeXml (value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function normalizeSvg (value) {
  return value
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
}

function formatDate (date, compact = false) {
  return new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    month: compact ? 'short' : 'short',
    day: 'numeric',
    year: compact ? undefined : 'numeric'
  }).format(date)
}

function buildSeries (createdAt, stargazers) {
  const created = startOfUtcDay(createdAt)
  const daily = new Map()

  for (const item of stargazers) {
    if (!item.starred_at) continue
    const key = startOfUtcDay(item.starred_at).toISOString().slice(0, 10)
    daily.set(key, (daily.get(key) || 0) + 1)
  }

  const series = [{ date: created, value: 0 }]
  let total = 0

  for (const [date, count] of [...daily.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    total += count
    series.push({ date: startOfUtcDay(`${date}T00:00:00Z`), value: total })
  }

  return { created, series, total }
}

function uniqueNumberTicks (maximum, count) {
  if (maximum <= 0) return [0]
  const values = new Set([0, maximum])
  for (let index = 1; index < count - 1; index += 1) {
    values.add(Math.round((maximum * index) / (count - 1)))
  }
  return [...values].sort((a, b) => a - b)
}

function renderChart ({ repository, created, series, total, mobile }) {
  const width = mobile ? 700 : 1200
  const height = mobile ? 650 : 480
  const margin = mobile
    ? { top: 210, right: 48, bottom: 84, left: 72 }
    : { top: 145, right: 72, bottom: 72, left: 86 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const domainStart = created
  const lastPoint = series.at(-1)
  const domainEnd = lastPoint.date
  const sameDay = domainEnd.getTime() === domainStart.getTime()
  const domainDuration = Math.max(1, domainEnd.getTime() - domainStart.getTime())
  const yMaximum = Math.max(1, total)
  const x = date => sameDay
    ? margin.left + plotWidth / 2
    : margin.left + ((date.getTime() - domainStart.getTime()) / domainDuration) * plotWidth
  const y = value => margin.top + plotHeight - (value / yMaximum) * plotHeight
  const xTickCount = sameDay ? 1 : (mobile ? 3 : 5)
  const yTicks = uniqueNumberTicks(total, mobile ? 4 : 5)
  const xTicks = sameDay
    ? [domainStart]
    : Array.from({ length: xTickCount }, (_, index) =>
      new Date(domainStart.getTime() + (domainDuration * index) / (xTickCount - 1))
    )
  const linePoints = series.map(point => `${x(point.date).toFixed(1)},${y(point.value).toFixed(1)}`)
  const linePath = linePoints.map((point, index) => `${index === 0 ? 'M' : 'L'}${point}`).join(' ')
  const areaPath = total > 0
    ? `${linePath} L${x(lastPoint.date).toFixed(1)},${y(0).toFixed(1)} L${x(series[0].date).toFixed(1)},${y(0).toFixed(1)} Z`
    : ''
  const owner = repository.split('/')[0]
  const repoName = repository.split('/')[1]
  const titleSize = mobile ? 34 : 30
  const countSize = mobile ? 62 : 56
  const labelSize = mobile ? 18 : 14
  const tickSize = mobile ? 17 : 12
  const lastX = x(lastPoint.date)
  const labelNearRightEdge = lastX > width - margin.right - (mobile ? 175 : 115)
  const lastLabelX = lastX + (labelNearRightEdge ? -14 : 14)
  const lastLabelAnchor = labelNearRightEdge ? 'end' : 'start'

  const horizontalGrid = yTicks.map(value => {
    const position = Math.round(y(value)) + 0.5
    return `
      <line x1="${margin.left}" y1="${position}" x2="${width - margin.right}" y2="${position}"
            stroke="#DFFAF2" stroke-opacity="0.10" stroke-width="1" shape-rendering="crispEdges"/>
      <text x="${margin.left - 18}" y="${position + 4}" text-anchor="end"
            fill="#8696A0" font-size="${tickSize}" font-variant-numeric="tabular-nums">${value}</text>`
  }).join('')

  const xAxis = xTicks.map((date, index) => {
    const position = Math.round(x(date)) + 0.5
    const anchor = index === 0 ? 'start' : index === xTicks.length - 1 ? 'end' : 'middle'
    return `
      <line x1="${position}" y1="${margin.top}" x2="${position}" y2="${margin.top + plotHeight}"
            stroke="#DFFAF2" stroke-opacity="0.055" stroke-width="1" shape-rendering="crispEdges"/>
      <text x="${position}" y="${margin.top + plotHeight + (mobile ? 38 : 30)}" text-anchor="${anchor}"
            fill="#8696A0" font-size="${tickSize}">${escapeXml(formatDate(date, mobile))}</text>`
  }).join('')

  const emptyState = total === 0
    ? `
      <line x1="${margin.left}" y1="${y(0)}" x2="${width - margin.right}" y2="${y(0)}"
            stroke="#2DD4A5" stroke-opacity="0.55" stroke-width="${mobile ? 4 : 3}"
            stroke-dasharray="10 10" stroke-linecap="round"/>
      <text x="${width / 2}" y="${margin.top + plotHeight / 2 - 8}" text-anchor="middle"
            fill="#DFFAF2" font-size="${mobile ? 23 : 17}" font-weight="700">
        THE CURVE STARTS WITH THE FIRST STAR
      </text>
      <text x="${width / 2}" y="${margin.top + plotHeight / 2 + (mobile ? 27 : 22)}" text-anchor="middle"
            fill="#8696A0" font-size="${mobile ? 17 : 13}">
        Live counter ready · no fabricated data
      </text>`
    : `
      <path d="${areaPath}" fill="url(#areaGradient)"/>
      <path d="${linePath}" fill="none" stroke="#2DD4A5" stroke-width="${mobile ? 5 : 3}"
            stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      ${series.slice(1).map((point, index) => {
        const isLast = index === series.length - 2
        return `<circle cx="${x(point.date).toFixed(1)}" cy="${y(point.value).toFixed(1)}"
                  r="${isLast ? (mobile ? 8 : 6) : (mobile ? 5 : 3.5)}"
                  fill="${isLast ? '#DFFAF2' : '#2DD4A5'}" stroke="#071016" stroke-width="2"/>`
      }).join('')}
      <text x="${lastLabelX}"
            y="${Math.max(margin.top + 18, y(lastPoint.value) - 15)}"
            text-anchor="${lastLabelAnchor}"
            fill="#DFFAF2" font-size="${labelSize}" font-weight="700">
        ${total} ${total === 1 ? 'star' : 'stars'} · ${escapeXml(formatDate(lastPoint.date, mobile))}
      </text>`

  const header = mobile
    ? `
      <text x="48" y="70" fill="#2DD4A5" font-size="15" font-weight="800" letter-spacing="4">STAR GROWTH</text>
      <text x="48" y="116" fill="#F5FBFC" font-size="${titleSize}" font-weight="800">${escapeXml(repoName)}</text>
      <text x="48" y="147" fill="#8696A0" font-size="17">${escapeXml(owner)} · cumulative GitHub stars</text>
      <text x="48" y="199" fill="#F5FBFC" font-size="${countSize}" font-weight="800"
            font-variant-numeric="tabular-nums">${total}</text>
      <text x="${48 + (String(total).length * 39)}" y="196" fill="#8696A0" font-size="17" font-weight="700">TOTAL STARS</text>`
    : `
      <text x="60" y="58" fill="#2DD4A5" font-size="13" font-weight="800" letter-spacing="4">STAR GROWTH</text>
      <text x="60" y="101" fill="#F5FBFC" font-size="${titleSize}" font-weight="800">${escapeXml(repoName)}</text>
      <text x="60" y="127" fill="#8696A0" font-size="14">${escapeXml(owner)} · cumulative GitHub stars</text>
      <text x="${width - 64}" y="83" text-anchor="end" fill="#F5FBFC" font-size="${countSize}" font-weight="800"
            font-variant-numeric="tabular-nums">${total}</text>
      <text x="${width - 64}" y="111" text-anchor="end" fill="#8696A0" font-size="13" font-weight="700"
            letter-spacing="2">TOTAL STARS</text>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
     role="img" aria-labelledby="chart-title chart-description"
     font-family="DejaVu Sans, Arial, sans-serif">
  <title id="chart-title">Star growth for ${escapeXml(repository)}</title>
  <desc id="chart-description">Cumulative GitHub stars since the repository was created. Current total: ${total}.</desc>
  <defs>
    <linearGradient id="backgroundGradient" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#10242E"/>
      <stop offset="0.58" stop-color="#071016"/>
      <stop offset="1" stop-color="#09171D"/>
    </linearGradient>
    <linearGradient id="areaGradient" x1="0" y1="${margin.top}" x2="0" y2="${margin.top + plotHeight}">
      <stop stop-color="#2DD4A5" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#2DD4A5" stop-opacity="0.025"/>
    </linearGradient>
    <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" rx="${mobile ? 28 : 22}" fill="url(#backgroundGradient)"/>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${mobile ? 27 : 21}"
        fill="none" stroke="#2DD4A5" stroke-opacity="0.18"/>
  ${header}
  <g font-family="Inter, Segoe UI, system-ui, sans-serif">
    ${horizontalGrid}
    ${xAxis}
    <g filter="${total > 0 ? 'url(#lineGlow)' : ''}">${emptyState}</g>
    <text x="${margin.left}" y="${height - 25}" fill="#627A85" font-size="${mobile ? 14 : 10}"
          font-weight="700" letter-spacing="${mobile ? 2 : 1.5}">SOURCE · GITHUB API</text>
    <text x="${width - margin.right}" y="${height - 25}" text-anchor="end" fill="#627A85"
          font-size="${mobile ? 14 : 10}" font-weight="700" letter-spacing="${mobile ? 2 : 1.5}">
      CUMULATIVE · UTC
    </text>
  </g>
</svg>
`
}

const metadata = await githubJson(`https://api.github.com/repos/${repository}`)
const stargazers = await getStargazers()
const chartData = buildSeries(metadata.created_at, stargazers)
const desktopSvg = normalizeSvg(renderChart({ repository, ...chartData, mobile: false }))
const mobileSvg = normalizeSvg(renderChart({ repository, ...chartData, mobile: true }))

await mkdir(path.dirname(desktopOutput), { recursive: true })
await mkdir(path.dirname(mobileOutput), { recursive: true })
await writeFile(desktopOutput, desktopSvg, 'utf8')
await writeFile(mobileOutput, mobileSvg, 'utf8')

console.log(`Generated star history for ${repository}: ${chartData.total} stars`)
