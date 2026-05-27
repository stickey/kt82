import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'

export async function adminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const password = req.headers['x-admin-password']
  if (!password || typeof password !== 'string') {
    res.status(401).json({ error: 'X-Admin-Password header required' })
    return
  }
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) {
    res.status(500).json({ error: 'Admin password not configured' })
    return
  }
  const valid = await bcrypt.compare(password, hash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid admin password' })
    return
  }
  next()
}
