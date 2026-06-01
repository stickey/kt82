import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { calculateETA } from '@kt82/shared'

const router = Router()

router.get('/races/active', async (req, res, next) => {
  try {
    const race = await prisma.race.findFirst({ orderBy: { date: 'desc' } })
    if (!race) return res.status(404).json({ error: 'No active race' })
    res.json(race)
  } catch (err) { next(err) }
})

router.get('/races/:id/status', async (req, res, next) => {
  try {
    const race = await prisma.race.findUnique({ where: { id: req.params.id } })
    if (!race) return res.status(404).json({ error: 'Race not found' })

    const teams = await prisma.team.findMany({ where: { raceId: req.params.id } })
    if (teams.length === 0) return res.json([])

    const teamIds = teams.map((t) => t.id)
    const now = new Date()

    const activeResults = await prisma.legResult.findMany({
      where: { teamId: { in: teamIds }, finishedAt: null },
      include: { leg: { include: { handoff: true } } },
    })
    const activeResultByTeam = Object.fromEntries(activeResults.map((r) => [r.teamId, r]))

    const activeLegIds = activeResults.map((r) => r.legId)
    type AssignmentWithMember = Prisma.LegAssignmentGetPayload<{ include: { teamMember: true } }>
    const assignments: AssignmentWithMember[] = activeLegIds.length > 0
      ? await prisma.legAssignment.findMany({
          where: { teamId: { in: teamIds }, legId: { in: activeLegIds } },
          include: { teamMember: true },
        })
      : []
    const assignmentByTeamLeg = Object.fromEntries(
      assignments.map((a) => [`${a.teamId}:${a.legId}`, a])
    )

    const statuses = teams.map((team) => {
      const activeResult = activeResultByTeam[team.id]

      if (!activeResult) {
        return { team: { id: team.id, name: team.name }, status: 'not-started', currentRunner: null, eta: null }
      }

      const assignment = assignmentByTeamLeg[`${team.id}:${activeResult.legId}`]

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

    res.json(statuses)
  } catch (err) { next(err) }
})

router.get('/teams/:id/timeline', async (req, res, next) => {
  try {
    const teamId = req.params.id
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) return res.status(404).json({ error: 'Team not found' })

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
