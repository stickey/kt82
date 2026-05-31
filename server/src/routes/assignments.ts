import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { teamAuth } from '../middleware/teamAuth'
import { handlePrismaError } from '../lib/prismaErrors'

const router = Router()

router.post('/teams/:id/assignments', teamAuth, async (req, res, next) => {
  try {
    const { legId, teamMemberId, targetPaceSecPerMile } = req.body
    if (!legId || !teamMemberId || targetPaceSecPerMile == null) {
      return res.status(400).json({ error: 'legId, teamMemberId, and targetPaceSecPerMile are required' })
    }
    const memberBelongsToTeam = await prisma.teamMember.findFirst({
      where: { id: teamMemberId, teamId: req.params.id },
    })
    if (!memberBelongsToTeam) return res.status(400).json({ error: 'Member does not belong to this team' })
    const assignment = await prisma.legAssignment.create({
      data: { teamId: req.params.id, legId, teamMemberId, targetPaceSecPerMile },
    })
    res.status(201).json(assignment)
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

async function verifyTeamPin(teamId: string, pin: string): Promise<boolean> {
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) return false
  return bcrypt.compare(pin, team.captainPinHash)
}

router.put('/assignments/:id', async (req, res, next) => {
  try {
    const { teamId, targetPaceSecPerMile, teamMemberId } = req.body
    if (!teamId) return res.status(400).json({ error: 'teamId is required' })
    const pin = req.headers['x-team-pin']
    if (!pin || typeof pin !== 'string') return res.status(401).json({ error: 'X-Team-Pin required' })
    if (!await verifyTeamPin(teamId, pin)) return res.status(401).json({ error: 'Invalid PIN' })
    if (teamMemberId != null) {
      const memberBelongsToTeam = await prisma.teamMember.findFirst({
        where: { id: teamMemberId, teamId },
      })
      if (!memberBelongsToTeam) return res.status(400).json({ error: 'Member does not belong to this team' })
    }
    const assignment = await prisma.legAssignment.update({
      where: { id: req.params.id, teamId },
      data: {
        ...(targetPaceSecPerMile != null && { targetPaceSecPerMile }),
        ...(teamMemberId != null && { teamMemberId }),
      },
    })
    res.json(assignment)
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

router.delete('/assignments/:id', async (req, res, next) => {
  try {
    const { teamId } = req.body
    if (!teamId) return res.status(400).json({ error: 'teamId is required' })
    const pin = req.headers['x-team-pin']
    if (!pin || typeof pin !== 'string') return res.status(401).json({ error: 'X-Team-Pin required' })
    if (!await verifyTeamPin(teamId, pin)) return res.status(401).json({ error: 'Invalid PIN' })
    await prisma.legAssignment.delete({ where: { id: req.params.id, teamId } })
    res.status(204).send()
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

export default router
