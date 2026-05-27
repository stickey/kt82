import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { Team } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      team?: Team
    }
  }
}

export async function teamAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const pin = req.headers['x-team-pin']
  const teamId = req.params.id ?? req.params.teamId
  if (!pin || typeof pin !== 'string') {
    res.status(401).json({ error: 'X-Team-Pin header required' })
    return
  }
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) {
    res.status(404).json({ error: 'Team not found' })
    return
  }
  const valid = await bcrypt.compare(pin, team.captainPinHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid PIN' })
    return
  }
  req.team = team
  next()
}
