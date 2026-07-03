import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ContractsService } from './contracts/contracts.service';
import { AuthService } from './auth/auth.service';
import { RegisterRole } from './auth/dto/register.dto';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const authService = app.get(AuthService);
  const contractsService = app.get(ContractsService);

  try {
    console.log('--- Bắt đầu test ---');

    // 1. Tạo Client
    const clientReg = await authService.register({
      email: 'client' + Date.now() + '@example.com',
      password: 'password123',
      fullName: 'Client ' + Date.now(),
      role: 'client' as RegisterRole
    });
    const clientId = clientReg.user.id;
    console.log('Tạo Client thành công: ', clientId);

    // 2. Tạo Freelancer
    const flReg = await authService.register({
      email: 'fl' + Date.now() + '@example.com',
      password: 'password123',
      fullName: 'Freelancer ' + Date.now(),
      role: 'freelancer' as RegisterRole
    });
    const flId = flReg.user.id;
    console.log('Tạo Freelancer thành công: ', flId);

    // 3. Tạo Job trực tiếp qua Prisma (giả lập Client tạo Job)
    const job = await prisma.job.create({
      data: {
        title: 'Job Test Tạo Dapp',
        description: 'Tạo smart contract trên Cardano.',
        budget: 15000,
        clientId: clientId,
      }
    });
    console.log('Tạo Job thành công: ', job.id, '- Trạng thái: ', job.status);

    // 4. Gọi hàm selectFreelancerAndCreateDraftContract (giả lập controller)
    console.log('\n--- Gọi Service Khởi tạo Hợp đồng Nháp ---');
    const result = await contractsService.selectFreelancerAndCreateDraftContract(clientId, {
      jobId: job.id,
      freelancerId: flId
    });
    console.log('Kết quả từ API: ', result);

    // 5. Kiểm chứng CSDL
    const updatedJob = await prisma.job.findUnique({ where: { id: job.id } });
    console.log('Trạng thái Job sau khi chạy API: ', updatedJob?.status);

    const newContract = await prisma.contract.findUnique({ where: { id: result.contractId } });
    console.log('Dữ liệu Hợp đồng Nháp mới:');
    console.log(newContract);

  } catch (error) {
    console.error('Lỗi khi test: ', error);
  } finally {
    await app.close();
  }
}
bootstrap();
