import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { calculateETA } from '@kt82/shared'

const router = Router()

router.get('/races/:id/status', async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({ where: { raceId: req.params.id } })
    const now = new Date()

    const statuses = await Promise.all(
      teams.map(async (team) => {
        const activeResult = await prisma.legResult.findFirst({
          where: { teamId: team.id, finishedAt: null },
          include: { leg: { include: { handoff: true } } },
        })

        if (!activeResult) {
          return { team: { id: team.id, name: team.name }, status: 'not-started', currentRunner: null, eta: null }
        }

        const assignment = await prisma.legAssignment.findFirst({
          where: { teamId: team.id, legId: activeResult.legId },
          include: { teamMember: true },
        })

        const eta = assignment
          ? calculateETA(
              { id: assignment.id, teamId: team.id, legId: assignment.legId, teamMemberId: assignment.teamMemberId, targetPaceSecPerMile: assignment.targetPaceSecPerMile },
              { id: activeResult.id, teamId: team.id, legId: activeResult.legId, startedAt: activeResult.startedAt.toISOString(), finishedAt: null },
              { id: activeResult.leg.id, raceId: activeResult.leg.raceId, legNumber: activeResult.leg.legNumber, name: activeResult.leg.name, distanceMiles: activeResult.leg.distanceMiles },
              now
            )
          : null

        return {
          team: { id: team.id, name: team.name },
          status: 'in-progress',
          currentLeg: { id: activeResult.leg.id, legNumber: activeResult.leg.legNumber, name: activeResult.leg.name, distanceMiles: activeResult.leg.distanceMiles },
          currentRunner: assignment?.teamMember ?? null,
          nextHandoff: activeResult.leg.handoff,
          eta,
        }
      })
    )

    res.json(statuses)
  } catch (err) { next(err) }
})

router.get('/teams/:id/timeline', async (req, res, next) => {
  try {
    const teamId = req.params.id
    const assignments = await prisma.legAssignment.findMany({
      where: { teamId },
      orderBy: { leg: { legNumber: 'asc' } },
      include: { leg: { include: { handoff: true } }, teamMember: true },
    })

    const results = await prisma.legResult.findMany({ where: { teamId } })
    const resultByLeg = Object.fromEntries(results.map((r) => [r.legId, r]))
    const now = new Date()

    const timeline = assignments.map((assignment) => {
      const result = resultByLeg[assignment.legId]

      if (!result) {
        return { leg: assignment.leg, assignment, runner: assignment.teamMember, status: 'not-started', result: null, eta: null }
      }

      if (result.finishedAt) {
        return {
          leg: assignment.leg, assignment, runner: assignment.teamMember, status: 'completed',
          result: { ...result, startedAt: result.startedAt.toISOString(), finishedAt: result.finishedAt.toISOString() },
          eta: null,
        }
      }

      const eta = calculateETA(
        { id: assignment.id, teamId, legId: assignment.legId, teamMemberId: assignment.teamMemberId, targetPaceSecPerMile: assignment.targetPaceSecPerMile },
        { id: result.id, teamId, legId: result.legId, startedAt: result.startedAt.toISOString(), finishedAt: null },
        { id: assignment.leg.id, raceId: assignment.leg.raceId, legNumber: assignment.leg.legNumber, name: assignment.leg.name, distanceMiles: assignment.leg.distanceMiles },
        now
      )

      return {
        leg: assignment.leg, assignment, runner: assignment.teamMember, status: 'in-progress',
        result: { ...result, startedAt: result.startedAt.toISOString(), finishedAt: null },
        eta,
      }
    })

    res.json(timeline)
  } catch (err) { next(err) }
})

export default router
