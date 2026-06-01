"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    const roles = [
        { name: 'admin', displayName: 'Administrator', hierarchyLevel: 1 },
        { name: 'operation_manager', displayName: 'Operation Manager', hierarchyLevel: 2 },
        { name: 'sales_manager', displayName: 'Sales Manager', hierarchyLevel: 3 },
        { name: 'team_leader', displayName: 'Team Leader', hierarchyLevel: 4 },
        { name: 'sales', displayName: 'Sales Advisor', hierarchyLevel: 5 },
    ];
    for (const roleData of roles) {
        await prisma.role.upsert({
            where: { name: roleData.name },
            update: {},
            create: roleData,
        });
    }
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (adminRole) {
        const adminEmail = 'admin@crm.com';
        const passwordHash = await bcrypt.hash('admin123', 10);
        await prisma.user.upsert({
            where: { email: adminEmail },
            update: {},
            create: {
                email: adminEmail,
                passwordHash,
                firstName: 'System',
                lastName: 'Admin',
                roleId: adminRole.id,
                status: 'active',
            },
        });
        console.log('Admin user created: admin@crm.com / admin123');
    }
    const leadSources = [
        { name: 'Facebook Ads', type: 'fresh', platform: 'facebook' },
        { name: 'Instagram Ads', type: 'fresh', platform: 'instagram' },
        { name: 'Direct Call', type: 'cold_call' },
        { name: 'Property Finder', type: 'fresh', platform: 'property_finder' },
    ];
    for (const source of leadSources) {
        await prisma.leadSource.create({
            data: source,
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
//# sourceMappingURL=seed.js.map