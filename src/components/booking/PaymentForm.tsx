import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { CreditCard, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@shared/lib/format'

interface PaymentFormProps {
  amount: number
  isSubmitting: boolean
  onSubmit: () => void
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

export function PaymentForm({ amount, isSubmitting, onSubmit }: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [name, setName] = useState('')

  const isValid =
    cardNumber.replace(/\s/g, '').length >= 12 && expiry.length >= 4 && cvv.length >= 3 && name.trim().length > 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid || isSubmitting) return
    onSubmit()
  }

  function handleCardNumberChange(event: ChangeEvent<HTMLInputElement>) {
    setCardNumber(formatCardNumber(event.target.value))
  }

  function handleCvvChange(event: ChangeEvent<HTMLInputElement>) {
    setCvv(event.target.value.replace(/\D/g, '').slice(0, 4))
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-ink-700 bg-ink-850/40 p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-mist-200">
        <CreditCard className="h-4 w-4 text-brand-400" />
        Payment details
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-mist-500">Card number</label>
          <input
            value={cardNumber}
            onChange={handleCardNumberChange}
            placeholder="4242 4242 4242 4242"
            inputMode="numeric"
            className="h-11 w-full rounded-xl border border-ink-600 bg-ink-800/60 px-4 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-brand-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-mist-500">Expiry</label>
            <input
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
              placeholder="MM/YY"
              className="h-11 w-full rounded-xl border border-ink-600 bg-ink-800/60 px-4 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-brand-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-mist-500">CVV</label>
            <input
              value={cvv}
              onChange={handleCvvChange}
              placeholder="123"
              inputMode="numeric"
              className="h-11 w-full rounded-xl border border-ink-600 bg-ink-800/60 px-4 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-brand-400"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist-500">Name on card</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            className="h-11 w-full rounded-xl border border-ink-600 bg-ink-800/60 px-4 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-brand-400"
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="mt-5 w-full" disabled={!isValid || isSubmitting}>
        {isSubmitting ? 'Confirming…' : `Pay ${formatCurrency(amount)}`}
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-mist-500">
        <Lock className="h-3 w-3" />
        This is a mock payment — no real card is charged.
      </p>
    </form>
  )
}
