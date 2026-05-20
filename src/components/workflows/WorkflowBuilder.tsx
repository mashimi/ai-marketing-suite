import { useCallback, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { motion } from 'framer-motion'
import { Bot, GitBranch, Clock, Globe, Play, Save, Trash2, Settings2 } from 'lucide-react'
import { useStore } from '@/store'
import toast from 'react-hot-toast'

const nodeTypes = {
  agent: AgentNode,
  condition: ConditionNode,
  delay: DelayNode,
  cms: CMSNode,
  trigger: TriggerNode,
}

function AgentNode({ data }: any) {
  return (
    <div className="bg-card border-2 border-primary/30 rounded-xl p-4 w-64 shadow-lg hover:border-primary/60 transition-all group">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm truncate">{data.label}</span>
        </div>
        <Settings2 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{data.agentType?.replace('_', ' ')}</p>
      <div className="mt-2 h-1 w-full bg-primary/10 rounded-full overflow-hidden">
        <div className="h-full bg-primary w-2/3" />
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary" />
    </div>
  )
}

function ConditionNode({ data }: any) {
  return (
    <div className="bg-card border-2 border-yellow-500/30 rounded-xl p-4 w-56 shadow-lg hover:border-yellow-500/60 transition-all">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-yellow-500" />
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-5 h-5 text-yellow-500" />
        <span className="font-semibold text-sm">{data.label}</span>
      </div>
      <div className="bg-yellow-500/5 rounded-md p-2 border border-yellow-500/10">
        <p className="text-[10px] font-mono text-yellow-600 dark:text-yellow-400">{data.condition}</p>
      </div>
      <div className="mt-4 flex justify-between px-2">
        <span className="text-[10px] font-bold text-green-500">TRUE</span>
        <span className="text-[10px] font-bold text-red-500">FALSE</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" className="w-3 h-3 bg-green-500" style={{ left: '25%' }} />
      <Handle type="source" position={Position.Bottom} id="false" className="w-3 h-3 bg-red-500" style={{ left: '75%' }} />
    </div>
  )
}

function DelayNode({ data }: any) {
  return (
    <div className="bg-card border-2 border-blue-500/30 rounded-xl p-4 w-48 shadow-lg hover:border-blue-500/60 transition-all">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-5 h-5 text-blue-500" />
        <span className="font-semibold text-sm">Wait Delay</span>
      </div>
      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/5 py-1 px-2 rounded">{data.duration}</p>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    </div>
  )
}

function CMSNode({ data }: any) {
  return (
    <div className="bg-card border-2 border-green-500/30 rounded-xl p-4 w-56 shadow-lg hover:border-green-500/60 transition-all">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-green-500" />
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-5 h-5 text-green-500" />
        <span className="font-semibold text-sm">Publish Content</span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">Target: {data.platform}</p>
      <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Live Sync
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500" />
    </div>
  )
}

function TriggerNode({ data }: any) {
  return (
    <div className="bg-card border-2 border-purple-500/30 rounded-xl p-4 w-52 shadow-lg hover:border-purple-500/60 transition-all">
      <div className="flex items-center gap-2 mb-2">
        <Play className="w-5 h-5 text-purple-500" />
        <span className="font-semibold text-sm">{data.label}</span>
      </div>
      <div className="bg-purple-500/5 p-2 rounded-lg border border-purple-500/10">
        <p className="text-[10px] text-purple-600 dark:text-purple-300 font-mono">{data.schedule || 'Manual Execution'}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500" />
    </div>
  )
}

export default function WorkflowBuilder({ workflow, onSave }: { workflow?: any; onSave: (data: any) => void }) {
  const { agents } = useStore()
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow?.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.edges || [])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: true, 
      style: { stroke: '#6366f1', strokeWidth: 2 },
      type: 'smoothstep'
    }, eds)),
    [setEdges]
  )

  const addNode = (type: string, data: any) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 400, y: nodes.length * 100 + 50 },
      data,
    }
    setNodes((nds) => [...nds, newNode])
  }

  const handleSave = () => {
    const graphData = {
      nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
      edges: edges.map(e => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
    }
    onSave(graphData)
    toast.success('Workflow configuration saved')
  }

  return (
    <div className="h-[700px] flex gap-6 bg-accent/5 p-4 rounded-2xl border border-border/50">
      {/* Sidebar */}
      <div className="w-72 bg-card border border-border/60 rounded-2xl p-6 space-y-4 shadow-xl overflow-y-auto">
        <div className="mb-6">
          <h3 className="font-bold text-base mb-1">Workflow Designer</h3>
          <p className="text-xs text-muted-foreground">Drag components or click to add</p>
        </div>

        <div className="space-y-6">
          <section>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Entry Points</h4>
            <button
              onClick={() => addNode('trigger', { label: 'Scheduled Trigger', schedule: '0 9 * * 1' })}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-purple-500/20 hover:bg-purple-500/10 transition-all text-left group"
            >
              <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                <Play className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <span className="text-sm font-semibold block">Schedule</span>
                <span className="text-[10px] text-muted-foreground">Run on specific time</span>
              </div>
            </button>
          </section>

          <section>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">AI Agents</h4>
            <div className="space-y-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => addNode('agent', { label: agent.name, agentId: agent.id, agentType: agent.type })}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary/20 hover:bg-primary/10 transition-all text-left group"
                >
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold block truncate w-40">{agent.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{agent.type.replace('_', ' ')}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Logic & Flow</h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => addNode('condition', { label: 'Decision Gate', condition: 'seo_score > 80' })}
                className="flex items-center gap-3 p-3 rounded-xl border border-yellow-500/20 hover:bg-yellow-500/10 transition-all text-left group"
              >
                <div className="p-2 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
                  <GitBranch className="w-4 h-4 text-yellow-500" />
                </div>
                <span className="text-sm font-semibold">Condition</span>
              </button>
              <button
                onClick={() => addNode('delay', { duration: '24 hours' })}
                className="flex items-center gap-3 p-3 rounded-xl border border-blue-500/20 hover:bg-blue-500/10 transition-all text-left group"
              >
                <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <Clock className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-sm font-semibold">Delay</span>
              </button>
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Output</h4>
            <button
              onClick={() => addNode('cms', { platform: 'WordPress' })}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-green-500/20 hover:bg-green-500/10 transition-all text-left group"
            >
              <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                <Globe className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm font-semibold">CMS Publish</span>
            </button>
          </section>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-background rounded-3xl border border-border/50 overflow-hidden relative shadow-inner">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNode(node)}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
        >
          <Background color="currentColor" className="text-muted-foreground/10" gap={20} />
          <Controls className="bg-card border-border shadow-lg" />
          <MiniMap 
            className="bg-card border border-border shadow-2xl rounded-lg" 
            maskColor="rgb(var(--background) / 0.6)"
            nodeColor={(n) => {
              if (n.type === 'agent') return '#6366f1'
              if (n.type === 'trigger') return '#a855f7'
              if (n.type === 'condition') return '#eab308'
              return '#334155'
            }}
          />
        </ReactFlow>

        {/* Floating Actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setNodes([]); setEdges([]); }}
            className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors shadow-lg backdrop-blur-sm"
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
          >
            <Save className="w-5 h-5" />
            Deploy Workflow
          </motion.button>
        </div>

        {/* Selected Node Details Overlay */}
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 left-6 right-6 bg-card/80 backdrop-blur-md border border-border p-4 rounded-2xl shadow-2xl z-50 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Settings2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Configuring: {selectedNode.data.label}</h4>
                <p className="text-xs text-muted-foreground">ID: {selectedNode.id}</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedNode(null)}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Close Panel
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
