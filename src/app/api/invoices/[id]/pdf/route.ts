import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateInvoicePDF } from '@/lib/invoice-pdf';

// GET /api/invoices/[id]/pdf - Générer le PDF de la facture
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id 
      },
      include: {
        organisation: true,
        client: true,
        items: {
          include: {
            article: true
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    // Générer le PDF
    const pdfBuffer = await generateInvoicePDF(invoice);

    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture-${invoice.number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

