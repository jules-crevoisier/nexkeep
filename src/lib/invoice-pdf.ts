import jsPDF from 'jspdf';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  subtotal: number;
  tvaAmount: number;
  total: number;
  article?: {
    id: string;
    name: string;
    unit: string;
  } | null;
}

interface Organisation {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  siret?: string | null;
  tvaNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

interface Client {
  id: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  siret?: string | null;
  tvaNumber?: string | null;
}

interface Invoice {
  id: string;
  number: string;
  date: Date;
  dueDate: Date;
  status: string;
  subtotal: number;
  tvaAmount: number;
  total: number;
  notes?: string | null;
  paymentTerms?: string | null;
  organisation: Organisation;
  client: Client;
  items: InvoiceItem[];
}

export async function generateInvoicePDF(invoice: Invoice): Promise<Buffer> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Couleurs du thème
  const primaryColor = '#2563eb'; // Bleu
  const secondaryColor = '#64748b'; // Gris
  const accentColor = '#f1f5f9'; // Gris clair
  const textColor = '#1e293b'; // Gris foncé
  
  // Configuration des polices
  doc.setFont('helvetica');
  
  // En-tête avec design moderne
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Logo/Titre de l'organisation
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.organisation.name, 20, 20);
  
  // Informations de l'organisation dans l'en-tête
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const orgInfo = [
    invoice.organisation.address,
    `${invoice.organisation.postalCode} ${invoice.organisation.city}`,
    invoice.organisation.country
  ].filter(Boolean);
  
  let yPos = 30;
  orgInfo.forEach((line, index) => {
    if (line) {
      doc.text(line, 20, yPos + (index * 4));
    }
  });
  
  // Informations de contact
  const contactInfo = [
    invoice.organisation.phone,
    invoice.organisation.email,
    invoice.organisation.website
  ].filter(Boolean);
  
  if (contactInfo.length > 0) {
    yPos = 30;
    contactInfo.forEach((line, index) => {
      if (line) {
        doc.text(line, pageWidth - 20, yPos + (index * 4), { align: 'right' });
      }
    });
  }
  
  // Informations SIRET/TVA
  if (invoice.organisation.siret || invoice.organisation.tvaNumber) {
    doc.setFontSize(8);
    yPos = 45;
    if (invoice.organisation.siret) {
      doc.text(`SIRET: ${invoice.organisation.siret}`, 20, yPos);
    }
    if (invoice.organisation.tvaNumber) {
      doc.text(`TVA: ${invoice.organisation.tvaNumber}`, 20, yPos + 3);
    }
  }
  
  // Titre "FACTURE"
  doc.setTextColor(textColor);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', pageWidth - 20, 70, { align: 'right' });
  
  // Numéro de facture
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${invoice.number}`, pageWidth - 20, 78, { align: 'right' });
  
  // Informations de facturation
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Facturé à:', 20, 90);
  
  // Informations du client
  doc.setFont('helvetica', 'normal');
  const clientName = invoice.client.company || `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim() || invoice.client.name;
  doc.text(clientName, 20, 100);
  
  const clientAddress = [
    invoice.client.address,
    invoice.client.city && invoice.client.postalCode ? `${invoice.client.postalCode} ${invoice.client.city}` : null,
    invoice.client.country
  ].filter(Boolean);
  
  let clientY = 110;
  clientAddress.forEach((line, index) => {
    if (line) {
      doc.text(line, 20, clientY + (index * 4));
    }
  });
  
  // Informations SIRET/TVA du client
  if (invoice.client.siret || invoice.client.tvaNumber) {
    clientY += clientAddress.length * 4 + 5;
    if (invoice.client.siret) {
      doc.text(`SIRET: ${invoice.client.siret}`, 20, clientY);
    }
    if (invoice.client.tvaNumber) {
      doc.text(`TVA: ${invoice.client.tvaNumber}`, 20, clientY + 3);
    }
  }
  
  // Dates
  doc.setFont('helvetica', 'bold');
  doc.text('Date de facturation:', pageWidth - 20, 100, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.date).toLocaleDateString('fr-FR'), pageWidth - 20, 108, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date d\'échéance:', pageWidth - 20, 118, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.dueDate).toLocaleDateString('fr-FR'), pageWidth - 20, 126, { align: 'right' });
  
  // Tableau des articles
  const tableTop = 150;
  const tableLeft = 20;
  const tableWidth = pageWidth - 40;
  const colWidths = [70, 15, 20, 15, 20, 20]; // Description, Qté, Prix unitaire, TVA, Total HT, Total TTC
  
  // En-tête du tableau
  doc.setFillColor(accentColor);
  doc.rect(tableLeft, tableTop, tableWidth, 15, 'F');
  
  doc.setTextColor(textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  const headers = ['Description', 'Qté', 'Prix unitaire', 'TVA %', 'Total HT', 'Total TTC'];
  let xPos = tableLeft + 5;
  headers.forEach((header, index) => {
    const align = index === 0 ? 'left' : (index >= 4 ? 'right' : 'center');
    doc.text(header, xPos, tableTop + 10, { align });
    xPos += colWidths[index];
  });
  
  // Lignes des articles
  doc.setFont('helvetica', 'normal');
  let currentY = tableTop + 15;
  
  invoice.items.forEach((item, index) => {
    // Ligne de séparation
    if (index > 0) {
      doc.setDrawColor(200, 200, 200);
      doc.line(tableLeft, currentY - 2, tableLeft + tableWidth, currentY - 2);
    }
    
    // Description
    doc.text(item.description, tableLeft + 5, currentY + 8, { maxWidth: colWidths[0] - 10 });
    
    // Quantité
    doc.text(item.quantity.toString(), tableLeft + 5 + colWidths[0] + colWidths[1]/2, currentY + 8, { align: 'center' });
    
    // Prix unitaire
    doc.text(`${item.unitPrice.toFixed(2)} €`, tableLeft + 5 + colWidths[0] + colWidths[1] + colWidths[2]/2, currentY + 8, { align: 'center' });
    
    // Taux de TVA
    doc.text(`${item.tvaRate}%`, tableLeft + 5 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]/2, currentY + 8, { align: 'center' });
    
    // Total HT
    doc.text(`${item.subtotal.toFixed(2)} €`, tableLeft + 5 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]/2, currentY + 8, { align: 'right' });
    
    // Total TTC
    doc.text(`${item.total.toFixed(2)} €`, tableLeft + 5 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5]/2, currentY + 8, { align: 'right' });
    
    currentY += 15;
  });
  
  // Ligne de séparation avant les totaux
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(2);
  doc.line(tableLeft, currentY, tableLeft + tableWidth, currentY);
  
  // Totaux
  currentY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(textColor);
  
  // Sous-total HT
  doc.text('Sous-total HT:', tableLeft + tableWidth - 100, currentY);
  doc.text(`${invoice.subtotal.toFixed(2)} €`, tableLeft + tableWidth - 20, currentY, { align: 'right' });
  
  // TVA
  currentY += 10;
  doc.text('TVA:', tableLeft + tableWidth - 100, currentY);
  doc.text(`${invoice.tvaAmount.toFixed(2)} €`, tableLeft + tableWidth - 20, currentY, { align: 'right' });
  
  // Total TTC
  currentY += 15;
  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  doc.text('TOTAL TTC:', tableLeft + tableWidth - 100, currentY);
  doc.text(`${invoice.total.toFixed(2)} €`, tableLeft + tableWidth - 20, currentY, { align: 'right' });
  
  // Conditions de paiement
  if (invoice.paymentTerms) {
    currentY += 30;
    doc.setTextColor(textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Conditions de paiement:', tableLeft, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.paymentTerms, tableLeft, currentY + 8, { maxWidth: tableWidth });
  }
  
  // Notes
  if (invoice.notes) {
    currentY += 30;
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', tableLeft, currentY);
    doc.setFont('helvetica', 'normal');
    
    // Diviser les notes en lignes si trop longues
    const notes = invoice.notes.split('\n');
    notes.forEach((line, index) => {
      doc.text(line, tableLeft, currentY + 8 + (index * 5), { maxWidth: tableWidth });
    });
  }
  
  // Pied de page
  const footerY = pageHeight - 30;
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor);
  doc.text('Merci pour votre confiance !', pageWidth / 2, footerY, { align: 'center' });
  
  // Convertir en Buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}
