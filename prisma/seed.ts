import { PrismaClient, UserStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create default roles (must match src/constants/roles.ts)
    const roles = [
        { name: 'super_admin', displayName: 'Super Admin', hierarchyLevel: 0 },
        { name: 'operation_manager', displayName: 'Operation Manager', hierarchyLevel: 1 },
        { name: 'sales_manager', displayName: 'Sales Manager', hierarchyLevel: 2 },
        { name: 'tech_lead', displayName: 'Tech Lead', hierarchyLevel: 3 },
        { name: 'sales', displayName: 'Sales', hierarchyLevel: 4 },
        { name: 'marketing', displayName: 'Marketing', hierarchyLevel: 5 },
        { name: 'hr', displayName: 'HR', hierarchyLevel: 6 },
    ];

    for (const roleData of roles) {
        await prisma.role.upsert({
            where: { name: roleData.name },
            update: { hierarchyLevel: roleData.hierarchyLevel, displayName: roleData.displayName },
            create: roleData,
        });
    }

    // 2. Helper to create users
    const createUser = async (email: string, pass: string, fName: string, lName: string, roleName: string) => {
        const role = await prisma.role.findUnique({ where: { name: roleName } });
        if (!role) return null;

        const passwordHash = await bcrypt.hash(pass, 10);
        return prisma.user.upsert({
            where: { email },
            update: { roleId: role.id },
            create: {
                email,
                passwordHash,
                firstName: fName,
                lastName: lName,
                roleId: role.id,
                status: 'active' as any,
            },
        });
    };

    // 3. Create sample users for hierarchy
    await createUser('super@crm.com', 'super123', 'Super', 'Admin', 'super_admin');
    await createUser('operation@crm.com', 'operation123', 'Operation', 'Manager', 'operation_manager');
    await createUser('sales_manager@crm.com', 'sales123', 'Sales', 'Manager', 'sales_manager');
    await createUser('tech_lead@crm.com', 'lead123', 'Tech', 'Lead', 'tech_lead');
    await createUser('sales@crm.com', 'sales123', 'Sales', 'Person', 'sales');
    await createUser('marketing@crm.com', 'marketing123', 'Marketing', 'User', 'marketing');

    console.log('Default users created for all roles (including marketing).');

    // 3. Create Default Lead Sources
    const leadSources = [
        { name: 'Facebook Ads', type: 'fresh' as any, platform: 'facebook' },
        { name: 'Instagram Ads', type: 'fresh' as any, platform: 'instagram' },
        { name: 'Direct Call', type: 'cold_call' as any },
        { name: 'Property Finder', type: 'fresh' as any, platform: 'property_finder' },
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
