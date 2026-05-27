import express from 'express'
import cors from 'cors'
import { errorHandler } from './middleware/errorHandler'
import authRouter from './routes/auth'

export const app = express()

app.use(cors()) // TODO: restrict origins before production
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api', authRouter)

app.use(errorHandler)
