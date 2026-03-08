'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchNotes, fetchLinks, analyzeGraph, setSelectedNoteId,
  selectAllNotes, selectAllLinks, selectLastAnalysis, selectKnowledgeGenerating,
} from '@/state/slices/knowledgeSlice'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Network, ZoomIn, ZoomOut, RotateCcw, Brain, ChevronLeft, Sparkles, BarChart2 } from 'lucide-react'
import type { NoteType } from '@/types/knowledge'
import type { GraphMetrics } from '@/lib/knowledge/graphAnalytics'

const TYPE_COLORS_HEX: Record<NoteType, string> = {
  fleeting: '#94a3b8',    // slate
  permanent: '#fbbf24',   // amber
  concept: '#3b82f6',     // blue
  experience: '#10b981',  // emerald
  project: '#a855f7',     // purple
  hub: '#f97316',         // orange
  reference: '#6b7280',   // gray
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  supports: '#10b981',
  contradicts: '#ef4444',
  extends: '#3b82f6',
  applies_to: '#a855f7',
  derived_from: '#f97316',
  related: '#6b7280',
}

interface GraphNode {
  id: string
  title: string
  type: NoteType
  source: string
  importance: number
  confidence: number
  tags: string[]
  x: number
  y: number
  vx: number
  vy: number
  fx?: number
  fy?: number
}

interface GraphEdge {
  id: string
  source: string
  target: string
  relationship: string
  strength: number
}

function useForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  running: boolean
) {
  const nodesRef = useRef<GraphNode[]>([])
  const [tick, setTick] = useState(0)
  const frameRef = useRef<number>()
  const iterRef = useRef(0)

  useEffect(() => {
    if (nodes.length === 0) return

    // Initialize positions if needed
    const existing = new Map(nodesRef.current.map(n => [n.id, n]))
    nodesRef.current = nodes.map(n => {
      const ex = existing.get(n.id)
      return {
        ...n,
        x: ex?.x ?? width / 2 + (Math.random() - 0.5) * 300,
        y: ex?.y ?? height / 2 + (Math.random() - 0.5) * 300,
        vx: ex?.vx ?? 0,
        vy: ex?.vy ?? 0,
      }
    })
    iterRef.current = 0
  }, [nodes.length, width, height])

  useEffect(() => {
    if (!running) return

    const simulate = () => {
      if (iterRef.current > 300) return // Cool down after 300 iterations
      iterRef.current++

      const ns = nodesRef.current
      const alpha = Math.max(0.01, 0.3 * (1 - iterRef.current / 300))

      // Repulsion force (nodes push each other away)
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x
          const dy = ns[j].y - ns[i].y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const repulse = (150 * alpha) / (dist * dist)
          ns[i].vx -= dx * repulse
          ns[i].vy -= dy * repulse
          ns[j].vx += dx * repulse
          ns[j].vy += dy * repulse
        }
      }

      // Attraction force along edges
      const nodeMap = new Map(ns.map(n => [n.id, n]))
      for (const edge of edges) {
        const src = nodeMap.get(edge.source)
        const tgt = nodeMap.get(edge.target)
        if (!src || !tgt) continue
        const dx = tgt.x - src.x
        const dy = tgt.y - src.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const targetDist = 120
        const attract = ((dist - targetDist) * edge.strength * alpha) / dist
        src.vx += dx * attract
        src.vy += dy * attract
        tgt.vx -= dx * attract
        tgt.vy -= dy * attract
      }

      // Gravity toward center
      for (const n of ns) {
        if (n.fx !== undefined) { n.x = n.fx; n.vy = 0; continue }
        if (n.fy !== undefined) { n.y = n.fy; n.vx = 0; continue }
        n.vx += (width / 2 - n.x) * 0.01 * alpha
        n.vy += (height / 2 - n.y) * 0.01 * alpha
        // Damping
        n.vx *= 0.8
        n.vy *= 0.8
        n.x += n.vx
        n.y += n.vy
        // Bounds
        n.x = Math.max(40, Math.min(width - 40, n.x))
        n.y = Math.max(40, Math.min(height - 40, n.y))
      }

      setTick(t => t + 1)
      frameRef.current = requestAnimationFrame(simulate)
    }

    frameRef.current = requestAnimationFrame(simulate)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [running, edges, width, height])

  return { nodes: nodesRef.current, tick }
}

export default function KnowledgeGraphPage() {
  const dispatch = useAppDispatch()
  const rawNotes = useAppSelector(selectAllNotes)
  const rawLinks = useAppSelector(selectAllLinks)
  const analysis = useAppSelector(selectLastAnalysis)
  const isGenerating = useAppSelector(selectKnowledgeGenerating)

  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 1000, height: 700 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [simulationRunning, setSimulationRunning] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null)
  const [graphMetrics, setGraphMetrics] = useState<GraphMetrics | null>(null)
  const [showMetrics, setShowMetrics] = useState(false)

  useEffect(() => {
    dispatch(fetchNotes())
    dispatch(fetchLinks())
    fetch('/api/knowledge/graph-analytics')
      .then(r => r.json())
      .then(d => { if (d.metrics) setGraphMetrics(d.metrics) })
      .catch(() => {})
  }, [dispatch])

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const nodes: GraphNode[] = rawNotes
    .filter(n => typeFilter === 'all' || n.type === typeFilter)
    .map(n => ({
      id: n.id,
      title: n.title,
      type: n.type,
      source: n.source,
      importance: n.importance,
      confidence: n.confidence,
      tags: n.tags,
      x: 0, y: 0, vx: 0, vy: 0,
    }))

  const nodeIds = new Set(nodes.map(n => n.id))
  const edges: GraphEdge[] = rawLinks
    .filter(l => nodeIds.has(l.sourceNoteId) && nodeIds.has(l.targetNoteId))
    .map(l => ({
      id: l.id,
      source: l.sourceNoteId,
      target: l.targetNoteId,
      relationship: l.relationship,
      strength: l.strength,
    }))

  const { nodes: simNodes, tick } = useForceSimulation(nodes, edges, dimensions.width, dimensions.height, simulationRunning)

  const nodeMap = new Map(simNodes.map(n => [n.id, n]))

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).tagName === 'svg' || (e.target as SVGElement).tagName === 'rect') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleSvgMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    }
  }

  const handleSvgMouseUp = () => setIsPanning(false)

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => Math.max(0.2, Math.min(4, z - e.deltaY * 0.001)))
  }, [])

  const handleNodeClick = (nodeId: string) => {
    dispatch(setSelectedNoteId(nodeId))
  }

  const handleNodeDoubleClick = (nodeId: string) => {
    window.location.href = '/knowledge'
    dispatch(setSelectedNoteId(nodeId))
  }

  const getNodeRadius = (node: GraphNode) => {
    const degree = edges.filter(e => e.source === node.id || e.target === node.id).length
    const base = node.type === 'hub' ? 18 : 10
    return Math.min(32, base + degree * 2 + node.importance * 8)
  }

  const NOTE_TYPES: string[] = ['fleeting', 'permanent', 'concept', 'experience', 'project', 'hub', 'reference']

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <a href="/knowledge" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest">Knowledge Graph</span>
          </a>
          <div className="h-4 w-px bg-border/50" />
          <span className="text-[10px] font-mono text-muted-foreground/50">{simNodes.length} nodes · {edges.length} edges</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Type filter */}
          <div className="flex gap-1">
            <button
              onClick={() => setTypeFilter('all')}
              className={cn('text-[8px] font-mono uppercase px-1.5 py-0.5 rounded', typeFilter === 'all' ? 'bg-primary text-white' : 'bg-muted/30 text-muted-foreground')}
            >All</button>
            {NOTE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn('text-[8px] font-mono uppercase px-1.5 py-0.5 rounded', typeFilter === t ? 'bg-primary text-white' : 'bg-muted/30 text-muted-foreground')}
              >{t.slice(0, 3)}</button>
            ))}
          </div>

          <div className="h-4 w-px bg-border/50" />

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(4, z * 1.2))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.2, z / 1.2))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-7 text-[10px] font-mono text-amber-400 hover:bg-amber-500/10"
            onClick={() => { dispatch(analyzeGraph()); setSimulationRunning(true) }}
            disabled={isGenerating}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            {isGenerating ? 'Analyzing...' : 'Analyze'}
          </Button>
          <Button
            variant="ghost" size="sm"
            className={`h-7 text-[10px] font-mono hover:bg-primary/10 ${showMetrics ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => setShowMetrics(s => !s)}
          >
            <BarChart2 className="h-3.5 w-3.5 mr-1" />
            Metrics
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-background/90 border border-border/50 rounded p-2 backdrop-blur-sm">
        <p className="text-[8px] font-mono font-bold uppercase text-muted-foreground/50 mb-1.5">Note Types</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {NOTE_TYPES.map(t => (
            <div key={t} className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS_HEX[t as NoteType] }} />
              <span className="text-[8px] font-mono text-muted-foreground/60">{t}</span>
            </div>
          ))}
        </div>
        <p className="text-[8px] font-mono font-bold uppercase text-muted-foreground/50 mt-1.5 mb-1">Relationships</p>
        {Object.entries(RELATIONSHIP_COLORS).slice(0, 4).map(([r, c]) => (
          <div key={r} className="flex items-center gap-1">
            <div className="h-px w-4" style={{ background: c }} />
            <span className="text-[8px] font-mono text-muted-foreground/60">{r}</span>
          </div>
        ))}
      </div>

      {/* Analysis panel */}
      {analysis && (
        <div className="absolute top-16 right-4 z-10 w-56 bg-background/90 border border-border/50 rounded p-3 backdrop-blur-sm max-h-64 overflow-y-auto">
          <p className="text-[9px] font-mono font-bold uppercase text-muted-foreground/50 mb-2">Graph Analysis</p>
          <div className="space-y-1">
            <p className="text-[10px] text-foreground font-mono">
              Health: <span className="text-primary">{Math.round((analysis.structuralHealth || 0) * 100)}%</span>
            </p>
            <p className="text-[10px] text-foreground font-mono">
              Phase: <span className="text-amber-400">{analysis.evolutionPhase}</span>
            </p>
            {analysis.clusters?.slice(0, 3).map((c, i) => (
              <div key={i} className="mt-1 p-1.5 bg-primary/5 rounded">
                <p className="text-[9px] font-mono font-bold text-primary">{c.name}</p>
                <p className="text-[8px] text-muted-foreground/60">{c.notes.length} notes</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graph Metrics panel */}
      {showMetrics && graphMetrics && (
        <div className="absolute top-16 left-4 z-10 w-52 bg-background/90 border border-border/50 rounded p-3 backdrop-blur-sm">
          <p className="text-[9px] font-mono font-bold uppercase text-muted-foreground/50 mb-2">Graph Metrics</p>
          <div className="space-y-1.5 text-[10px] font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Orphan notes</span>
              <span className="text-amber-400">{graphMetrics.orphanCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Clusters</span>
              <span className="text-primary">{graphMetrics.clusterCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg connections</span>
              <span className="text-foreground">{graphMetrics.avgConnections.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hub nodes</span>
              <span className="text-orange-400">{graphMetrics.hubNodes.length}</span>
            </div>
            {graphMetrics.mostLinkedNote && (
              <div className="mt-1.5 pt-1.5 border-t border-border/30">
                <p className="text-muted-foreground/60 text-[8px] uppercase mb-0.5">Most linked</p>
                <p className="text-foreground truncate">{graphMetrics.mostLinkedNote.title}</p>
              </div>
            )}
            {graphMetrics.hubNodes.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-border/30">
                <p className="text-muted-foreground/60 text-[8px] uppercase mb-1">Hub nodes (≥3 links)</p>
                {graphMetrics.hubNodes.slice(0, 3).map(n => (
                  <p key={n.id} className="text-orange-400 truncate text-[9px]">{n.title}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          onWheel={handleWheel}
          style={{ userSelect: 'none' }}
        >
          {/* Background */}
          <rect width={dimensions.width} height={dimensions.height} fill="transparent" />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map(edge => {
              const src = nodeMap.get(edge.source)
              const tgt = nodeMap.get(edge.target)
              if (!src || !tgt) return null
              const color = RELATIONSHIP_COLORS[edge.relationship] || '#6b7280'
              return (
                <line
                  key={edge.id}
                  x1={src.x} y1={src.y}
                  x2={tgt.x} y2={tgt.y}
                  stroke={color}
                  strokeWidth={edge.strength * 2}
                  strokeOpacity={0.4}
                  strokeDasharray={edge.relationship === 'contradicts' ? '4,3' : undefined}
                />
              )
            })}

            {/* Nodes */}
            {simNodes.map(node => {
              const r = getNodeRadius(node)
              const color = TYPE_COLORS_HEX[node.type]
              const isHovered = hoveredNode === node.id
              const isHub = node.type === 'hub'
              const isAI = node.source === 'AI'

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  onClick={() => handleNodeClick(node.id)}
                  onDoubleClick={() => handleNodeDoubleClick(node.id)}
                  onMouseEnter={() => { setHoveredNode(node.id); setTooltip({ x: node.x, y: node.y, node }) }}
                  onMouseLeave={() => { setHoveredNode(null); setTooltip(null) }}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Hub halo */}
                  {isHub && (
                    <circle r={r + 8} fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.3} />
                  )}

                  {/* AI pulse ring */}
                  {isAI && (
                    <circle r={r + 4} fill="none" stroke="#fbbf24" strokeWidth={1.5} strokeOpacity={0.5}>
                      <animate attributeName="r" values={`${r + 3};${r + 7};${r + 3}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Node circle */}
                  <circle
                    r={r}
                    fill={`${color}22`}
                    stroke={color}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    filter={isHovered ? `drop-shadow(0 0 ${r/2}px ${color})` : undefined}
                  />

                  {/* Confidence ring */}
                  <circle
                    r={r - 2}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeOpacity={node.confidence}
                    strokeDasharray={`${node.confidence * 2 * Math.PI * (r - 2)} ${2 * Math.PI * (r - 2)}`}
                    transform="rotate(-90)"
                  />

                  {/* Label */}
                  <text
                    textAnchor="middle"
                    y={r + 10}
                    fontSize={isHovered ? 9 : 8}
                    fontFamily="monospace"
                    fill={isHovered ? color : '#9ca3af'}
                    fontWeight={isHovered ? 'bold' : 'normal'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.title.length > 18 ? node.title.slice(0, 16) + '…' : node.title}
                  </text>
                </g>
              )
            })}
          </g>

          {/* Tooltip */}
          {tooltip && hoveredNode && (
            <foreignObject
              x={Math.min(tooltip.x * zoom + pan.x + 10, dimensions.width - 220)}
              y={Math.max(tooltip.y * zoom + pan.y - 80, 10)}
              width={200}
              height={90}
            >
              <div className="bg-background/95 border border-border/50 rounded p-2 text-xs font-mono shadow-xl">
                <p className="font-bold text-foreground truncate">{tooltip.node.title}</p>
                <p className="text-muted-foreground/60 text-[9px]">[{tooltip.node.type}]</p>
                <p className="text-muted-foreground/60 text-[9px]">Confidence: {Math.round(tooltip.node.confidence * 100)}%</p>
                {tooltip.node.tags.length > 0 && (
                  <p className="text-muted-foreground/50 text-[9px] truncate">#{tooltip.node.tags.slice(0, 3).join(' #')}</p>
                )}
                <p className="text-primary/60 text-[9px] mt-1">Double-click to open →</p>
              </div>
            </foreignObject>
          )}
        </svg>
      </div>
    </div>
  )
}
