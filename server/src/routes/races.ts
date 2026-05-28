import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { adminAuth } from '../middleware/adminAuth'
import { handlePrismaError } from '../lib/prismaErrors'

const router = Router()

router.get('/races', adminAuth, async (req, res, next) => {
  try {
    const races = await prisma.race.findMany({ orderBy: { date: 'asc' } })
    res.json(races)
  } catch (err) { next(err) }
})

router.post('/races', adminAuth, async (req, res, next) => {
  try {
    const { name, date } = req.body
    if (!name || !date) return res.status(400).json({ error: 'name and date are required' })
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) return res.status(400).json({ error: 'date must be a valid date string' })
    const race = await prisma.race.create({ data: { name, date: parsedDate } })
    res.status(201).json(race)
  } catch (err) { next(err) }
})

router.put('/races/:id', adminAuth, async (req, res, next) => {
  try {
    const { name, date } = req.body
    const data: { name?: string; date?: Date } = {}
    if (name != null) {
      if (!String(name).trim()) return res.status(400).json({ error: 'name cannot be empty' })
      data.name = String(name).trim()
    }
    if (date != null) {
      const d = new Date(date)
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'invalid date' })
      data.date = d
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'name or date required' })
    const race = await prisma.race.update({ where: { id: req.params.id }, data })
    res.json(race)
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})

export default router
