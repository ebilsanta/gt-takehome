import fs from 'fs';
import readline from 'readline';
import pLimit from 'p-limit';
import { PrismaClient } from '@prisma/client';
import HttpException from '../app/models/http-exception.model';
import { addStaff } from '../app/routes/staff/staff.service';
import { StaffInput } from '../app/routes/staff/staff.model';

const prisma = new PrismaClient();

const createStaffTeam = async (input: StaffInput) => {
  try {
    return await addStaff(input);
  } catch (error) {
    if (error instanceof HttpException) {
      console.error(error.message);
    } else {
      console.error(error);
    }
  }
};

const addStaffFromLine = async (line: string) => {
  const [staffPassId, teamName, createdAt] = line.split(',');
  await createStaffTeam({
    staffPassId,
    teamName,
    createdAt: parseInt(createdAt),
  });
};

const addStaffFromCSVFile = async (csvFilePath: string) => {
  const readStream = fs.createReadStream(csvFilePath);
  const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity,
  });
  let isHeader = true;


  const limit = pLimit(15); // to limit database operations to 15 concurrent

  rl.on('line', async (line: string) => {
    try {
      await limit(async () => { 
        if (isHeader) {
          isHeader = false;
          return;
        }
        await addStaffFromLine(line);
      });
    } catch (error) {
      console.error('Error processing line:', error);
    }
  });

  rl.on('error', (error) => {
    console.error('Error reading CSV file:', error);
  });

  rl.on('close', () => {
    console.log('Finish reading CSV file.');
    readStream.close();
    rl.close();
  });
};

const main = async () => {
  try {
    const csvFilePath = 'data/staff-id-to-team-mapping-long.csv';
    await addStaffFromCSVFile(csvFilePath);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
