import { Prisma } from '@prisma/client'
import { Response } from 'express'

export function handlePrismaError(err: unknown, res: Response): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Record not found' })
      return true
    }
    if (err.code === 'P2003' || err.code === 'P2002') {
      res.status(409).json({ error: 'Conflict: record is referenced by other data or already exists' })
      return true
    }
  }
  return false
}
