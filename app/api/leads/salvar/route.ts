import { NextResponse } from 'next/server';
import { salvarLead } from '@/lib/leads-service';

export async function POST(request: Request) {
  try {
    const leadData = await request.json();
    console.log("📥 API Route - Salvando lead:", leadData);

    const leadSalvo = await salvarLead(leadData);
    console.log("✅ API Route - Lead salvo:", leadSalvo);

    return NextResponse.json(leadSalvo);
  } catch (error: any) {
    console.error('❌ API Route - Erro ao salvar lead:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar lead' },
      { status: 500 }
    );
  }
}