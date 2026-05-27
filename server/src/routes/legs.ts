import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { adminAuth } from '../middleware/adminAuth'
import { handlePrismaError } from '../lib/prismaErrors'

const router = Router()

router.get('/races/:id/legs', adminAuth, async (req, res, next) => {
  try {
    const race = await prisma.race.findUnique({ where: { id: req.params.id } })
    if (!race) return res.status(404).json({ error: 'Race not found' })
    const legs = await prisma.leg.findMany({
      where: { raceId: req.params.id },
      orderBy: { legNumber: 'asc' },
      include: { handoff: true },
    })
    res.json(legs)
  } catch (err) { next(err) }
})

router.post('/races/:id/legs', adminAuth, async (req, res, next) => {
  try {
    const { legNumber, name, distanceMiles } = req.body
    if (legNumber == null || !name || distanceMiles == null) {
      return res.status(400).json({ error: 'legNumber, name, and distanceMiles are required' })
    }
    const leg = await prisma.leg.create({
      data: { raceId: req.params.id, legNumber, name, distanceMiles },
    })
    res.status(201).json(leg)
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

router.put('/legs/:id', adminAuth, async (req, res, next) => {
  try {
    const { legNumber, name, distanceMiles } = req.body
    const leg = await prisma.leg.update({
      where: { id: req.params.id },
      data: {
        ...(legNumber != null && { legNumber }),
        ...(name !== undefined && { name }),
        ...(distanceMiles != null && { distanceMiles }),
      },
    })
    res.json(leg)
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

router.delete('/legs/:id', adminAuth, async (req, res, next) => {
  try {
    await prisma.leg.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

export default router
