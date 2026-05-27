import { Router } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { teamAuth } from '../middleware/teamAuth'
import { calculateETA } from '@kt82/shared'
import { handlePrismaError } from '../lib/prismaErrors'

const router = Router()

function serializeResult(r: { id: string; teamId: string; legId: string; startedAt: Date; finishedAt: Date | null }) {
  return { ...r, startedAt: r.startedAt.toISOString(), finishedAt: r.finishedAt?.toISOString() ?? null }
}

router.get('/teams/:id/current', teamAuth, async (req, res, next) => {
  try {
    const teamId = req.params.id
    const activeResult = await prisma.legResult.findFirst({
      where: { teamId, finishedAt: null },
      include: { leg: { include: { handoff: true } } },
    })

    if (!activeResult) {
      const firstAssignment = await prisma.legAssignment.findFirst({
        where: { teamId },
        orderBy: { leg: { legNumber: 'asc' } },
        include: { leg: true, teamMember: true },
      })
      return res.json({
        status: 'not-started',
        nextLeg: firstAssignment?.leg ?? null,
        nextRunner: firstAssignment?.teamMember ?? null,
      })
    }

    const assignment = await prisma.legAssignment.findFirst({
      where: { teamId, legId: activeResult.legId },
      include: { teamMember: true },
    })

    const eta = assignment
      ? calculateETA(
          {
            id: assignment.id,
            teamId,
            legId: assignment.legId,
            teamMemberId: assignment.teamMemberId,
            targetPaceSecPerMile: assignment.targetPaceSecPerMile,
          },
          {
            id: activeResult.id,
            teamId,
            legId: activeResult.legId,
            startedAt: activeResult.startedAt.toISOString(),
            finishedAt: null,
          },
          {
            id: activeResult.leg.id,
            raceId: activeResult.leg.raceId,
            legNumber: activeResult.leg.legNumber,
            name: activeResult.leg.name,
            distanceMiles: activeResult.leg.distanceMiles,
          },
          new Date()
        )
      : null

    res.json({
      status: 'in-progress',
      result: serializeResult(activeResult),
      currentLeg: activeResult.leg,
      nextHandoff: activeResult.leg.handoff,
      currentRunner: assignment?.teamMember ?? null,
      assignment,
      eta,
    })
  } catch (err) { next(err) }
})

router.post('/teams/:id/results', teamAuth, async (req, res, next) => {
  try {
    const { legId, startedAt } = req.body
    if (!legId || !startedAt) return res.status(400).json({ error: 'legId and startedAt are required' })
    const parsedStart = new Date(startedAt)
    if (isNaN(parsedStart.getTime())) return res.status(400).json({ error: 'startedAt must be a valid ISO timestamp' })
    const result = await prisma.legResult.create({
      data: { teamId: req.params.id, legId, startedAt: parsedStart },
    })
    res.status(201).json(serializeResult(result))
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

router.patch('/results/:id', async (req, res, next) => {
  try {
    const { finishedAt, action } = req.body
    if (!finishedAt || !action) return res.status(400).json({ error: 'finishedAt and action are required' })
    const parsedFinish = new Date(finishedAt)
    if (isNaN(parsedFinish.getTime())) return res.status(400).json({ error: 'finishedAt must be a valid ISO timestamp' })

    const existing = await prisma.legResult.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Result not found' })

    const pin = req.headers['x-team-pin']
    if (!pin || typeof pin !== 'string') return res.status(401).json({ error: 'X-Team-Pin required' })
    const team = await prisma.team.findUnique({ where: { id: existing.teamId } })
    if (!team) return res.status(404).json({ error: 'Team not found' })
    const valid = await bcrypt.compare(pin, team.captainPinHash)
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' })

    const updated = await prisma.legResult.update({
      where: { id: req.params.id },
      data: { finishedAt: parsedFinish },
    })

    if (action === 'stop') {
      return res.json({ current: serializeResult(updated), next: null })
    }

    // action === 'lap': find next assignment and create next result
    const currentLeg = await prisma.leg.findUnique({ where: { id: existing.legId } })
    const nextAssignment = await prisma.legAssignment.findFirst({
      where: { teamId: existing.teamId, leg: { legNumber: { gt: currentLeg!.legNumber } } },
      orderBy: { leg: { legNumber: 'asc' } },
    })

    if (!nextAssignment) {
      return res.json({ current: serializeResult(updated), next: null })
    }

    const nextResult = await prisma.legResult.create({
      data: { teamId: existing.teamId, legId: nextAssignment.legId, startedAt: parsedFinish },
    })

    res.json({ current: serializeResult(updated), next: serializeResult(nextResult) })
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

export default router
