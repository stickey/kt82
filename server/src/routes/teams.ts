import { Router } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { adminAuth } from '../middleware/adminAuth'
import { teamAuth } from '../middleware/teamAuth'
import { handlePrismaError } from '../lib/prismaErrors'

const router = Router()

// Manager: list teams
router.get('/races/:id/teams', adminAuth, async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      where: { raceId: req.params.id },
      select: { id: true, raceId: true, name: true, locked: true },
    })
    res.json(teams)
  } catch (err) { next(err) }
})

// Manager: create team
router.post('/races/:id/teams', adminAuth, async (req, res, next) => {
  try {
    const { name, pin } = req.body
    if (!name || !pin) return res.status(400).json({ error: 'name and pin are required' })
    const captainPinHash = await bcrypt.hash(String(pin), 10)
    const team = await prisma.team.create({
      data: { raceId: req.params.id, name, captainPinHash },
    })
    res.status(201).json({ id: team.id, raceId: team.raceId, name: team.name, locked: team.locked, pin })
  } catch (err) { next(err) }
})

// Manager: update team name
router.put('/teams/:id', adminAuth, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const team = await prisma.team.update({ where: { id: req.params.id }, data: { name } })
    res.json({ id: team.id, raceId: team.raceId, name: team.name, locked: team.locked })
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

// Manager: reset team (unlock + clear assignments)
router.post('/teams/:id/reset', adminAuth, async (req, res, next) => {
  try {
    await prisma.legAssignment.deleteMany({ where: { teamId: req.params.id } })
    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: { locked: false },
    })
    res.json({ id: team.id, raceId: team.raceId, name: team.name, locked: team.locked })
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

// Captain: get team detail (members + assignments + results)
router.get('/teams/:id', teamAuth, async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        members: true,
        assignments: { include: { leg: { include: { handoff: true } }, teamMember: true } },
        results: true,
      },
    })
    if (!team) return res.status(404).json({ error: 'Team not found' })
    res.json({
      id: team.id, raceId: team.raceId, name: team.name, locked: team.locked,
      members: team.members,
      assignments: team.assignments,
      results: team.results.map(r => ({
        ...r,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
      })),
    })
  } catch (err) { next(err) }
})

// Captain: lock assignments
router.post('/teams/:id/lock', teamAuth, async (req, res, next) => {
  try {
    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: { locked: true },
    })
    res.json({ id: team.id, raceId: team.raceId, name: team.name, locked: team.locked })
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

export default router
