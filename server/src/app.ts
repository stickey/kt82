import express from 'express'
import cors from 'cors'
import path from 'path'
import { errorHandler } from './middleware/errorHandler'
import authRouter from './routes/auth'
import racesRouter from './routes/races'
import legsRouter from './routes/legs'
import handoffsRouter from './routes/handoffs'
import teamsRouter from './routes/teams'
import membersRouter from './routes/members'
import assignmentsRouter from './routes/assignments'
import resultsRouter from './routes/results'
import trackerRouter from './routes/tracker'

export const app = express()

console.log('[kt82] app module loaded, NODE_ENV:', process.env.NODE_ENV)

app.use(cors()) // TODO: restrict origins before production
app.use(express.json())

app.use((req, _res, next) => {
  console.log(`[kt82] ${req.method} ${req.url}`)
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString(), node: process.version })
})

app.use('/api', authRouter)
app.use('/api', racesRouter)
app.use('/api', legsRouter)
app.use('/api', handoffsRouter)
app.use('/api', teamsRouter)
app.use('/api', membersRouter)
app.use('/api', assignmentsRouter)
app.use('/api', resultsRouter)
app.use('/api', trackerRouter)

if (process.env.NODE_ENV === 'production') {
  const publicDir = path.join(__dirname, 'public')
  for (const name of ['tracker', 'captain', 'manager', 'driver']) {
    const appDir = path.join(publicDir, name)
    app.use(`/${name}`, express.static(appDir))
    app.get(`/${name}/*`, (_req, res) => res.sendFile(path.join(appDir, 'index.html')))
  }
}

app.use(errorHandler)
