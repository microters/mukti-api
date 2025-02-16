// app/api/reset-password/route.js

import { NextResponse } from 'next/server';
import prisma from '@prisma/client'; // Ensure Prisma Client is correctly initialized
import bcrypt from 'bcryptjs';

// Assuming the passwordReset table exists in your Prisma schema
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

export async function POST(req, { params }) {
  const { token } = params; // Extract the token from the URL
  const { password } = await req.json(); // Get new password from body
  
  try {
    // Find the reset record using the token
    const passwordResetRecord = await prismaClient.passwordReset.findUnique({
      where: { token },
    });

    if (!passwordResetRecord) {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password in the database
    await prismaClient.user.update({
      where: { email: passwordResetRecord.email },
      data: { password: hashedPassword },
    });

    // Optionally, remove the reset token from the database
    await prismaClient.passwordReset.delete({
      where: { token },
    });

    return NextResponse.json({ message: "Password reset successfully!" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json({ message: "Error resetting password." }, { status: 500 });
  }
}
