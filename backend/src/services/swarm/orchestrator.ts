import { prisma } from '../../lib/db'
import { redis } from '../../lib/redis'
import { logger } from '../../lib/logger'
import { aiRouter } from '../ai-router'
import { vectorMemory } from '../vector-memory'
import { eventBus } from '../../lib/event-bus'
import type { Swarm, SwarmMember, SwarmSession, SwarmMessage } from '@prisma/client'

interface SwarmContext {
  sessionId: string
  swarmId: string
  projectId: string
  sharedMemory: Map<string, any>
  artifacts: any[]
}

export class SwarmOrchestrator {
  private activeSessions: Map<string, SwarmContext> = new Map()

  async createSwarm(data: {
    name: string
    goal: string
    strategy: string
    projectId: string
    members: { agentId: string; role: string; order?: number; canDelegate?: boolean }[]
  }): Promise<Swarm> {
    const swarm = await prisma.swarm.create({
      data: {
        name: data.name,
        description: data.goal,
        goal: data.goal,
        strategy: data.strategy as any,
        projectId: data.projectId,
        members: {
          create: data.members.map((m, i) => ({
            agentId: m.agentId,
            role: m.role as any,
            order: m.order ?? i,
            canDelegate: m.canDelegate ?? false,
          }))
        }
      },
      include: { members: { include: { agent: true } } }
    })

    logger.info('Swarm created', { swarmId: swarm.id, members: swarm.members.length })
    return swarm
  }

  async execute(swarmId: string, input: Record<string, any>): Promise<SwarmSession> {
    const swarm = await prisma.swarm.findUnique({
      where: { id: swarmId },
      include: { members: { include: { agent: true }, orderBy: { order: 'asc' } } }
    })

    if (!swarm) throw new Error('Swarm not found')
    if (swarm.members.length === 0) throw new Error('Swarm has no members')

    // Create session
    const session = await prisma.swarmSession.create({
      data: {
        swarmId,
        input,
        status: 'running',
      }
    })

    const context: SwarmContext = {
      sessionId: session.id,
      swarmId,
      projectId: swarm.projectId,
      sharedMemory: new Map(),
      artifacts: []
    }

    this.activeSessions.set(session.id, context)

    // Route to strategy handler
    try {
      switch (swarm.strategy) {
        case 'sequential':
          await this.runSequential(swarm, session, context, input)
          break
        case 'parallel':
          await this.runParallel(swarm, session, context, input)
          break
        case 'debate':
          await this.runDebate(swarm, session, context, input)
          break
        case 'hierarchical':
          await this.runHierarchical(swarm, session, context, input)
          break
        default:
          await this.runSequential(swarm, session, context, input)
      }

      // Synthesize final output
      await this.synthesize(session, context)

      const finalSession = await prisma.swarmSession.update({
        where: { id: session.id },
        data: { status: 'completed', completedAt: new Date() }
      })

      await eventBus.publish(
        'swarm.completed',
        { sessionId: session.id, swarmId, projectId: swarm.projectId }
      )

      return finalSession

    } catch (error) {
      logger.error('Swarm execution failed', { error, sessionId: session.id })
      await prisma.swarmSession.update({
        where: { id: session.id },
        data: { status: 'failed' }
      })
      throw error
    } finally {
      this.activeSessions.delete(session.id)
    }
  }

  // ─── Sequential Strategy ───
  private async runSequential(swarm: any, session: SwarmSession, context: SwarmContext, input: any) {
    let currentInput = input

    for (const member of swarm.members) {
      const result = await this.executeAgent(member, session, context, currentInput)
      currentInput = { ...currentInput, previousResult: result }

      // Store in shared memory
      await this.remember(session.swarmId, `${member.role}_output`, result, member.agentId)
    }
  }

  // ─── Parallel Strategy ───
  private async runParallel(swarm: any, session: SwarmSession, context: SwarmContext, input: any) {
    const promises = swarm.members.map((member: SwarmMember & { agent: any }) =>
      this.executeAgent(member, session, context, input)
    )

    const results = await Promise.all(promises)

    // Store all results
    for (let i = 0; i < results.length; i++) {
      await this.remember(session.swarmId, `${swarm.members[i].role}_output`, results[i], swarm.members[i].agentId)
    }
  }

  // ─── Debate Strategy ───
  private async runDebate(swarm: any, session: SwarmSession, context: SwarmContext, input: any) {
    const topic = input.topic || input.goal
    const rounds = input.rounds || 3
    const members = swarm.members.filter((m: SwarmMember) => m.role !== 'coordinator')
    const coordinator = swarm.members.find((m: SwarmMember) => m.role === 'coordinator')

    for (let round = 1; round <= rounds; round++) {
      await this.broadcast(session, 'coordinator', `Round ${round} of debate on: ${topic}`)

      // Each agent presents their view
      for (const member of members) {
        const memory = await this.recall(session.swarmId)
        const prompt = `You are participating in a structured debate (Round ${round}/${rounds}).
        
Previous context: ${JSON.stringify(memory)}
Topic: ${topic}
Your role: ${member.role}
Present your argument, evidence, and respond to previous critiques if any.`

        const result = await this.executeAgent(member, session, context, { prompt, round })
        await this.message(session, member.agentId, null, 'observation', result.content)
      }

      // Critique round
      const critics = members.filter((m: SwarmMember) => m.role === 'critic')
      for (const critic of critics) {
        const allObservations = await prisma.swarmMessage.findMany({
          where: { sessionId: session.id, type: 'observation' },
          orderBy: { createdAt: 'desc' },
          take: members.length
        })

        const critique = await this.executeAgent(critic, session, context, {
          observations: allObservations.map(o => o.content),
          round
        })

        await this.broadcast(session, critic.agentId, `Critique: ${critique.content}`, 'critique')
      }
    }

    // Final consensus
    if (coordinator) {
      const allMessages = await prisma.swarmMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'asc' }
      })

      const consensus = await this.executeAgent(coordinator, session, context, {
        task: 'synthesize_consensus',
        debate: allMessages.map(m => `${m.fromAgentId}: ${m.content}`).join('\n')
      })

      await this.remember(session.swarmId, 'consensus', consensus, coordinator.agentId)
    }
  }

  // ─── Hierarchical Strategy ───
  private async runHierarchical(swarm: any, session: SwarmSession, context: SwarmContext, input: any) {
    const coordinator = swarm.members.find((m: SwarmMember) => m.role === 'coordinator')
    const workers = swarm.members.filter((m: SwarmMember) => m.role !== 'coordinator')

    if (!coordinator) throw new Error('Hierarchical swarm requires a coordinator')

    // Coordinator plans the work
    const plan = await this.executeAgent(coordinator, session, context, {
      task: 'create_plan',
      goal: swarm.goal,
      availableWorkers: workers.map((w: SwarmMember) => ({ role: w.role, agentId: w.agentId })),
      input
    })

    await this.remember(session.swarmId, 'plan', plan, coordinator.agentId)
    await this.broadcast(session, coordinator.agentId, `Plan: ${JSON.stringify(plan)}`, 'task')

    // Execute subtasks in parallel where possible
    const subtasks = plan.subtasks || []
    const taskPromises = subtasks.map(async (subtask: any) => {
      const worker = workers.find((w: SwarmMember) => w.role === subtask.assignTo || w.agentId === subtask.agentId)
      if (!worker) return null

      const result = await this.executeAgent(worker, session, context, {
        task: subtask.description,
        context: subtask.context,
        requirements: subtask.requirements
      })

      // Worker reports back
      await this.message(session, worker.agentId, coordinator.agentId, 'observation', 
        `Completed: ${subtask.description}\nResult: ${JSON.stringify(result)}`)

      return { subtask, result }
    })

    const results = await Promise.all(taskPromises)

    // Coordinator reviews and synthesizes
    const final = await this.executeAgent(coordinator, session, context, {
      task: 'synthesize_results',
      results: results.filter(Boolean),
      originalGoal: swarm.goal
    })

    await this.remember(session.swarmId, 'final_output', final, coordinator.agentId)
  }

  // ─── Core Agent Execution ───
  private async executeAgent(
    member: SwarmMember & { agent: any },
    session: SwarmSession,
    context: SwarmContext,
    input: any
  ): Promise<any> {
    // Update agent status
    await prisma.agent.update({
      where: { id: member.agentId },
      data: { status: 'running' }
    })

    try {
      // Build context-aware prompt
      const swarmMemory = await this.recall(session.swarmId)
      const agentMemory = await vectorMemory.getContextString(member.agentId, input.task || input.topic || '')

      const systemPrompt = `You are an AI marketing agent operating as part of a swarm.

Your role: ${member.role}
Swarm goal: ${session.input ? (session.input as any).goal : 'marketing optimization'}
You can delegate: ${member.canDelegate ? 'yes' : 'no'}

SHARED SWARM MEMORY:
${JSON.stringify(swarmMemory, null, 2)}

YOUR CONTEXT:
${agentMemory}

Instructions:
- Be specific and actionable
- If you need clarification, ask a question
- If you can delegate part of your task, specify who should handle it
- Always structure your response as JSON with fields: content, confidence (0-1), artifacts (array), nextActions (array)`

      const userPrompt = `Task: ${JSON.stringify(input)}

Execute your role. Return structured JSON.`

      const response = await aiRouter.generate({
        task: member.agent.type,
        complexity: 'high',
        systemPrompt,
        userPrompt,
        userId: session.swarmId, // Using swarmId as proxy
        userPlan: 'enterprise', // Swarms are enterprise feature
      }) as any

      let parsed
      try {
        parsed = JSON.parse(response.content.replace(/```json\n?|\n?```/g, '').trim())
      } catch {
        parsed = { content: response.content, confidence: 0.8, artifacts: [], nextActions: [] }
      }

      // Store artifact if produced
      if (parsed.artifacts?.length > 0) {
        for (const artifact of parsed.artifacts) {
          await prisma.swarmArtifact.create({
            data: {
              sessionId: session.id,
              agentId: member.agentId,
              type: artifact.type || 'generic',
              name: artifact.name || 'Untitled',
              content: artifact.content || artifact,
            }
          })
        }
      }

      // Auto-delegate if suggested and allowed
      if (parsed.nextActions?.length > 0 && member.canDelegate) {
        for (const action of parsed.nextActions) {
          if (action.type === 'delegate' && action.targetAgentId) {
            await this.message(session, member.agentId, action.targetAgentId, 'delegate', 
              `Delegated task: ${action.description}`)
          }
        }
      }

      // Log completion
      await prisma.agent.update({
        where: { id: member.agentId },
        data: { status: 'completed' }
      })

      return parsed

    } catch (error) {
      await prisma.agent.update({
        where: { id: member.agentId },
        data: { status: 'error' }
      })
      throw error
    }
  }

  // ─── Memory & Messaging ───
  private async remember(swarmId: string, key: string, value: any, sourceAgentId?: string) {
    await prisma.swarmMemory.upsert({
      where: { swarmId_key: { swarmId, key } },
      update: { value, sourceAgentId, confidence: value.confidence || 1.0 },
      create: { swarmId, key, value, sourceAgentId, confidence: value.confidence || 1.0 }
    })
  }

  private async recall(swarmId: string): Promise<Record<string, any>> {
    const memories = await prisma.swarmMemory.findMany({ where: { swarmId } })
    return memories.reduce((acc, m) => {
      acc[m.key] = m.value
      return acc
    }, {} as Record<string, any>)
  }

  private async message(session: SwarmSession, from: string, to: string | null, type: any, content: string, payload?: any) {
    const msg = await prisma.swarmMessage.create({
      data: {
        sessionId: session.id,
        fromAgentId: from,
        toAgentId: to,
        type,
        content,
        payload: payload || {}
      }
    })
    
    // Publish to real-time stream
    await this.publishToSession(session.id, msg)
  }

  private async broadcast(session: SwarmSession, from: string, content: string, type: any = 'observation') {
    await this.message(session, from, null, type, content)
  }

  private async synthesize(session: SwarmSession, context: SwarmContext) {
    const memories = await this.recall(session.swarmId)
    const artifacts = await prisma.swarmArtifact.findMany({
      where: { sessionId: session.id }
    })

    const synthesis = {
      summary: `Swarm session ${session.id} completed with ${Object.keys(memories).length} memory items and ${artifacts.length} artifacts.`,
      memories,
      artifacts: artifacts.map(a => ({ type: a.type, name: a.name, content: a.content }))
    }

    await prisma.swarmSession.update({
      where: { id: session.id },
      data: { output: synthesis }
    })
  }

  // ─── Real-time Pub/Sub for Live Updates ───
  async subscribeToSession(sessionId: string, callback: (msg: SwarmMessage) => void): Promise<void> {
    const subscriber = redis.duplicate()
    await subscriber.subscribe(`swarm:${sessionId}:messages`)

    subscriber.on('message', (channel, message) => {
      callback(JSON.parse(message))
    })
  }

  async publishToSession(sessionId: string, message: SwarmMessage): Promise<void> {
    await redis.publish(`swarm:${sessionId}:messages`, JSON.stringify(message))
  }
}

export const swarmOrchestrator = new SwarmOrchestrator()
