import { PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2] || 'admin@example.com';
    const password = process.argv[3] || 'admin123';
    const firstName = process.argv[4] || 'Super';
    const lastName = process.argv[5] || 'Admin';

    console.log(`--- Creating Super Admin User ---`);
    console.log(`Email: ${email}`);
    console.log(`First Name: ${firstName}`);
    console.log(`Last Name: ${lastName}`);

    try {
        // 1. Ensure the super_admin role exists
        let superAdminRole = await prisma.role.findUnique({
            where: { name: 'super_admin' },
        });

        if (!superAdminRole) {
            console.log('Role "super_admin" not found. Creating it...');
            superAdminRole = await prisma.role.create({
                data: {
                    name: 'super_admin',
                    displayName: 'Super Admin',
                    hierarchyLevel: 0,
                    permissions: {}, // Add default permissions if needed
                },
            });
        }

        // 2. Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            console.log(`User with email "${email}" already exists. Updating password and role...`);
            const passwordHash = await bcrypt.hash(password, 10);
            await prisma.user.update({
                where: { email },
                data: {
                    passwordHash,
                    roleId: superAdminRole.id,
                    status: UserStatus.active,
                },
            });
        } else {
            console.log('Creating new user...');
            const passwordHash = await bcrypt.hash(password, 10);
            await prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    firstName,
                    lastName,
                    roleId: superAdminRole.id,
                    status: UserStatus.active,
                },
            });
        }

        console.log('\x1b[32m[Success] Super Admin user handled successfully!\x1b[0m');
        console.log(`Credentials: ${email} / ${password}`);

    } catch (error) {
        console.error('\x1b[31m[Error] Failed to create super admin user:\x1b[0m');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
