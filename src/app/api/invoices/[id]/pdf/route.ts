import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoicePDF } from '@/lib/invoice-pdf';
import { requireTreasury, workspaceErrorResponse } from '@/lib/workspace';

// GET /api/invoices/[id]/pdf - Générer le PDF de la facture
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury('READ');

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
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
    return new NextResponse(pdfBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture-${invoice.number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

