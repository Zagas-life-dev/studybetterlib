"use client";

import { useState, useEffect } from 'react';
import { PaystackPop } from '@paystack/inline-js';

interface PaymentConfig {
  email: string;
  amount: number;
  reference: string;
  currency?: string;
  metadata?: Record<string, any>;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
}

export const usePaystackPayment = () => {
  const [paystack, setPaystack] = useState<PaystackPop | null>(null);

  useEffect(() => {
    // Initialize Paystack only on client-side
    if (typeof window !== 'undefined') {
      setPaystack(new PaystackPop());
    }
  }, []);

  const initializePayment = (config: PaymentConfig) => {
    if (!paystack) {
      console.error('Paystack is not initialized yet');
      return;
    }

    const paystackConfig = {
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
      email: config.email,
      amount: config.amount * 100, // convert to kobo
      ref: config.reference,
      currency: config.currency || 'NGN',
      metadata: config.metadata || {},
      onSuccess: (transaction: any) => config.onSuccess(transaction.reference),
      onCancel: config.onCancel,
    };

    paystack.newTransaction(paystackConfig);
  };

  return { initializePayment };
};