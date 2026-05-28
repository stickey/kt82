import path from 'path'
import express from 'express'
import cors from 'cors'
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

app.use(cors()) // TODO: restrict origins before production
app.use(express.json())

if (process.env.NODE_ENV === 'production') {
  const appsDir = path.resolve(__dirname, '../../apps')
  const apps = ['tracker', 'captain', 'manager', 'driver']
  for (const appName of apps) {
    const distPath = path.join(appsDir, appName, 'dist')
    app.use(`/${appName}`, express.static(distPath))
    app.get(`/${appName}/*`, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
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

app.use(errorHandler)
