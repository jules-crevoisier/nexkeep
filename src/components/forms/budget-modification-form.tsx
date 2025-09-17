'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface BudgetModificationFormProps {
  currentBudget: number
  onBudgetUpdated: (newBudget: number) => void
}

export function BudgetModificationForm({ currentBudget, onBudgetUpdated }: BudgetModificationFormProps) {
  const [newBudget, setNewBudget] = useState(currentBudget.toString())
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const budgetValue = parseFloat(newBudget)
    
    // Validation
    if (isNaN(budgetValue)) {
      setError('Veuillez entrer un montant valide')
      return
    }

    if (budgetValue < 0) {
      setError('Le budget ne peut pas être négatif')
      return
    }

    // Si le montant est différent, demander confirmation
    if (budgetValue !== currentBudget) {
      setShowConfirmation(true)
    }
  }

  const confirmBudgetChange = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/user/budget', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          budgetInitial: parseFloat(newBudget)
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la mise à jour')
      }

      const data = await response.json()
      onBudgetUpdated(parseFloat(newBudget))
      setShowConfirmation(false)
      
      // Émettre un événement personnalisé pour notifier les autres composants
      window.dispatchEvent(new CustomEvent('budgetUpdated', { 
        detail: { newBudget: parseFloat(newBudget) } 
      }))
      
      toast.success('Budget initial mis à jour avec succès', {
        description: `Nouveau budget: €${parseFloat(newBudget).toFixed(2)}`
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      console.error('Erreur lors de la mise à jour du budget:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setNewBudget(currentBudget.toString())
    setError('')
  }

  const budgetDifference = parseFloat(newBudget) - currentBudget
  const isChanged = parseFloat(newBudget) !== currentBudget && !isNaN(parseFloat(newBudget))

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="budget-modification">Budget Initial</Label>
          <div className="flex space-x-2">
            <Input
              id="budget-modification"
              type="number"
              step="0.01"
              min="0"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              placeholder="0.00"
              className={error ? 'border-red-500' : ''}
            />
            <Button 
              type="submit" 
              disabled={!isChanged || isLoading}
              variant={isChanged ? 'default' : 'secondary'}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Modifier'
              )}
            </Button>
          </div>
          
          {isChanged && !error && (
            <div className="text-xs text-muted-foreground">
              {budgetDifference > 0 ? (
                <span className="text-green-600">
                  Augmentation de €{budgetDifference.toFixed(2)}
                </span>
              ) : (
                <span className="text-red-600">
                  Diminution de €{Math.abs(budgetDifference).toFixed(2)}
                </span>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground">
            Modifiez avec précaution. Cette action affectera vos statistiques globales.
          </p>
        </div>

        {isChanged && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={resetForm}
            className="w-full"
          >
            Annuler les modifications
          </Button>
        )}
      </form>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la modification du budget</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Vous êtes sur le point de modifier votre budget initial de{' '}
                <strong>€{currentBudget.toFixed(2)}</strong> vers{' '}
                <strong>€{parseFloat(newBudget).toFixed(2)}</strong>.
              </p>
              
              {budgetDifference !== 0 && (
                <p className={budgetDifference > 0 ? 'text-green-600' : 'text-red-600'}>
                  {budgetDifference > 0 ? 'Augmentation' : 'Diminution'} de{' '}
                  <strong>€{Math.abs(budgetDifference).toFixed(2)}</strong>
                </p>
              )}
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Cette modification affectera vos statistiques et calculs de budget global.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBudgetChange}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Modification...
                </>
              ) : (
                'Confirmer la modification'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
