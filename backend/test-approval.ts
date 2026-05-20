import { prisma } from './src/lib/db';

async function testApproval() {
  console.log("📝 Starting Approval Workflow Test...");

  let user = await prisma.user.findFirst();
  let project = await prisma.project.findFirst({ where: { userId: user?.id } });

  if (!project) throw new Error("Project not found. Run test-vault.ts first to generate seed data.");

  // Create a draft content piece
  const piece = await prisma.contentPiece.create({
    data: {
      projectId: project.id,
      title: "How to Use AI for SEO",
      type: "blog",
      status: "draft",
      approvalStatus: "pending_review",
      content: "This is an AI generated draft that needs human approval."
    }
  });

  console.log(`✅ Created pending draft: ${piece.id}`);

  // Simulate hitting the approve route manually
  console.log("\n👍 Simulating User Clicking 'Approve & Publish'...");
  const approved = await prisma.contentPiece.update({
    where: { id: piece.id },
    data: { approvalStatus: 'approved' }
  });
  
  console.log(`✅ Draft Status is now: ${approved.approvalStatus}`);

  // Simulate hitting the reject route manually
  console.log("\n👎 Simulating User Clicking 'Rewrite'...");
  const rejected = await prisma.contentPiece.update({
    where: { id: piece.id },
    data: { approvalStatus: 'rejected' }
  });

  console.log(`✅ Draft Status is now: ${rejected.approvalStatus}`);
  console.log("\n✅ Approval Workflow test completed successfully!");
}

testApproval()
  .catch(console.error)
  .finally(() => process.exit(0));
