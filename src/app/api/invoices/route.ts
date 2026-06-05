import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTreasury, workspaceErrorResponse } from '@/lib/workspace';

// GET /api/invoices - Récupérer toutes les factures de l'organisation
export async function GET() {
  try {
    const ctx = await requireTreasury('READ');

    const invoices = await prisma.invoice.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: {
        organisation: true,
        client: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(invoices);
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/invoices - Créer une nouvelle facture
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireTreasury('WRITE');

    const data = await request.json();

    // Validation des champs obligatoires
    if (!data.organisationId || !data.clientId || !data.items || data.items.length === 0) {
      return NextResponse.json({
        error: 'L\'organisation, le client et au moins un article sont obligatoires'
      }, { status: 400 });
    }

    // Vérifier que l'organisation appartient à l'organisation active
    const organisation = await prisma.organisation.findFirst({
      where: {
        id: data.organisationId,
        workspaceId: ctx.workspace.id
      }
    });

    if (!organisation) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    // Vérifier que le client appartient à l'organisation active
    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        workspaceId: ctx.workspace.id
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // Générer le numéro de facture
    const lastInvoice = await prisma.invoice.findFirst({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: 'desc' }
    });

    const invoiceNumber = lastInvoice 
      ? `FAC-${String(parseInt(lastInvoice.number.split('-')[1]) + 1).padStart(4, '0')}`
      : 'FAC-0001';

    // Calculer les totaux
    let subtotal = 0;
    let tvaAmount = 0;

    for (const item of data.items) {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemTvaAmount = itemSubtotal * (item.tvaRate / 100);
      
      subtotal += itemSubtotal;
      tvaAmount += itemTvaAmount;
    }

    const total = subtotal + tvaAmount;

    // Créer la facture avec ses articles
    const invoice = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        date: new Date(data.date || new Date()),
        dueDate: new Date(data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 jours par défaut
        status: data.status || 'draft',
        subtotal,
        tvaAmount,
        total,
        notes: data.notes,
        paymentTerms: data.paymentTerms,
        workspaceId: ctx.workspace.id,
        userId: ctx.userId,
        organisationId: data.organisationId,
        clientId: data.clientId,
        items: {
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
      },
      include: {
        organisation: true,
        client: true,
        items: true
      }
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return workspaceErrorResponse(error) ?? NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

