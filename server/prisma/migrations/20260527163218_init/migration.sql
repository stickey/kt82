-- CreateTable
CREATE TABLE "Race" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leg" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "legNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "distanceMiles" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Leg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handoff" (
    "id" TEXT NOT NULL,
    "legId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "Handoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "captainPinHash" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegAssignment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "legId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "targetPaceSecPerMile" INTEGER NOT NULL,

    CONSTRAINT "LegAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegResult" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "legId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "LegResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Handoff_legId_key" ON "Handoff"("legId");

-- CreateIndex
CREATE UNIQUE INDEX "LegAssignment_teamId_legId_key" ON "LegAssignment"("teamId", "legId");

-- CreateIndex
CREATE UNIQUE INDEX "LegResult_teamId_legId_key" ON "LegResult"("teamId", "legId");

-- AddForeignKey
ALTER TABLE "Leg" ADD CONSTRAINT "Leg_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handoff" ADD CONSTRAINT "Handoff_legId_fkey" FOREIGN KEY ("legId") REFERENCES "Leg"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegAssignment" ADD CONSTRAINT "LegAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegAssignment" ADD CONSTRAINT "LegAssignment_legId_fkey" FOREIGN KEY ("legId") REFERENCES "Leg"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegAssignment" ADD CONSTRAINT "LegAssignment_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegResult" ADD CONSTRAINT "LegResult_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegResult" ADD CONSTRAINT "LegResult_legId_fkey" FOREIGN KEY ("legId") REFERENCES "Leg"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
