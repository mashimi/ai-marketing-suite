import { VaultService } from './src/services/vault.service';
import { prisma } from './src/lib/db';

async function testVault() {
  console.log("🔍 Starting Brand Vault Test...");
  
  // Get or create a test project
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { email: 'test@example.com', password: 'password123', name: 'Test User' }
    });
  }

  let project = await prisma.project.findFirst({ where: { userId: user.id } });
  if (!project) {
    project = await prisma.project.create({
      data: { name: "Test Brand", url: "https://example.com", userId: user.id }
    });
  }

  console.log("✅ Using Project ID:", project.id);

  // 1. Add knowledge to the Vault
  console.log("\n📦 Adding brand facts to the vault...");
  await VaultService.addToVault(project.id, "Our company is called 'Acme Corp' and we specialize in ultra-fast AI agents. Our brand voice is witty, concise, and futuristic.");
  console.log("✅ Fact added successfully.");

  // 2. Retrieve knowledge from the Vault
  console.log("\n🧠 Retrieving context from the vault...");
  const context = await VaultService.getContext(project.id, "Tell me about the brand.");
  
  console.log("\n📝 Vault Returned:");
  console.log("--------------------------------------------------");
  console.log(context);
  console.log("--------------------------------------------------");

  console.log("\n✅ Brand Vault test completed successfully!");
}

testVault()
  .catch(console.error)
  .finally(() => process.exit(0));
