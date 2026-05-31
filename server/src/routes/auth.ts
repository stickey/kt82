import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

const router = Router()

router.post('/auth/admin', async (req, res, next) => {
  try {
    const { password } = req.body
    if (!password) {
      return res.status(400).json({ error: 'password is required' })
    }
    const hash = process.env.ADMIN_PASSWORD_HASH
    if (!hash) return res.status(500).json({ error: 'Admin password not configured' })
    const valid = await bcrypt.compare(password, hash)
    if (!valid) return res.status(401).json({ error: 'Invalid password' })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.post('/auth/team', async (req, res, next) => {
  try {
    const { pin } = req.body
    if (!pin) return res.status(400).json({ error: 'pin is required' })
    if (typeof pin !== 'string') return res.status(400).json({ error: 'pin must be a string' })
    const teams = await prisma.team.findMany()
    for (const team of teams) {
      const valid = await bcrypt.compare(pin, team.captainPinHash)
      if (valid) return res.json({ teamId: team.id })
    }
    res.status(401).json({ error: 'Invalid PIN' })
  } catch (err) {
    next(err)
  }
})

export default router
