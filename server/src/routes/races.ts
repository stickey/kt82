import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { adminAuth } from '../middleware/adminAuth'

const router = Router()

router.get('/races', adminAuth, async (req, res, next) => {
  try {
    const races = await prisma.race.findMany({ orderBy: { date: 'asc' } })
    res.json(races.map(r => ({ ...r, date: r.date.toISOString(), createdAt: r.createdAt.toISOString() })))
  } catch (err) { next(err) }
})

router.post('/races', adminAuth, async (req, res, next) => {
  try {
    const { name, date } = req.body
    if (!name || !date) return res.status(400).json({ error: 'name and date are required' })
    const race = await prisma.race.create({ data: { name, date: new Date(date) } })
    res.status(201).json({ ...race, date: race.date.toISOString(), createdAt: race.createdAt.toISOString() })
  } catch (err) { next(err) }
})

export default router
