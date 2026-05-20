import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding billing data...');

  // 1. Create Subscription Plans
  const plans = [
    {
      name: 'Starter',
      monthlyTokens: 5000,
      price: 29,
      priceId: 'price_starter_monthly', // In production, these should match Stripe Price IDs
      features: [
        '5,000 AI Credits / mo',
        '3 Projects',
        'Basic SEO Audit',
        'Daily Keyword Tracking',
        'Standard Content Generation',
        'Email Support',
      ],
    },
    {
      name: 'Pro',
      monthlyTokens: 25000,
      price: 79,
      priceId: 'price_pro_monthly',
      features: [
        '25,000 AI Credits / mo',
        '10 Projects',
        'Deep Content Strategy',
        'Competitor Monitoring',
        'Multi-Agent Swarm Access',
        'Priority GEO Optimization',
        'Priority Support',
      ],
    },
    {
      name: 'Enterprise',
      monthlyTokens: 100000,
      price: 249,
      priceId: 'price_enterprise_monthly',
      features: [
        '100,000 AI Credits / mo',
        'Unlimited Projects',
        'Custom Agent Workflows',
        'Advanced API Access',
        'White-label Reports',
        'Dedicated Account Manager',
        'Custom Token Packages',
      ],
    },
  ];

  for (const plan of plans) {
    await prisma.planDefinition.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }

  // 2. Create Token Packages (Top-ups)
  const packages = [
    {
      name: 'Mini Pack',
      tokens: 1000,
      price: 10,
      priceId: 'price_pkg_mini',
    },
    {
      name: 'Value Pack',
      tokens: 5000,
      price: 40,
      priceId: 'price_pkg_value',
    },
    {
      name: 'Power Pack',
      tokens: 15000,
      price: 100,
      priceId: 'price_pkg_power',
    },
    {
      name: 'Whale Pack',
      tokens: 50000,
      price: 250,
      priceId: 'price_pkg_whale',
    },
  ];

  for (const pkg of packages) {
    await prisma.tokenPackage.upsert({
      where: { name: pkg.name },
      update: pkg,
      create: pkg,
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
