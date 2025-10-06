
import { NextResponse } from 'next/server';
import { consultarLeads } from '@/lib/leads-service';

export async function GET() {
  try {
    const leads = await consultarLeads();
    return NextResponse.json(leads);
  } catch (error: any) {
    console.error('❌ API Route - Erro ao consultar leads:', error.message);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar leads' },
      { status: 500 }
    );
  }
}
