import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreasury, workspaceErrorResponse } from '@/lib/workspace';

// GET /api/invoices/[id] - Récupérer une facture spécifique
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

    return NextResponse.json(invoice);
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/invoices/[id] - Mettre à jour une facture
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury('WRITE');

    const data = await request.json();

    // Vérifier que la facture appartient à l'organisation active
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
      }
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    // Si on met à jour les articles, recalculer les totaux
    if (data.items) {
      let subtotal = 0;
      let tvaAmount = 0;

      for (const item of data.items) {
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemTvaAmount = itemSubtotal * (item.tvaRate / 100);
        
        subtotal += itemSubtotal;
        tvaAmount += itemTvaAmount;
      }

      data.subtotal = subtotal;
      data.tvaAmount = tvaAmount;
      data.total = subtotal + tvaAmount;
    }

    const invoice = await prisma.invoice.update({
      where: { id: id },
      data: {
        ...data,
        // Si on met à jour les articles, supprimer les anciens et créer les nouveaux
        ...(data.items && {
          items: {
            deleteMany: {},
            create: data.items.map((item: { description: string; quantity: number; unitPrice: number; tvaRate: number; articleId?: string }) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              tvaRate: item.tvaRate,
              subtotal: item.quantity * item.unitPrice,
              tvaAmount: (item.quantity * item.unitPrice) * (item.tvaRate / 100),
              total: (item.quantity * item.unitPrice) * (1 + item.tvaRate / 100),
              articleId: item.articleId
            }))
          }
        })
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

    return NextResponse.json(invoice);
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/invoices/[id] - Supprimer une facture
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await requireTreasury('WRITE');

    // Vérifier que la facture appartient à l'organisation active
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        workspaceId: ctx.workspace.id
      }
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    await prisma.invoice.delete({
      where: { id: id }
    });

    return NextResponse.json({ message: 'Facture supprimée avec succès' });
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

