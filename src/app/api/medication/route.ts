import { NextResponse } from "next/server";

import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import prisma from "../../../../prisma";
import { PrismaClientInitializationError } from "@prisma/client/runtime/library";

dayjs.locale("pt-br");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!userId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    const logs = await prisma.medicationLog.findMany({
      where: {
        userId: userId,
        date: {
          gte: dayjs(startDate).toDate(),
          lte: dayjs(endDate).toDate(),
        },
      },
    });
    return NextResponse.json(logs);
  } catch (error) {
    if (error instanceof PrismaClientInitializationError) {
      return NextResponse.json({
        code: error.errorCode,
        message: error.message,
        name: error.name,
        cause: error.cause,
      });
    }
    return NextResponse.json(
      { error: PrismaClientInitializationError },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, date, taken } = body;

  if (!userId || !date) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const log = await prisma.medicationLog.upsert({
      where: {
        userId_date: {
          userId: userId,
          date: dayjs(date).toDate(),
        },
      },
      update: { taken },
      create: { userId, date: dayjs(date).toDate(), taken },
    });
    return NextResponse.json(log);
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
