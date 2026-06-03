"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Calendar,
  FileText,
  Table as TableIcon,
  X
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import { DATA_UPDATED_EVENT } from "@/lib/events";
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Transaction, TransactionWithBudget, Category } from "@/types";

type SortField = "type" | "name" | "amount" | "date" | "description" | "category" | "budget";
type SortDirection = "asc" | "desc";

function sortTransactionRows(
  rows: TransactionWithBudget[],
  field: SortField,
  direction: SortDirection
): TransactionWithBudget[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (field) {
      case "date":
        return factor * (new Date(a.date).getTime() - new Date(b.date).getTime());
      case "amount":
        return factor * (a.amount - b.amount);
      case "budget":
        return factor * (a.budgetAfterTransaction - b.budgetAfterTransaction);
      case "name":
        return factor * a.name.localeCompare(b.name, "fr");
      case "type":
        return factor * a.type.localeCompare(b.type);
      case "category":
        return factor * (a.category ?? "").localeCompare(b.category ?? "", "fr");
      case "description":
        return factor * (a.description ?? "").localeCompare(b.description ?? "", "fr");
      default:
        return 0;
    }
  });
}

interface SortableTableHeadProps {
  label: string;
  field: SortField;
  activeField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}

function SortableTableHead({
  label,
  field,
  activeField,
  direction,
  onSort,
  className,
}: SortableTableHeadProps) {
  const isActive = activeField === field;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm -ml-1 px-1"
      >
        {label}
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
        )}
      </button>
    </TableHead>
  );
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialBudget, setInitialBudget] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    const textFields: SortField[] = ["name", "description", "category"];
    setSortDirection(textFields.includes(field) ? "asc" : "desc");
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    typeFilter !== "all" ||
    dateFilter !== "all" ||
    selectedCategory !== "all" ||
    startDate !== "" ||
    endDate !== "";

  const resetFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setDateFilter("all");
    setSelectedCategory("all");
    setStartDate("");
    setEndDate("");
  };

  const fetchUserData = async () => {
    try {
      // Récupérer le profil utilisateur (budget initial)
      const userResponse = await fetch("/api/user/profile");
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setInitialBudget(userData.budgetInitial || 0);
      }

      // Récupérer les transactions
      const transactionsResponse = await fetch("/api/transactions");
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
        setFilteredTransactions(transactionsData);
      }

      // Récupérer les catégories
      const categoriesResponse = await fetch("/api/categories");
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session) {
      fetchUserData();
    }
  }, [session]);

  useEffect(() => {
    const handleDataUpdate = () => {
      if (session) fetchUserData();
    };
    window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdate);
    window.addEventListener('budgetUpdated', handleDataUpdate);
    return () => {
      window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdate);
      window.removeEventListener('budgetUpdated', handleDataUpdate);
    };
  }, [session]);

  useEffect(() => {
    let filtered = transactions;

    if (searchTerm) {
      filtered = filtered.filter((transaction: Transaction) =>
        transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((transaction: Transaction) => transaction.type === typeFilter);
    }

    // Filtrage par catégorie
    if (selectedCategory && selectedCategory !== "all") {
      const selectedCategoryData = categories.find((cat: Category) => cat.id === selectedCategory);
      if (selectedCategoryData) {
        filtered = filtered.filter((transaction: Transaction) => transaction.category === selectedCategoryData.name);
      }
    }

    // Filtrage par date
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((transaction: Transaction) => {
        const transactionDate = new Date(transaction.date);
        
        switch (dateFilter) {
          case "today":
            return transactionDate >= today;
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return transactionDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return transactionDate >= monthAgo;
          case "year":
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return transactionDate >= yearAgo;
          case "custom":
            if (startDate && endDate) {
              const start = new Date(startDate);
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999); // Inclure toute la journée de fin
              return transactionDate >= start && transactionDate <= end;
            }
            return true;
          default:
            return true;
        }
      });
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, typeFilter, dateFilter, startDate, endDate, selectedCategory, categories]);

  const totalIncome = transactions
    .filter((t: Transaction) => t.type === "income")
    .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t: Transaction) => t.type === "expense")
    .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

  const netBalance = totalIncome - totalExpenses;

  // Calculer le budget après chaque transaction pour l'affichage
  const sortedTransactionsForDisplay = [...filteredTransactions].sort((a: Transaction, b: Transaction) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentBudget = initialBudget;
  const transactionsWithBudget: TransactionWithBudget[] = sortedTransactionsForDisplay.map((t: Transaction) => {
    currentBudget += t.type === 'income' ? t.amount : -Math.abs(t.amount);
    
    return {
      ...t,
      budgetAfterTransaction: currentBudget
    };
  });

  const displayTransactions = sortTransactionRows(
    transactionsWithBudget,
    sortField,
    sortDirection
  );

  const exportToXLSX = () => {
    // Trier les transactions par date pour l'export
    const sortedTransactions = [...filteredTransactions].sort((a: Transaction, b: Transaction) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculer le budget après chaque transaction pour l'export
    let currentBudgetExport = initialBudget;
    const transactionsWithBudgetExport = sortedTransactions.map((t: Transaction) => {
      currentBudgetExport += t.type === 'income' ? t.amount : -Math.abs(t.amount);
      
      return {
        ...t,
        budgetAfterTransaction: currentBudgetExport
      };
    });

    // Préparer les données pour Excel
    const worksheetData = [
      ["Nom", "Type", "Montant (€)", "Description", "Catégorie", "Date", "Heure", "Budget Après Transaction (€)"], // En-têtes
      ...transactionsWithBudgetExport.map((t: TransactionWithBudget) => [
        t.name,
        t.type === "income" ? "Revenu" : "Dépense",
        parseFloat(t.amount.toFixed(2)), // Nombre pour Excel
        t.description || "",
        t.category || "",
        new Date(t.date).toLocaleDateString("fr-FR"),
        new Date(t.date).toLocaleTimeString("fr-FR", { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        }),
        parseFloat(t.budgetAfterTransaction.toFixed(2)) // Budget après transaction
      ])
    ];

    // Créer le workbook et worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Définir la largeur des colonnes
    const columnWidths = [
      { wch: 20 }, // Nom
      { wch: 12 }, // Type
      { wch: 15 }, // Montant
      { wch: 30 }, // Description
      { wch: 15 }, // Catégorie
      { wch: 12 }, // Date
      { wch: 10 }, // Heure
      { wch: 25 }  // Budget Après Transaction
    ];
    worksheet['!cols'] = columnWidths;

    // Style de l'en-tête
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "3B82F6" } },
        alignment: { horizontal: "center" }
      };
    }

    // Ajouter le worksheet au workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    // Ajouter une feuille de résumé
    const summaryData = [
      ["Résumé Financier"],
      ["", ""],
      ["Budget Initial", initialBudget.toFixed(2)],
      ["Total Revenus", totalIncome.toFixed(2)],
      ["Total Dépenses", totalExpenses.toFixed(2)],
      ["Solde Net", netBalance.toFixed(2)],
      ["Budget Actuel", (initialBudget + netBalance).toFixed(2)],
      ["", ""],
      ["Nombre de transactions", filteredTransactions.length],
      ["Période", getDateRangeText()]
    ];

    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWorksheet['!cols'] = [{ wch: 20 }, { wch: 15 }];
    
    // Style du résumé
    summaryWorksheet['A1'].s = {
      font: { bold: true, size: 16 },
      fill: { fgColor: { rgb: "E5E7EB" } }
    };

    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Résumé");

    // Exporter le fichier
    XLSX.writeFile(workbook, `transactions-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // En-tête
    doc.setFontSize(20);
    doc.text("Historique des Transactions", 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, 30);
    doc.text(`Période: ${getDateRangeText()}`, 14, 36);
    doc.text(`Total: ${filteredTransactions.length} transaction(s)`, 14, 42);
    
    // Trier les transactions par date pour le PDF
    const sortedTransactionsPDF = [...filteredTransactions].sort((a: Transaction, b: Transaction) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculer le budget après chaque transaction pour le PDF
    let currentBudgetPDF = initialBudget;
    const transactionsWithBudgetPDF = sortedTransactionsPDF.map((t: Transaction) => {
      currentBudgetPDF += t.type === 'income' ? t.amount : -Math.abs(t.amount);
      
      return {
        ...t,
        budgetAfterTransaction: currentBudgetPDF
      };
    });
    
    // Tableau des transactions
    const tableData = transactionsWithBudgetPDF.map((t: TransactionWithBudget) => [
      t.name,
      t.type === "income" ? "Revenu" : "Dépense",
      `€${t.amount.toFixed(2)}`,
      t.description || "-",
      t.category || "-",
      new Date(t.date).toLocaleDateString("fr-FR"),
      new Date(t.date).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }),
      `€${t.budgetAfterTransaction.toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [["Nom", "Type", "Montant", "Description", "Catégorie", "Date", "Heure", "Budget Après Transaction"]],
      body: tableData,
      startY: 50,
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246], // Bleu
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Gris clair
      },
      columnStyles: {
        2: { halign: 'right' }, // Montant aligné à droite
        4: { halign: 'center' }, // Catégorie centrée
        5: { halign: 'center' }, // Date centrée
        6: { halign: 'center' }, // Heure centrée
        7: { halign: 'right' }, // Budget après transaction aligné à droite
      },
    });

    // Résumé en bas
    const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 20 : 50;
    doc.setFontSize(12);
    doc.text("Résumé:", 14, finalY);
    
    doc.setFontSize(10);
    doc.text(`Total Revenus: €${totalIncome.toFixed(2)}`, 14, finalY + 8);
    doc.text(`Total Dépenses: €${totalExpenses.toFixed(2)}`, 14, finalY + 16);
    doc.text(`Solde Net: €${netBalance.toFixed(2)}`, 14, finalY + 24);

    doc.save(`transactions-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getDateRangeText = () => {
    switch (dateFilter) {
      case "today": return "Aujourd&apos;hui";
      case "week": return "Cette semaine";
      case "month": return "Ce mois";
      case "year": return "Cette année";
      case "custom": 
        if (startDate && endDate) {
          return `Du ${new Date(startDate).toLocaleDateString("fr-FR")} au ${new Date(endDate).toLocaleDateString("fr-FR")}`;
        }
        return "Période personnalisée";
      default: return "Toutes les périodes";
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Historique des Transactions</h2>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={filteredTransactions.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToXLSX}>
                <TableIcon className="mr-2 h-4 w-4" />
                Exporter en XLSX (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="mr-2 h-4 w-4" />
                Exporter en PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenus
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{totalIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter((t: Transaction) => t.type === "income").length} transaction(s)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Dépenses
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">€{totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter((t: Transaction) => t.type === "expense").length} transaction(s)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Solde Net
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{netBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {netBalance >= 0 ? 'Bénéfice' : 'Déficit'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des transactions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Liste des Transactions</CardTitle>
              <CardDescription>
                {filteredTransactions.length} transaction(s) — cliquez sur un en-tête pour trier
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              <span>Budget initial :</span>
              <span className="font-semibold text-primary">€{initialBudget.toFixed(2)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-sm font-medium">Filtres</p>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 px-2 text-muted-foreground"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Réinitialiser
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-9 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="income">Revenus</SelectItem>
                  <SelectItem value="expense">Dépenses</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                  <SelectItem value="custom">Période personnalisée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateFilter === "custom" && (
              <div className="grid gap-3 sm:grid-cols-2 max-w-md">
                <Input
                  type="date"
                  aria-label="Date de début"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9"
                />
                <Input
                  type="date"
                  aria-label="Date de fin"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9"
                />
              </div>
            )}
          </div>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-4 opacity-50" />
              <p>Chargement des transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-4 opacity-50" />
              <p>Aucune transaction trouvée</p>
              <p className="text-sm">Commencez par ajouter des transactions</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label="Type"
                    field="type"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Nom"
                    field="name"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Montant"
                    field="amount"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Date"
                    field="date"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Description"
                    field="description"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Catégorie"
                    field="category"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Budget après"
                    field="budget"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTransactions.map((transaction: TransactionWithBudget) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {transaction.type === "income" ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                        <span className="capitalize">
                          {transaction.type === "income" ? "Revenu" : "Dépense"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.name}
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        transaction.type === "income" ? "text-green-600" : "text-red-600"
                      }`}>
                        {transaction.type === "income" ? "+" : "-"}€{transaction.amount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(transaction.date).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.description || "-"}
                    </TableCell>
                    <TableCell>
                      {transaction.category ? (
                        <div className="flex items-center space-x-2">
                          {(() => {
                            const categoryData = categories.find((cat: Category) => cat.name === transaction.category);
                            return categoryData ? (
                              <>
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: categoryData.color }}
                                />
                                <span className="text-sm">{categoryData.name}</span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">{transaction.category}</span>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        transaction.budgetAfterTransaction >= 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        €{transaction.budgetAfterTransaction.toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
