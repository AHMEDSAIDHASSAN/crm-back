import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for Sales Manager users...');

    // 1. Find the sales_manager role
    const salesManagerRole = await prisma.role.findUnique({
        where: { name: 'sales_manager' },
    });

    if (!salesManagerRole) {
        console.error('Error: sales_manager role not found in database. Please run the seed script first.');
        return;
    }

    // 2. Check if any user has this role
    const existingManager = await prisma.user.findFirst({
        where: { roleId: salesManagerRole.id },
    });

    if (existingManager) {
        console.log(`Sales Manager exists: ${existingManager.email} (${existingManager.firstName} ${existingManager.lastName})`);
    } else {
        console.log('No Sales Manager found. Creating default Sales Manager...');

        const email = 'sales.manager@crm.com';
        const passwordHash = await bcrypt.hash('manager123', 10);

        const newManager = await prisma.user.create({
            data: {
                email,
                passwordHash,
                firstName: 'Sales',
                lastName: 'Manager',
                roleId: salesManagerRole.id,
                status: 'active',
            },
        });

        console.log(`Default Sales Manager created: ${newManager.email}`);
        console.log('Password: manager123');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
