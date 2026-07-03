const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log('Running test...');
  
  try {
    // 1. Create a client user
    const clientEmail = 'client_test_' + Date.now() + '@example.com';
    await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: clientEmail,
        password: 'password123',
        fullName: 'Client Test',
        role: 'client'
      })
    });
    
    // Login to get token
    const clientLoginReq = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: clientEmail,
        password: 'password123'
      })
    });
    const clientLogin = await clientLoginReq.json();
    const clientToken = clientLogin.data.accessToken;
    const clientUser = await prisma.user.findUnique({where: {email: clientEmail}});
    const clientId = clientUser.id;

    // 2. Create a freelancer user
    const flEmail = 'fl_test_' + Date.now() + '@example.com';
    await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: flEmail,
        password: 'password123',
        fullName: 'Freelancer Test',
        role: 'freelancer'
      })
    });
    const flUser = await prisma.user.findUnique({where: {email: flEmail}});
    const freelancerId = flUser.id;

    // 3. Create a Job in the database owned by client
    const job = await prisma.job.create({
      data: {
        title: 'Build a Cardano Dapp',
        description: 'Need a smart contract on Cardano.',
        budget: 5000,
        clientId: clientId,
      }
    });

    console.log(`Created Job ID: ${job.id}`);
    console.log(`Freelancer ID: ${freelancerId}`);

    // 4. Call the select-freelancer endpoint
    console.log('Calling POST /contracts/select-freelancer');
    const responseReq = await fetch('http://localhost:3000/contracts/select-freelancer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        jobId: job.id,
        freelancerId: freelancerId
      })
    });
    
    const responseBody = await responseReq.json();

    console.log('--- API Response ---');
    console.log(responseBody);

    // 5. Verify the Job status and Contract in DB
    const updatedJob = await prisma.job.findUnique({ where: { id: job.id } });
    console.log(`Job Status after API: ${updatedJob.status}`);

    const contractId = responseBody.data ? responseBody.data.contractId : responseBody.contractId;
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    console.log(`Contract details:`);
    console.log(contract);

    console.log('Test successful!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
