import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const roles = await prisma.role.findMany();
    console.log('--- User Roles and Counts ---');
    for (const role of roles) {
        const count = await prisma.user.count({
            where: { roleId: role.id }
        });
        console.log(`${role.name} (${role.displayName}): ${count}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
