import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'healthcheck ok',
    route: '/api/healthcheck',
    env: process.env.NODE_ENV || 'unknown',
  });
}
