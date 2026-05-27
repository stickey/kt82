import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { adminAuth } from '../middleware/adminAuth'
import { handlePrismaError } from '../lib/prismaErrors'

const router = Router()

router.post('/legs/:id/handoff', adminAuth, async (req, res, next) => {
  try {
    const { name, address, lat, lng } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const handoff = await prisma.handoff.create({
      data: { legId: req.params.id, name, address, lat, lng },
    })
    res.status(201).json(handoff)
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

router.put('/handoffs/:id', adminAuth, async (req, res, next) => {
  try {
    const { name, address, lat, lng } = req.body
    const handoff = await prisma.handoff.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(lat !== undefined && { lat }),
        ...(lng !== undefined && { lng }),
      },
    })
    res.json(handoff)
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

export default router
