import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { adminAuth } from '../middleware/adminAuth'

const router = Router()

router.get('/races/:id/legs', adminAuth, async (req, res, next) => {
  try {
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
    if (!legNumber || !name || !distanceMiles) {
      return res.status(400).json({ error: 'legNumber, name, and distanceMiles are required' })
    }
    const leg = await prisma.leg.create({
      data: { raceId: req.params.id, legNumber, name, distanceMiles },
    })
    res.status(201).json(leg)
  } catch (err) { next(err) }
})

router.put('/legs/:id', adminAuth, async (req, res, next) => {
  try {
    const { legNumber, name, distanceMiles } = req.body
    const leg = await prisma.leg.update({
      where: { id: req.params.id },
      data: { ...(legNumber && { legNumber }), ...(name && { name }), ...(distanceMiles && { distanceMiles }) },
    })
    res.json(leg)
  } catch (err) { next(err) }
})

router.delete('/legs/:id', adminAuth, async (req, res, next) => {
  try {
    await prisma.leg.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) { next(err) }
})

export default router
