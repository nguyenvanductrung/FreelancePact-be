import "dotenv/config";
import { PrismaClient, ContractStatus, PaymentTerm, MilestoneStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcrypt";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("Starting seed...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  const client = await prisma.user.upsert({
    where: { email: "client@demo.com" },
    update: {},
    create: { email: "client@demo.com", password: hashedPassword, fullName: "Sarah Connor", role: "CLIENT", isKycVerified: true, title: "Product Manager", location: "San Francisco, CA", rating: 4.9, totalContracts: 12 },
  });

  const freelancer = await prisma.user.upsert({
    where: { email: "freelancer@demo.com" },
    update: {},
    create: { email: "freelancer@demo.com", password: hashedPassword, fullName: "John Developer", role: "FREELANCER", isKycVerified: true, title: "Full-stack Developer", location: "Ho Chi Minh City, VN", hourlyRate: 50, skills: ["React", "TypeScript", "NestJS", "PostgreSQL"], rating: 4.8, totalContracts: 24, successRate: 98 },
  });

  console.log("Users OK. client=" + client.id + " freelancer=" + freelancer.id);

  const contractsData: any[] = [
    {
      title: "Thiet ke lai Ung dung Di dong FinTech",
      partnerName: "Sarah Connor",
      description: "Redesign mobile application for a fintech company.",
      status: ContractStatus.ACTIVE,
      totalValue: 300000000,
      escrowedAmount: 75000000,
      startDate: "2024-10-10T00:00:00Z",
      endDate: "2024-12-15T00:00:00Z",
      progressPercent: 40,
      paymentTerm: PaymentTerm.ESCROW_MILESTONE,
      freelancerId: freelancer.id,
      clientId: client.id,
      milestones: [
        { name: "Milestone 1 - Wireframes", budget: 75000000, deadline: "2024-10-30T00:00:00Z", status: MilestoneStatus.COMPLETED, progressPercent: 100 },
        { name: "Milestone 2 - UI Design", budget: 75000000, deadline: "2024-11-15T00:00:00Z", status: MilestoneStatus.ACTIVE, progressPercent: 40 },
        { name: "Milestone 3 - Prototype", budget: 75000000, deadline: "2024-11-30T00:00:00Z", status: MilestoneStatus.PENDING, progressPercent: 0 },
        { name: "Milestone 4 - Final Delivery", budget: 75000000, deadline: "2024-12-15T00:00:00Z", status: MilestoneStatus.PENDING, progressPercent: 0 },
      ],
    },
    {
      title: "E-Commerce Backend API Development",
      partnerName: "Sarah Connor",
      description: "Build scalable REST API for e-commerce using NestJS.",
      status: ContractStatus.ACTIVE,
      totalValue: 120000000,
      escrowedAmount: 60000000,
      startDate: "2024-09-01T00:00:00Z",
      endDate: "2024-11-30T00:00:00Z",
      progressPercent: 65,
      paymentTerm: PaymentTerm.ESCROW_MILESTONE,
      freelancerId: freelancer.id,
      clientId: client.id,
      milestones: [
        { name: "Phase 1 - Architecture", budget: 30000000, deadline: "2024-09-20T00:00:00Z", status: MilestoneStatus.COMPLETED, progressPercent: 100 },
        { name: "Phase 2 - Core API", budget: 50000000, deadline: "2024-10-31T00:00:00Z", status: MilestoneStatus.COMPLETED, progressPercent: 100 },
        { name: "Phase 3 - Payment Integration", budget: 40000000, deadline: "2024-11-30T00:00:00Z", status: MilestoneStatus.ACTIVE, progressPercent: 30 },
      ],
    },
    {
      title: "React Native App - Logistics Tracking",
      partnerName: "Sarah Connor",
      description: "Cross-platform mobile app with real-time tracking.",
      status: ContractStatus.COMPLETED,
      totalValue: 95000000,
      escrowedAmount: 0,
      startDate: "2024-06-01T00:00:00Z",
      endDate: "2024-08-31T00:00:00Z",
      progressPercent: 100,
      paymentTerm: PaymentTerm.ESCROW_FULL,
      freelancerId: freelancer.id,
      clientId: client.id,
      milestones: [
        { name: "Sprint 1 - Core Features", budget: 47500000, deadline: "2024-07-15T00:00:00Z", status: MilestoneStatus.COMPLETED, progressPercent: 100 },
        { name: "Sprint 2 - Polish & Launch", budget: 47500000, deadline: "2024-08-31T00:00:00Z", status: MilestoneStatus.COMPLETED, progressPercent: 100 },
      ],
    },
  ];

  for (const data of contractsData) {
    const { milestones, ...fields } = data;
    const existing = await prisma.contract.findFirst({ where: { title: fields.title } });
    if (!existing) {
      await prisma.contract.create({ data: { ...fields, milestones: { create: milestones } } });
      console.log("Created: " + fields.title);
    } else {
      console.log("Skipped: " + fields.title);
    }
  }
  console.log("Seed done! Login: freelancer@demo.com / password123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
