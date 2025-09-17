"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Tag,
  FileText,
  Table as TableIcon
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
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CategorySelector } from "@/components/forms/category-selector";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function HistoryPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialBudget, setInitialBudget] = useState(0);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");

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
    let filtered = transactions;

    if (searchTerm) {
      filtered = filtered.filter((transaction: any) =>
        transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((transaction: any) => transaction.type === typeFilter);
    }

    // Filtrage par catégorie
    if (selectedCategory && selectedCategory !== "all") {
      const selectedCategoryData = categories.find((cat: any) => cat.id === selectedCategory);
      if (selectedCategoryData) {
        filtered = filtered.filter((transaction: any) => transaction.category === selectedCategoryData.name);
      }
    }

    // Filtrage par date
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((transaction: any) => {
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
    .filter((t: any) => t.type === "income")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t: any) => t.type === "expense")
    .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

  const netBalance = totalIncome - totalExpenses;

  // Calculer le budget après chaque transaction pour l'affichage
  const sortedTransactionsForDisplay = [...filteredTransactions].sort((a: any, b: any) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentBudget = initialBudget;
  const transactionsWithBudget = sortedTransactionsForDisplay.map((t: any) => {
    // Ajouter les revenus et soustraire les dépenses
    if (t.type === "income") {
      currentBudget += t.amount;
    } else {
      currentBudget -= t.amount;
    }
    
    return {
      ...t,
      budgetAfterTransaction: currentBudget
    };
  });

  const exportToXLSX = () => {
    // Trier les transactions par date pour l'export
    const sortedTransactions = [...filteredTransactions].sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculer le budget après chaque transaction pour l'export
    let currentBudgetExport = initialBudget;
    const transactionsWithBudgetExport = sortedTransactions.map((t: any) => {
      if (t.type === "income") {
        currentBudgetExport += t.amount;
      } else {
        currentBudgetExport -= t.amount;
      }
      
      return {
        ...t,
        budgetAfterTransaction: currentBudgetExport
      };
    });

    // Préparer les données pour Excel
    const worksheetData = [
      ["Nom", "Type", "Montant (€)", "Description", "Catégorie", "Date", "Heure", "Budget Après Transaction (€)"], // En-têtes
      ...transactionsWithBudgetExport.map((t: any) => [
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
    const sortedTransactionsPDF = [...filteredTransactions].sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculer le budget après chaque transaction pour le PDF
    let currentBudgetPDF = initialBudget;
    const transactionsWithBudgetPDF = sortedTransactionsPDF.map((t: any) => {
      if (t.type === "income") {
        currentBudgetPDF += t.amount;
      } else {
        currentBudgetPDF -= t.amount;
      }
      
      return {
        ...t,
        budgetAfterTransaction: currentBudgetPDF
      };
    });
    
    // Tableau des transactions
    const tableData = transactionsWithBudgetPDF.map((t: any) => [
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
      case "today": return "Aujourd'hui";
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

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>
            Recherchez et filtrez vos transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Budget initial - Lecture seule */}
            <div className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
              <label className="text-sm font-medium">Budget initial :</label>
              <span className="text-lg font-semibold text-primary">
                €{initialBudget.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">
                (Défini lors de l'inscription)
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une transaction..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="income">Revenus</SelectItem>
                  <SelectItem value="expense">Dépenses</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Toutes les dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                  <SelectItem value="custom">Période personnalisée</SelectItem>
                </SelectContent>
              </Select>
              
              {dateFilter === "custom" && (
                <>
                  <Input
                    type="date"
                    placeholder="Date de début"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full md:w-48"
                  />
                  <Input
                    type="date"
                    placeholder="Date de fin"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full md:w-48"
                  />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
              {transactions.filter((t: any) => t.type === "income").length} transaction(s)
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
              {transactions.filter((t: any) => t.type === "expense").length} transaction(s)
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
          <CardTitle>Liste des Transactions</CardTitle>
          <CardDescription>
            Historique complet de vos transactions financières ({filteredTransactions.length} transaction(s))
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Budget Après Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsWithBudget.map((transaction: any) => (
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
                            const categoryData = categories.find((cat: any) => cat.name === transaction.category);
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
          )}
        </CardContent>
      </Card>
    </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
