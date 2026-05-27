import { Router } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { teamAuth } from '../middleware/teamAuth'
import { handlePrismaError } from '../lib/prismaErrors'

const router = Router()

router.post('/teams/:id/members', teamAuth, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' })
    const member = await prisma.teamMember.create({
      data: { teamId: req.params.id, name: name.trim() },
    })
    res.status(201).json(member)
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

async function verifyTeamPin(teamId: string, pin: string): Promise<boolean> {
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) return false
  return bcrypt.compare(pin, team.captainPinHash)
}

router.put('/members/:id', async (req, res, next) => {
  try {
    const { name, teamId } = req.body
    if (!name || !name.trim() || !teamId) return res.status(400).json({ error: 'name and teamId are required' })
    const pin = req.headers['x-team-pin']
    if (!pin || typeof pin !== 'string') return res.status(401).json({ error: 'X-Team-Pin required' })
    if (!await verifyTeamPin(teamId, pin)) return res.status(401).json({ error: 'Invalid PIN' })
    const member = await prisma.teamMember.update({ where: { id: req.params.id, teamId }, data: { name: name.trim() } })
    res.json(member)
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

router.delete('/members/:id', async (req, res, next) => {
  try {
    const { teamId } = req.body
    if (!teamId) return res.status(400).json({ error: 'teamId is required' })
    const pin = req.headers['x-team-pin']
    if (!pin || typeof pin !== 'string') return res.status(401).json({ error: 'X-Team-Pin required' })
    if (!await verifyTeamPin(teamId, pin)) return res.status(401).json({ error: 'Invalid PIN' })
    await prisma.$transaction(async (tx) => {
      await tx.legAssignment.deleteMany({ where: { teamMemberId: req.params.id } })
      await tx.teamMember.delete({ where: { id: req.params.id, teamId } })
    })
    res.status(204).send()
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

export default router
